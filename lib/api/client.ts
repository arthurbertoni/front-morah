import { API_URL, USE_MOCK } from '@/lib/config';
import { logger } from '@/lib/logger';
import { gravarItem, lerItem, removerItem } from '@/lib/storage';
import type { ContextoAtivoResponse, ErroCampo, Problem } from './types';

// Singleton (2/2 do frontend): um único cliente HTTP para o app inteiro.
// Concentra a URL base, o cabeçalho Authorization, a renovação do token (refresh com rotação)
// e a conversão dos erros RFC 9457 (application/problem+json) em ApiError.

export type Metodo = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type Query = Record<string, string | number | boolean | null | undefined>;

export type Requisicao = {
  method: Metodo;
  path: string;
  query?: Query;
  body?: unknown;
  headers: Record<string, string>;
};

export type Resposta = { status: number; data: unknown };

/** Quem realmente entrega a requisição: `fetch` (API real) ou o servidor simulado. */
export type Transporte = (req: Requisicao) => Promise<Resposta>;

type Opcoes = {
  query?: Query;
  body?: unknown;
  /** false para rotas públicas (login, refresh, webhook). */
  auth?: boolean;
  headers?: Record<string, string>;
};

const CHAVE_ACCESS = 'morah.accessToken';
const CHAVE_REFRESH = 'morah.refreshToken';

export class ApiError extends Error {
  status: number;
  title?: string;
  detail?: string;
  erros: ErroCampo[];

  constructor(status: number, problem: Problem = {}) {
    super(problem.detail || problem.title || `Erro HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.title = problem.title;
    this.detail = problem.detail;
    this.erros = problem.erros ?? [];
  }
}

/** Mensagem amigável em português para mostrar na tela. */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ApiError) {
    const campos = erro.erros.map((e) => `${e.campo}: ${e.mensagem}`).join('; ');
    if (erro.status === 0) return 'Não foi possível conectar à API. Verifique se o servidor está no ar.';
    return campos ? `${erro.message} (${campos})` : erro.message;
  }
  if (erro instanceof Error) return erro.message;
  return 'Erro inesperado.';
}

function montarUrl(path: string, query?: Query) {
  const params = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${API_URL}${path}${params ? `?${params}` : ''}`;
}

const transporteFetch: Transporte = async (req) => {
  let resposta: Response;
  try {
    resposta = await fetch(montarUrl(req.path, req.query), {
      method: req.method,
      headers: { Accept: 'application/json, application/problem+json', ...req.headers },
      body: req.body === undefined ? undefined : JSON.stringify(req.body),
    });
  } catch (erro) {
    logger.error(`Falha de rede em ${req.method} ${req.path}`, erro);
    throw new ApiError(0, { title: 'Sem conexão', detail: 'Não foi possível conectar à API.' });
  }
  const texto = await resposta.text();
  let data: unknown = undefined;
  if (texto) {
    try {
      data = JSON.parse(texto);
    } catch {
      data = texto;
    }
  }
  return { status: resposta.status, data };
};

export class ApiClient {
  private static instancia: ApiClient | null = null;

  private transporte: Transporte = transporteFetch;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private renovacaoEmAndamento: Promise<boolean> | null = null;
  private aoEncerrarSessao: (() => void) | null = null;

  private constructor() {}

  static getInstance(): ApiClient {
    if (!ApiClient.instancia) {
      ApiClient.instancia = new ApiClient();
    }
    return ApiClient.instancia;
  }

  setTransporte(transporte: Transporte) {
    this.transporte = transporte;
  }

  /** Chamado quando o refresh falha: o AuthContext volta para a tela de login. */
  setAoEncerrarSessao(callback: (() => void) | null) {
    this.aoEncerrarSessao = callback;
  }

  temSessao() {
    return !!this.accessToken;
  }

  async carregarTokens() {
    this.accessToken = await lerItem(CHAVE_ACCESS);
    this.refreshToken = await lerItem(CHAVE_REFRESH);
    return this.temSessao();
  }

  async salvarTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    await gravarItem(CHAVE_ACCESS, accessToken);
    await gravarItem(CHAVE_REFRESH, refreshToken);
  }

  async limparTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    await removerItem(CHAVE_ACCESS);
    await removerItem(CHAVE_REFRESH);
  }

  get<T>(path: string, query?: Query) {
    return this.request<T>('GET', path, { query });
  }

  post<T>(path: string, body?: unknown, opcoes: Omit<Opcoes, 'body'> = {}) {
    return this.request<T>('POST', path, { ...opcoes, body });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, { body });
  }

  delete<T = void>(path: string) {
    return this.request<T>('DELETE', path);
  }

  async request<T>(method: Metodo, path: string, opcoes: Opcoes = {}): Promise<T> {
    const auth = opcoes.auth !== false;
    let resposta = await this.enviar(method, path, opcoes, auth);

    // Access token vencido ou sessão encerrada: tenta renovar uma única vez e repete a chamada.
    if (resposta.status === 401 && auth && this.refreshToken) {
      const renovou = await this.renovarToken();
      if (renovou) {
        resposta = await this.enviar(method, path, opcoes, auth);
      }
    }

    if (resposta.status >= 400) {
      const problem = (typeof resposta.data === 'object' && resposta.data) || { detail: String(resposta.data ?? '') };
      logger.warn(`${method} ${path} → ${resposta.status}`, problem);
      if (resposta.status === 401 && auth) {
        await this.encerrarSessaoLocal();
      }
      throw new ApiError(resposta.status, problem as Problem);
    }
    logger.debug(`${method} ${path} → ${resposta.status}`);
    return resposta.data as T;
  }

  private enviar(method: Metodo, path: string, opcoes: Opcoes, auth: boolean) {
    const headers: Record<string, string> = { ...(opcoes.headers ?? {}) };
    if (opcoes.body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth && this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;
    return this.transporte({ method, path, query: opcoes.query, body: opcoes.body, headers });
  }

  /** POST /auth/refresh — o refresh token usado é invalidado e um novo par é emitido. */
  private renovarToken(): Promise<boolean> {
    // Várias chamadas podem receber 401 ao mesmo tempo: só uma renovação é feita.
    if (!this.renovacaoEmAndamento) {
      this.renovacaoEmAndamento = (async () => {
        try {
          const resposta = await this.transporte({
            method: 'POST',
            path: '/auth/refresh',
            body: { refreshToken: this.refreshToken },
            headers: { 'Content-Type': 'application/json' },
          });
          if (resposta.status !== 200) return false;
          const dados = resposta.data as ContextoAtivoResponse;
          await this.salvarTokens(dados.accessToken, dados.refreshToken);
          logger.info('Access token renovado');
          return true;
        } catch {
          return false;
        } finally {
          this.renovacaoEmAndamento = null;
        }
      })();
    }
    return this.renovacaoEmAndamento;
  }

  private async encerrarSessaoLocal() {
    await this.limparTokens();
    this.aoEncerrarSessao?.();
  }
}

export const api = ApiClient.getInstance();

// Sem backend no ar, as requisições vão para o servidor simulado (mesmo contrato).
if (USE_MOCK) {
  // require para não carregar o mock quando a API real estiver em uso.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { transporteMock } = require('./mock/server') as typeof import('./mock/server');
  api.setTransporte(transporteMock);
  logger.info('Usando API simulada (EXPO_PUBLIC_USE_MOCK != false)');
}
