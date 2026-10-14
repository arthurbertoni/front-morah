// Servidor simulado da Morah API — usado enquanto o backend Spring não está no ar.
// Implementa as 56 operações de docs/morah-openapi.yaml com as regras principais do contrato
// (RBAC por perfil, escopo de unidade/condomínio, módulos desativados, 409/410, paginação),
// para que o app se comporte igual quando for apontado para a API real.

import { Platform } from 'react-native';
import { logger } from '@/lib/logger';
import type { Requisicao, Resposta, Transporte } from '../client';
import type {
  AcessoCreateRequest,
  AutorizacaoVisita,
  AutorizacaoVisitaCreateRequest,
  Aviso,
  AvisoCreateRequest,
  AvisoUpdateRequest,
  Cobranca,
  ContextoAtivo,
  Encomenda,
  ModuloCodigo,
  Perfil,
  PerfilDisponivel,
  PersonalizacaoUpdateRequest,
  Reserva,
  StatusAutorizacaoVisita,
  StatusCobranca,
  TaxaCreateRequest,
  Unidade,
  VinculoUnidade,
} from '../types';
import { criarSeed, dataLocal, type AutorizacaoVisitaDb, type AvisoDb, type CobrancaDb, type MockDb, type ReservaDb, type SessaoDb } from './db';

const CHAVE_DB = 'morah.mockdb.v1';
const ACCESS_TTL_S = 3600;
const MINUTOS_EXPIRACAO_AUTORIZACAO = 30;
const HORA_ABERTURA = 8;
const HORA_FECHAMENTO = 22;
const LIMITE_DASHBOARD = 5;
const NOMES_MODULOS: Record<ModuloCodigo, string> = {
  financeiro: 'Financeiro',
  portaria: 'Portaria',
  avisos: 'Avisos',
  reservas: 'Reservas',
  minha_unidade: 'Minha Unidade',
  encomendas: 'Encomendas',
};

// ------------------------------------------------------------------ persistência (web)

function carregarDb(): MockDb {
  if (Platform.OS === 'web') {
    try {
      const salvo = globalThis.localStorage?.getItem(CHAVE_DB);
      if (salvo) return JSON.parse(salvo) as MockDb;
    } catch {
      // ignora e recria
    }
  }
  return criarSeed();
}

let db = carregarDb();

function salvarDb() {
  if (Platform.OS !== 'web') return;
  try {
    globalThis.localStorage?.setItem(CHAVE_DB, JSON.stringify(db));
  } catch {
    // sem armazenamento: o estado vale enquanto a página estiver aberta
  }
}

/** Volta o banco simulado ao seed inicial (botão na tela de login). */
export function reiniciarMock() {
  db = criarSeed();
  salvarDb();
}

// ------------------------------------------------------------------ utilitários

class Problema extends Error {
  constructor(
    public status: number,
    public detail: string,
    public erros?: { campo: string; mensagem: string }[],
  ) {
    super(detail);
  }
}

const TITULOS: Record<number, string> = {
  400: 'Requisição inválida',
  401: 'Não autenticado',
  403: 'Acesso negado',
  404: 'Não encontrado',
  409: 'Conflito',
  410: 'Recurso fora de vigência',
};

const proximoId = () => ++db.seq;
const agoraIso = () => new Date().toISOString();
const hoje = () => dataLocal();
const arred = (n: number) => Math.round(n * 100) / 100;
const gerarCodigo6 = () => String(Math.floor(100000 + Math.random() * 900000));
const uuid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function exigir(condicao: unknown, campo: string, mensagem = 'é obrigatório') {
  if (!condicao) throw new Problema(400, 'Dados inválidos', [{ campo, mensagem }]);
}

function paginar<T>(itens: T[], query: Record<string, string>) {
  const page = query.page === undefined ? 0 : Number(query.page);
  const size = query.size === undefined ? 20 : Number(query.size);
  if (!Number.isInteger(page) || page < 0) throw new Problema(400, 'Parâmetro inválido', [{ campo: 'page', mensagem: 'deve ser maior ou igual a 0' }]);
  if (!Number.isInteger(size) || size < 1 || size > 100) throw new Problema(400, 'Parâmetro inválido', [{ campo: 'size', mensagem: 'deve estar entre 1 e 100' }]);
  return {
    content: itens.slice(page * size, page * size + size),
    page: { page, size, totalElements: itens.length, totalPages: Math.ceil(itens.length / size) },
  };
}

// ------------------------------------------------------------------ sessão / token

type UsuarioLogado = { pessoaId: number; sessaoId: string; perfil: Perfil; condominioId: number; unidadeId?: number };

function criarSessao(pessoaId: number, perfil: Perfil, condominioId: number, unidadeId?: number) {
  const sessao: SessaoDb = {
    id: uuid(),
    pessoaId,
    perfil,
    condominioId,
    unidadeId,
    refreshToken: uuid() + uuid(),
    refreshExpiraEm: Date.now() + 7 * 24 * 3600 * 1000,
  };
  db.sessoes.push(sessao);
  const exp = Date.now() + ACCESS_TTL_S * 1000;
  // Formato "mock.<sid>.<exp>": não é um JWT de verdade, mas carrega o sid e a expiração.
  const accessToken = `mock.${sessao.id}.${exp}`;
  const condominio = db.condominios.find((c) => c.id === condominioId);
  const contexto: ContextoAtivo = { perfil, condominioId, condominioNome: condominio?.nome, unidadeId };
  return { accessToken, refreshToken: sessao.refreshToken, tokenType: 'Bearer', expiresIn: ACCESS_TTL_S, contexto };
}

function perfisDisponiveis(pessoaId: number): PerfilDisponivel[] {
  return db.perfis
    .filter((p) => p.pessoaId === pessoaId)
    .sort((a, b) => a.id - b.id)
    .map((p) => ({
      perfil: p.perfil,
      condominioId: p.condominioId,
      condominioNome: db.condominios.find((c) => c.id === p.condominioId)?.nome,
      unidadeId: p.unidadeId,
    }));
}

function autenticar(headers: Record<string, string>): UsuarioLogado {
  const token = (headers.Authorization ?? '').replace(/^Bearer /, '');
  const [prefixo, sid, exp] = token.split('.');
  if (prefixo !== 'mock' || !sid || !exp) throw new Problema(401, 'Token ausente ou inválido');
  if (Number(exp) < Date.now()) throw new Problema(401, 'Token expirado');
  const sessao = db.sessoes.find((s) => s.id === sid);
  if (!sessao) throw new Problema(401, 'Sessão encerrada');
  return { pessoaId: sessao.pessoaId, sessaoId: sessao.id, perfil: sessao.perfil, condominioId: sessao.condominioId, unidadeId: sessao.unidadeId };
}

/** `proprietario` é cumulativo a `morador`. */
function temPerfil(usuario: UsuarioLogado, aceitos: Perfil[]) {
  return aceitos.includes(usuario.perfil) || (usuario.perfil === 'proprietario' && aceitos.includes('morador'));
}

const ehMorador = (u: UsuarioLogado) => u.perfil === 'morador' || u.perfil === 'proprietario';

function moduloDaRota(path: string): ModuloCodigo | null {
  if (path.startsWith('/financeiro/webhooks')) return null;
  if (path.startsWith('/financeiro')) return 'financeiro';
  if (path.startsWith('/portaria')) return 'portaria';
  if (path.startsWith('/avisos')) return 'avisos';
  if (path.startsWith('/areas-comuns') || path.startsWith('/reservas')) return 'reservas';
  if (path.startsWith('/unidades')) return 'minha_unidade';
  if (path.startsWith('/encomendas')) return 'encomendas';
  return null;
}

function moduloAtivo(condominioId: number, modulo: ModuloCodigo) {
  return db.modulos.find((m) => m.condominioId === condominioId && m.modulo === modulo)?.ativo ?? true;
}

// ------------------------------------------------------------------ conversões para o formato do contrato

function pessoaResumo(pessoaId: number) {
  const p = db.pessoas.find((x) => x.id === pessoaId);
  return { id: pessoaId, nome: p?.nome ?? 'Desconhecido', telefone: p?.telefone };
}

function statusCobranca(c: CobrancaDb): StatusCobranca {
  return c.status === 'pendente' && c.vencimento < hoje() ? 'atrasado' : c.status;
}

function toCobranca(c: CobrancaDb): Cobranca {
  return {
    id: c.id,
    unidadeId: c.unidadeId,
    taxaDescricao: c.taxaDescricao,
    competencia: c.competencia,
    vencimento: c.vencimento,
    valorOriginal: c.valorOriginal,
    multa: c.multa,
    juros: c.juros,
    valorTotal: arred(c.valorOriginal + c.multa + c.juros),
    status: statusCobranca(c),
  };
}

function statusAutorizacao(a: AutorizacaoVisitaDb): StatusAutorizacaoVisita {
  if (a.status !== 'pendente') return a.status;
  const limite = new Date(a.solicitadoEm).getTime() + MINUTOS_EXPIRACAO_AUTORIZACAO * 60000;
  return Date.now() > limite ? 'expirada' : 'pendente';
}

function toAutorizacao(a: AutorizacaoVisitaDb): AutorizacaoVisita {
  const visitante = db.visitantes.find((v) => v.id === a.visitanteId)!;
  return {
    id: a.id,
    visitante,
    unidadeId: a.unidadeId,
    motivo: a.motivo,
    solicitadoEm: a.solicitadoEm,
    respondidoEm: a.respondidoEm,
    status: statusAutorizacao(a),
  };
}

function toUnidade(id: number): Unidade {
  const u = db.unidades.find((x) => x.id === id)!;
  return {
    id: u.id,
    blocoId: u.blocoId,
    blocoNome: db.blocos.find((b) => b.id === u.blocoId)?.nome,
    identificacao: u.identificacao,
    tipo: u.tipo,
    areaM2: u.areaM2,
    fracaoIdeal: u.fracaoIdeal,
    status: u.status,
  };
}

function toAviso(a: AvisoDb, pessoaId: number): Aviso {
  const { condominioId: _c, autorId, ...resto } = a;
  return {
    ...resto,
    autor: pessoaResumo(autorId),
    lidoPeloUsuario: db.leituras.some((l) => l.pessoaId === pessoaId && l.avisoId === a.id),
  };
}

function toReserva(r: ReservaDb): Reserva {
  return {
    id: r.id,
    areaComumId: r.areaComumId,
    areaComumNome: db.areas.find((a) => a.id === r.areaComumId)?.nome ?? '',
    unidadeId: r.unidadeId,
    solicitante: pessoaResumo(r.solicitanteId),
    inicio: r.inicio,
    fim: r.fim,
    status: r.status,
    valor: r.valor,
  };
}

function toEncomenda(e: (typeof db.encomendas)[number]): Encomenda {
  const { condominioId: _c, ...resto } = e;
  return resto;
}

function toVinculo(v: (typeof db.vinculos)[number]): VinculoUnidade {
  return { id: v.id, unidadeId: v.unidadeId, pessoa: pessoaResumo(v.pessoaId), tipoVinculo: v.tipoVinculo, principal: v.principal, inicio: v.inicio, fim: v.fim };
}

// ------------------------------------------------------------------ escopo

const unidadesDoCondominio = (condominioId: number) => db.unidades.filter((u) => u.condominioId === condominioId);

function unidadeDoCondominio(unidadeId: number, condominioId: number) {
  const u = db.unidades.find((x) => x.id === unidadeId && x.condominioId === condominioId);
  if (!u) throw new Problema(404, 'Unidade não encontrada');
  return u;
}

/** Morador/proprietário só acessam recursos da própria unidade (403). */
function exigirMesmaUnidade(usuario: UsuarioLogado, unidadeId: number) {
  if (ehMorador(usuario) && usuario.unidadeId !== unidadeId) {
    throw new Problema(403, 'Recurso de outra unidade');
  }
}

function avisoVisivel(a: AvisoDb, usuario: UsuarioLogado) {
  if (!ehMorador(usuario)) return true;
  if (a.publicoAlvo.tipo === 'condominio') return true;
  const unidade = db.unidades.find((u) => u.id === usuario.unidadeId);
  if (a.publicoAlvo.tipo === 'bloco') return unidade?.blocoId === a.publicoAlvo.blocoId;
  return a.publicoAlvo.unidadeId === usuario.unidadeId;
}

const avisoVigente = (a: AvisoDb) => !a.expiraEm || new Date(a.expiraEm).getTime() > Date.now();

// ------------------------------------------------------------------ notificações

function pessoasDaUnidade(unidadeId: number) {
  return db.perfis.filter((p) => p.unidadeId === unidadeId && (p.perfil === 'morador' || p.perfil === 'proprietario')).map((p) => p.pessoaId);
}

function notificar(pessoaIds: number[], tipo: (typeof db.notificacoes)[number]['tipo'], titulo: string, mensagem: string, referenciaId?: number) {
  for (const pessoaId of new Set(pessoaIds)) {
    db.notificacoes.push({ id: proximoId(), pessoaId, tipo, titulo, mensagem, referenciaId, enviadaEm: agoraIso() });
  }
}

// ------------------------------------------------------------------ rotas

type Contexto = {
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;
  headers: Record<string, string>;
  usuario: UsuarioLogado;
};

type Rota = {
  method: Requisicao['method'];
  path: string;
  /** null = rota pública. */
  perfis: Perfil[] | null;
  handler: (ctx: Contexto) => { status: number; data?: unknown };
};

const TODOS: Perfil[] = ['morador', 'proprietario', 'sindico', 'portaria'];
const ok = (data: unknown, status = 200) => ({ status, data });

const rotas: Rota[] = [
  // ---------------------------------------------------------------- Login
  {
    method: 'POST', path: '/auth/login', perfis: null,
    handler: ({ body }) => {
      exigir(body?.email, 'email');
      exigir(body?.senha, 'senha');
      const pessoa = db.pessoas.find((p) => p.email.toLowerCase() === String(body.email).toLowerCase());
      if (!pessoa || pessoa.senha !== body.senha) throw new Problema(401, 'E-mail ou senha inválidos');
      const perfis = perfisDisponiveis(pessoa.id);
      if (!perfis.length) throw new Problema(401, 'Pessoa sem vínculo ativo');
      const primeiro = perfis[0];
      return ok({ ...criarSessao(pessoa.id, primeiro.perfil, primeiro.condominioId, primeiro.unidadeId), perfisDisponiveis: perfis });
    },
  },
  {
    method: 'GET', path: '/auth/me', perfis: TODOS,
    handler: ({ usuario }) => {
      const p = db.pessoas.find((x) => x.id === usuario.pessoaId)!;
      return ok({
        pessoa: { id: p.id, nome: p.nome, cpf: p.cpf, email: p.email },
        perfisDisponiveis: perfisDisponiveis(p.id),
        contextoAtivo: {
          perfil: usuario.perfil,
          condominioId: usuario.condominioId,
          condominioNome: db.condominios.find((c) => c.id === usuario.condominioId)?.nome,
          unidadeId: usuario.unidadeId,
        },
      });
    },
  },
  {
    method: 'POST', path: '/auth/contexto', perfis: TODOS,
    handler: ({ body, usuario }) => {
      exigir(body?.condominioId, 'condominioId');
      exigir(body?.perfil, 'perfil');
      const vinculo = db.perfis.find((p) => p.pessoaId === usuario.pessoaId && p.condominioId === Number(body.condominioId) && p.perfil === body.perfil);
      if (!vinculo) throw new Problema(403, 'A pessoa não possui o vínculo solicitado');
      db.sessoes = db.sessoes.filter((s) => s.id !== usuario.sessaoId);
      return ok(criarSessao(usuario.pessoaId, vinculo.perfil, vinculo.condominioId, vinculo.unidadeId));
    },
  },
  {
    method: 'POST', path: '/auth/refresh', perfis: null,
    handler: ({ body }) => {
      exigir(body?.refreshToken, 'refreshToken');
      const sessao = db.sessoes.find((s) => s.refreshToken === body.refreshToken);
      if (!sessao || sessao.refreshExpiraEm < Date.now()) throw new Problema(401, 'Refresh token inválido ou vencido');
      db.sessoes = db.sessoes.filter((s) => s.id !== sessao.id);
      return ok(criarSessao(sessao.pessoaId, sessao.perfil, sessao.condominioId, sessao.unidadeId));
    },
  },
  {
    method: 'POST', path: '/auth/logout', perfis: TODOS,
    handler: ({ usuario }) => {
      db.sessoes = db.sessoes.filter((s) => s.id !== usuario.sessaoId);
      return ok(undefined, 204);
    },
  },

  // ---------------------------------------------------------------- Tela Inicial
  {
    method: 'GET', path: '/home/dashboard', perfis: TODOS,
    handler: ({ usuario }) => {
      const ativo = (m: ModuloCodigo) => moduloAtivo(usuario.condominioId, m);
      const agora = Date.now();
      if (ehMorador(usuario)) {
        const u = usuario.unidadeId!;
        return ok({
          perfil: usuario.perfil,
          unidade: toUnidade(u),
          proximosBoletos: ativo('financeiro')
            ? db.cobrancas.filter((c) => c.unidadeId === u && c.status === 'pendente').sort((a, b) => a.vencimento.localeCompare(b.vencimento)).slice(0, LIMITE_DASHBOARD).map(toCobranca)
            : [],
          avisosRecentes: ativo('avisos')
            ? db.avisos.filter((a) => a.condominioId === usuario.condominioId && avisoVigente(a) && avisoVisivel(a, usuario)).sort((a, b) => b.publicadoEm.localeCompare(a.publicadoEm)).slice(0, LIMITE_DASHBOARD).map((a) => toAviso(a, usuario.pessoaId))
            : [],
          encomendasPendentes: ativo('encomendas')
            ? db.encomendas.filter((e) => e.unidadeId === u && e.status === 'aguardando_retirada').slice(0, LIMITE_DASHBOARD).map(toEncomenda)
            : [],
          autorizacoesPendentes: ativo('portaria')
            ? db.autorizacoes.filter((a) => a.unidadeId === u && statusAutorizacao(a) === 'pendente').slice(0, LIMITE_DASHBOARD).map(toAutorizacao)
            : [],
          proximasReservas: ativo('reservas')
            ? db.reservas.filter((r) => r.unidadeId === u && r.status === 'confirmada' && new Date(r.fim).getTime() > agora).sort((a, b) => a.inicio.localeCompare(b.inicio)).slice(0, LIMITE_DASHBOARD).map(toReserva)
            : [],
        });
      }
      if (usuario.perfil === 'sindico') {
        return ok({
          perfil: 'sindico',
          inadimplencia: ativo('financeiro') ? resumoInadimplencia(usuario.condominioId) : undefined,
          avisosPublicadosRecentes: ativo('avisos')
            ? db.avisos.filter((a) => a.condominioId === usuario.condominioId && avisoVigente(a)).sort((a, b) => b.publicadoEm.localeCompare(a.publicadoEm)).slice(0, LIMITE_DASHBOARD).map((a) => toAviso(a, usuario.pessoaId))
            : [],
          solicitacoesVinculoPendentes: ativo('minha_unidade')
            ? db.solicitacoes.filter((s) => s.status === 'pendente' && unidadesDoCondominio(usuario.condominioId).some((u) => u.id === s.unidadeId)).length
            : 0,
          ocorrenciasAbertas: db.ocorrencias.filter((o) => o.condominioId === usuario.condominioId && o.status !== 'encerrada').length,
        });
      }
      const dia = hoje();
      return ok({
        perfil: 'portaria',
        autorizacoesPendentes: ativo('portaria')
          ? db.autorizacoes.filter((a) => a.condominioId === usuario.condominioId && statusAutorizacao(a) === 'pendente').slice(0, LIMITE_DASHBOARD).map(toAutorizacao)
          : [],
        reservasDoDia: ativo('reservas')
          ? db.reservas.filter((r) => r.status === 'confirmada' && dataLocal(new Date(r.inicio)) === dia).slice(0, LIMITE_DASHBOARD).map(toReserva)
          : [],
        encomendasRecebidasHoje: ativo('encomendas')
          ? db.encomendas.filter((e) => e.condominioId === usuario.condominioId && dataLocal(new Date(e.recebidaEm)) === dia).length
          : 0,
      });
    },
  },

  // ---------------------------------------------------------------- Financeiro
  {
    method: 'GET', path: '/financeiro/cobrancas', perfis: ['morador', 'proprietario', 'sindico'],
    handler: ({ query, usuario }) => {
      if (query.competencia && !/^\d{4}-\d{2}$/.test(query.competencia)) {
        throw new Problema(400, 'Parâmetro inválido', [{ campo: 'competencia', mensagem: 'formato AAAA-MM' }]);
      }
      const unidades = unidadesDoCondominio(usuario.condominioId).map((u) => u.id);
      let lista = db.cobrancas.filter((c) => unidades.includes(c.unidadeId));
      if (ehMorador(usuario)) lista = lista.filter((c) => c.unidadeId === usuario.unidadeId);
      else if (query.unidadeId) lista = lista.filter((c) => c.unidadeId === Number(query.unidadeId));
      let saida = lista.map(toCobranca).sort((a, b) => b.vencimento.localeCompare(a.vencimento) || a.unidadeId - b.unidadeId);
      if (query.status) saida = saida.filter((c) => c.status === query.status);
      if (query.competencia) saida = saida.filter((c) => c.competencia === query.competencia);
      return ok(paginar(saida, query));
    },
  },
  {
    method: 'GET', path: '/financeiro/cobrancas/{cobrancaId}', perfis: ['morador', 'proprietario', 'sindico'],
    handler: ({ params, usuario }) => ok(toCobranca(cobrancaComEscopo(Number(params.cobrancaId), usuario))),
  },
  {
    method: 'GET', path: '/financeiro/cobrancas/{cobrancaId}/pix', perfis: ['morador', 'proprietario'],
    handler: ({ params, usuario }) => {
      const c = cobrancaComEscopo(Number(params.cobrancaId), usuario);
      if (c.status === 'pago' || c.status === 'cancelado') throw new Problema(409, 'Cobrança já está paga ou cancelada');
      const valor = toCobranca(c).valorTotal.toFixed(2);
      return ok({
        codigoPix: `00020126580014BR.GOV.BCB.PIX0136morah-demo-gateway520400005303986540${valor.length}${valor}5802BR5913MORAH DEMO6009SAO PAULO62070503${c.id}6304ABCD`,
        expiraEm: new Date(Date.now() + 30 * 60000).toISOString(),
      });
    },
  },
  {
    method: 'POST', path: '/financeiro/cobrancas/{cobrancaId}/baixa-manual', perfis: ['sindico'],
    handler: ({ params, body, usuario }) => {
      exigir(body?.meio, 'meio');
      exigir(body?.valor !== undefined && body?.valor !== null && body?.valor !== '', 'valor');
      exigir(body?.pagoEm, 'pagoEm');
      const c = cobrancaComEscopo(Number(params.cobrancaId), usuario);
      if (c.status === 'pago' || c.status === 'cancelado') throw new Problema(409, 'Cobrança já está paga ou cancelada');
      c.status = 'pago';
      notificar(pessoasDaUnidade(c.unidadeId), 'financeiro', 'Pagamento confirmado', `${c.taxaDescricao} ${c.competencia} foi quitada.`, c.id);
      return ok(toCobranca(c));
    },
  },
  {
    method: 'POST', path: '/financeiro/webhooks/pagamentos', perfis: null,
    handler: ({ body, headers }) => {
      if (!headers['X-Webhook-Signature']) throw new Problema(401, 'Assinatura ausente ou inválida');
      exigir(body?.transacaoId, 'transacaoId');
      exigir(body?.cobrancaId, 'cobrancaId');
      exigir(body?.status, 'status');
      const c = db.cobrancas.find((x) => x.id === Number(body.cobrancaId));
      if (c && body.status === 'confirmado' && c.status === 'pendente') {
        c.status = 'pago';
        notificar(pessoasDaUnidade(c.unidadeId), 'financeiro', 'Pagamento confirmado', `PIX de ${c.taxaDescricao} ${c.competencia} confirmado.`, c.id);
      }
      return ok(undefined, 202);
    },
  },
  {
    method: 'GET', path: '/financeiro/documentos', perfis: ['morador', 'proprietario', 'sindico'],
    handler: ({ query, usuario }) =>
      ok(paginar(db.documentos.filter((d) => d.condominioId === usuario.condominioId).sort((a, b) => b.publicadoEm.localeCompare(a.publicadoEm)).map(({ condominioId: _c, ...d }) => d), query)),
  },
  {
    method: 'POST', path: '/financeiro/documentos', perfis: ['sindico'],
    handler: ({ body, usuario }) => {
      exigir(body?.tipo, 'tipo');
      exigir(body?.titulo, 'titulo');
      exigir(body?.arquivoUrl, 'arquivoUrl');
      exigir(/^https?:\/\//.test(body.arquivoUrl), 'arquivoUrl', 'deve ser uma URL');
      const doc = { id: proximoId(), condominioId: usuario.condominioId, tipo: body.tipo, titulo: body.titulo, arquivoUrl: body.arquivoUrl, competencia: body.competencia, publicadoEm: agoraIso() };
      db.documentos.push(doc);
      const { condominioId: _c, ...saida } = doc;
      return ok(saida, 201);
    },
  },
  {
    method: 'POST', path: '/financeiro/taxas', perfis: ['sindico'],
    handler: ({ body, usuario }) => {
      const b = body as TaxaCreateRequest;
      exigir(b?.descricao, 'descricao');
      exigir(/^\d{4}-\d{2}$/.test(b?.competencia ?? ''), 'competencia', 'formato AAAA-MM');
      exigir(Number(b?.valor) > 0, 'valor', 'deve ser maior que zero');
      exigir(b?.tipoRateio === 'igualitario' || b?.tipoRateio === 'fracao_ideal', 'tipoRateio', 'igualitario ou fracao_ideal');
      exigir(Number.isInteger(b?.vencimentoDia) && b.vencimentoDia >= 1 && b.vencimentoDia <= 28, 'vencimentoDia', 'entre 1 e 28');
      const taxa = { id: proximoId(), condominioId: usuario.condominioId, descricao: b.descricao, competencia: b.competencia, valor: Number(b.valor), tipoRateio: b.tipoRateio, vencimentoDia: b.vencimentoDia };
      db.taxas.push(taxa);
      const { condominioId: _c, ...saida } = taxa;
      return ok(saida, 201);
    },
  },
  {
    method: 'POST', path: '/financeiro/taxas/{taxaId}/gerar-cobrancas', perfis: ['sindico'],
    handler: ({ params, usuario }) => {
      const taxa = db.taxas.find((t) => t.id === Number(params.taxaId) && t.condominioId === usuario.condominioId);
      if (!taxa) throw new Problema(404, 'Taxa não encontrada');
      const unidades = unidadesDoCondominio(usuario.condominioId);
      const falhas: { unidadeId: number; motivo: string }[] = [];
      let totalGeradas = 0;
      for (const u of unidades) {
        if (db.cobrancas.some((c) => c.taxaId === taxa.id && c.unidadeId === u.id)) {
          falhas.push({ unidadeId: u.id, motivo: 'Unidade já cobrada por esta taxa' });
          continue;
        }
        if (taxa.tipoRateio === 'fracao_ideal' && !u.fracaoIdeal) {
          falhas.push({ unidadeId: u.id, motivo: 'Unidade sem fração ideal' });
          continue;
        }
        const valor = taxa.tipoRateio === 'igualitario' ? taxa.valor / unidades.length : taxa.valor * (u.fracaoIdeal ?? 0);
        const c: CobrancaDb = {
          id: proximoId(), taxaId: taxa.id, unidadeId: u.id, taxaDescricao: taxa.descricao, competencia: taxa.competencia,
          vencimento: `${taxa.competencia}-${String(taxa.vencimentoDia).padStart(2, '0')}`, valorOriginal: arred(valor), multa: 0, juros: 0, status: 'pendente',
        };
        db.cobrancas.push(c);
        totalGeradas++;
        notificar(pessoasDaUnidade(u.id), 'financeiro', 'Nova cobrança', `${taxa.descricao} ${taxa.competencia} disponível para pagamento.`, c.id);
      }
      return ok({ taxaId: taxa.id, totalGeradas, falhas }, 202);
    },
  },
  {
    method: 'GET', path: '/financeiro/inadimplencia', perfis: ['sindico'],
    handler: ({ usuario }) => ok(resumoInadimplencia(usuario.condominioId)),
  },

  // ---------------------------------------------------------------- Portaria
  {
    method: 'POST', path: '/portaria/visitantes', perfis: ['portaria'],
    handler: ({ body, usuario }) => {
      const b = body as AutorizacaoVisitaCreateRequest;
      exigir(b?.unidadeId, 'unidadeId');
      exigir(b?.visitante?.nome, 'visitante.nome');
      exigir(b?.motivo, 'motivo');
      const unidade = unidadeDoCondominio(Number(b.unidadeId), usuario.condominioId);
      const visitante = { id: proximoId(), nome: b.visitante.nome, documento: b.visitante.documento, telefone: b.visitante.telefone };
      db.visitantes.push(visitante);
      const aut: AutorizacaoVisitaDb = { id: proximoId(), condominioId: usuario.condominioId, visitanteId: visitante.id, unidadeId: unidade.id, motivo: b.motivo, fotoUrl: b.fotoUrl, solicitadoEm: agoraIso(), status: 'pendente' };
      db.autorizacoes.push(aut);
      notificar(pessoasDaUnidade(unidade.id), 'portaria', 'Visitante na portaria', `${visitante.nome} aguarda autorização (${b.motivo}).`, aut.id);
      return ok(toAutorizacao(aut), 201);
    },
  },
  {
    method: 'GET', path: '/portaria/autorizacoes', perfis: ['portaria', 'morador', 'proprietario'],
    handler: ({ query, usuario }) => {
      let lista = db.autorizacoes.filter((a) => a.condominioId === usuario.condominioId);
      if (ehMorador(usuario)) lista = lista.filter((a) => a.unidadeId === usuario.unidadeId);
      let saida = lista.map(toAutorizacao).sort((a, b) => b.solicitadoEm.localeCompare(a.solicitadoEm));
      if (query.status) saida = saida.filter((a) => a.status === query.status);
      return ok(paginar(saida, query));
    },
  },
  {
    method: 'GET', path: '/portaria/autorizacoes/{autorizacaoId}', perfis: ['portaria', 'morador', 'proprietario'],
    handler: ({ params, usuario }) => ok(toAutorizacao(autorizacaoComEscopo(Number(params.autorizacaoId), usuario))),
  },
  {
    method: 'PATCH', path: '/portaria/autorizacoes/{autorizacaoId}/decisao', perfis: ['morador', 'proprietario'],
    handler: ({ params, body, usuario }) => {
      exigir(body?.decisao === 'autorizado' || body?.decisao === 'recusado', 'decisao', 'autorizado ou recusado');
      const a = autorizacaoComEscopo(Number(params.autorizacaoId), usuario);
      const status = statusAutorizacao(a);
      if (status !== 'pendente') throw new Problema(409, status === 'expirada' ? 'Autorização já expirada' : 'Autorização já decidida');
      a.status = body.decisao === 'autorizado' ? 'autorizada' : 'recusada';
      a.respondidoEm = agoraIso();
      return ok(toAutorizacao(a));
    },
  },
  {
    method: 'POST', path: '/portaria/autorizacoes/{autorizacaoId}/reenviar', perfis: ['portaria'],
    handler: ({ params, usuario }) => {
      const a = autorizacaoComEscopo(Number(params.autorizacaoId), usuario);
      if (statusAutorizacao(a) !== 'pendente') throw new Problema(409, 'A autorização não está mais pendente');
      const v = db.visitantes.find((x) => x.id === a.visitanteId);
      notificar(pessoasDaUnidade(a.unidadeId), 'portaria', 'Lembrete: visitante aguardando', `${v?.nome} ainda aguarda sua autorização.`, a.id);
      return ok(undefined, 202);
    },
  },
  {
    method: 'GET', path: '/portaria/acessos', perfis: ['portaria', 'sindico'],
    handler: ({ query, usuario }) => {
      let lista = db.acessos.filter((a) => a.condominioId === usuario.condominioId);
      if (query.data) lista = lista.filter((a) => dataLocal(new Date(a.entrada)) === query.data);
      const saida = lista
        .sort((a, b) => b.entrada.localeCompare(a.entrada))
        .map((a) => ({ id: a.id, autorizacaoId: a.autorizacaoId, visitante: db.visitantes.find((v) => v.id === a.visitanteId)!, entrada: a.entrada, saida: a.saida, tipo: a.tipo, status: a.saida ? 'saiu' : 'no_condominio' }));
      return ok(paginar(saida, query));
    },
  },
  {
    method: 'POST', path: '/portaria/acessos', perfis: ['portaria'],
    handler: ({ body, usuario }) => {
      const b = body as AcessoCreateRequest;
      exigir(b?.visitanteId, 'visitanteId');
      exigir(b?.tipo === 'entrada' || b?.tipo === 'saida', 'tipo', 'entrada ou saida');
      const visitante = db.visitantes.find((v) => v.id === Number(b.visitanteId));
      if (!visitante) throw new Problema(404, 'Visitante não encontrado');
      if (b.tipo === 'entrada') {
        if (b.autorizacaoId) {
          const aut = autorizacaoComEscopo(Number(b.autorizacaoId), usuario);
          if (statusAutorizacao(aut) !== 'autorizada') throw new Problema(409, 'A autorização informada não está autorizada');
        }
        const acesso = { id: proximoId(), condominioId: usuario.condominioId, autorizacaoId: b.autorizacaoId, visitanteId: visitante.id, entrada: agoraIso(), tipo: 'entrada' as const };
        db.acessos.push(acesso);
        return ok({ id: acesso.id, autorizacaoId: acesso.autorizacaoId, visitante, entrada: acesso.entrada, tipo: 'entrada', status: 'no_condominio' }, 201);
      }
      const aberto = db.acessos.filter((a) => a.visitanteId === visitante.id && !a.saida).sort((a, b2) => b2.entrada.localeCompare(a.entrada))[0];
      if (!aberto) throw new Problema(409, 'Saída sem entrada aberta');
      aberto.saida = agoraIso();
      aberto.tipo = 'saida';
      return ok({ id: aberto.id, autorizacaoId: aberto.autorizacaoId, visitante, entrada: aberto.entrada, saida: aberto.saida, tipo: 'saida', status: 'saiu' }, 201);
    },
  },

  // ---------------------------------------------------------------- Avisos
  {
    method: 'GET', path: '/avisos', perfis: TODOS,
    handler: ({ query, usuario }) => {
      let lista = db.avisos.filter((a) => a.condominioId === usuario.condominioId && avisoVigente(a) && avisoVisivel(a, usuario));
      if (query.categoria) lista = lista.filter((a) => a.categoria === query.categoria);
      if (query.prioridade) lista = lista.filter((a) => a.prioridade === query.prioridade);
      lista.sort((a, b) => (a.prioridade === b.prioridade ? b.publicadoEm.localeCompare(a.publicadoEm) : a.prioridade === 'urgente' ? -1 : 1));
      return ok(paginar(lista.map((a) => toAviso(a, usuario.pessoaId)), query));
    },
  },
  {
    method: 'POST', path: '/avisos', perfis: ['sindico'],
    handler: ({ body, usuario }) => {
      const b = body as AvisoCreateRequest;
      exigir(b?.titulo, 'titulo');
      exigir(b?.conteudo, 'conteudo');
      exigir(b?.publicoAlvo?.tipo, 'publicoAlvo.tipo');
      if (b.publicoAlvo.tipo === 'bloco') exigir(db.blocos.some((x) => x.id === Number(b.publicoAlvo.blocoId) && x.condominioId === usuario.condominioId), 'publicoAlvo.blocoId', 'bloco inexistente');
      if (b.publicoAlvo.tipo === 'unidade') exigir(db.unidades.some((x) => x.id === Number(b.publicoAlvo.unidadeId) && x.condominioId === usuario.condominioId), 'publicoAlvo.unidadeId', 'unidade inexistente');
      const aviso: AvisoDb = {
        id: proximoId(), condominioId: usuario.condominioId, autorId: usuario.pessoaId, titulo: b.titulo, conteudo: b.conteudo, categoria: b.categoria,
        prioridade: b.prioridade ?? 'normal', publicoAlvo: b.publicoAlvo, publicadoEm: agoraIso(), expiraEm: b.expiraEm,
      };
      db.avisos.push(aviso);
      const destinatarios = db.perfis
        .filter((p) => p.condominioId === usuario.condominioId && p.unidadeId && avisoVisivel(aviso, { ...usuario, perfil: p.perfil, unidadeId: p.unidadeId }))
        .map((p) => p.pessoaId);
      notificar(destinatarios, 'aviso', aviso.prioridade === 'urgente' ? 'Aviso urgente' : 'Novo aviso', aviso.titulo, aviso.id);
      return ok(toAviso(aviso, usuario.pessoaId), 201);
    },
  },
  {
    method: 'GET', path: '/avisos/{avisoId}', perfis: TODOS,
    handler: ({ params, usuario }) => {
      const a = avisoDoCondominio(Number(params.avisoId), usuario);
      if (!avisoVisivel(a, usuario)) throw new Problema(403, 'Aviso não destinado ao seu contexto');
      if (!avisoVigente(a)) throw new Problema(410, 'Aviso fora de vigência');
      if (!db.leituras.some((l) => l.pessoaId === usuario.pessoaId && l.avisoId === a.id)) db.leituras.push({ pessoaId: usuario.pessoaId, avisoId: a.id });
      return ok(toAviso(a, usuario.pessoaId));
    },
  },
  {
    method: 'PATCH', path: '/avisos/{avisoId}', perfis: ['sindico'],
    handler: ({ params, body, usuario }) => {
      const a = avisoDoCondominio(Number(params.avisoId), usuario);
      const b = (body ?? {}) as AvisoUpdateRequest;
      if (b.titulo != null) a.titulo = b.titulo;
      if (b.conteudo != null) a.conteudo = b.conteudo;
      if (b.categoria != null) a.categoria = b.categoria;
      if (b.prioridade != null) a.prioridade = b.prioridade;
      if (b.expiraEm != null) a.expiraEm = b.expiraEm;
      return ok(toAviso(a, usuario.pessoaId));
    },
  },
  {
    method: 'DELETE', path: '/avisos/{avisoId}', perfis: ['sindico'],
    handler: ({ params, usuario }) => {
      avisoDoCondominio(Number(params.avisoId), usuario).expiraEm = agoraIso();
      return ok(undefined, 204);
    },
  },

  // ---------------------------------------------------------------- Reservas
  {
    method: 'GET', path: '/areas-comuns', perfis: TODOS,
    handler: ({ usuario }) => ok(db.areas.filter((a) => a.condominioId === usuario.condominioId).map(({ condominioId: _c, ...a }) => a)),
  },
  {
    method: 'GET', path: '/areas-comuns/{areaComumId}/disponibilidade', perfis: ['morador', 'proprietario'],
    handler: ({ params, query, usuario }) => {
      exigir(/^\d{4}-\d{2}-\d{2}$/.test(query.data ?? ''), 'data', 'formato AAAA-MM-DD');
      const area = areaDoCondominio(Number(params.areaComumId), usuario);
      const [ano, mes, dia] = query.data.split('-').map(Number);
      const horarios = [];
      for (let h = HORA_ABERTURA; h < HORA_FECHAMENTO; h++) {
        const inicio = new Date(ano, mes - 1, dia, h).getTime();
        const fim = inicio + 3600000;
        const ocupado = db.reservas.some((r) => r.areaComumId === area.id && r.status === 'confirmada' && new Date(r.inicio).getTime() < fim && new Date(r.fim).getTime() > inicio);
        horarios.push({ inicio: new Date(inicio).toISOString(), fim: new Date(fim).toISOString(), disponivel: !ocupado && fim > Date.now() });
      }
      return ok({ data: query.data, horarios });
    },
  },
  {
    method: 'GET', path: '/reservas', perfis: ['morador', 'proprietario', 'portaria', 'sindico'],
    handler: ({ query, usuario }) => {
      const areas = db.areas.filter((a) => a.condominioId === usuario.condominioId).map((a) => a.id);
      let lista = db.reservas.filter((r) => areas.includes(r.areaComumId));
      if (ehMorador(usuario)) lista = lista.filter((r) => r.unidadeId === usuario.unidadeId);
      const data = query.data ?? (usuario.perfil === 'portaria' ? hoje() : undefined);
      if (data) lista = lista.filter((r) => dataLocal(new Date(r.inicio)) === data);
      return ok(paginar(lista.sort((a, b) => a.inicio.localeCompare(b.inicio)).map(toReserva), query));
    },
  },
  {
    method: 'POST', path: '/reservas', perfis: ['morador', 'proprietario'],
    handler: ({ body, usuario }) => {
      exigir(body?.areaComumId, 'areaComumId');
      exigir(body?.inicio, 'inicio');
      exigir(body?.fim, 'fim');
      const inicio = new Date(body.inicio).getTime();
      const fim = new Date(body.fim).getTime();
      exigir(!Number.isNaN(inicio) && !Number.isNaN(fim) && fim > inicio, 'fim', 'deve ser posterior ao início');
      const area = areaDoCondominio(Number(body.areaComumId), usuario);
      const sobrepoe = db.reservas.some((r) => r.areaComumId === area.id && r.status === 'confirmada' && new Date(r.inicio).getTime() < fim && new Date(r.fim).getTime() > inicio);
      if (sobrepoe) throw new Problema(409, 'Horário indisponível: já existe reserva confirmada nesse período');
      const reserva: ReservaDb = { id: proximoId(), areaComumId: area.id, unidadeId: usuario.unidadeId!, solicitanteId: usuario.pessoaId, inicio: new Date(inicio).toISOString(), fim: new Date(fim).toISOString(), status: 'confirmada', valor: area.taxa };
      db.reservas.push(reserva);
      notificar([usuario.pessoaId], 'reserva', 'Reserva confirmada', `${area.nome} reservado com sucesso.`, reserva.id);
      return ok(toReserva(reserva), 201);
    },
  },
  {
    method: 'GET', path: '/reservas/{reservaId}', perfis: ['morador', 'proprietario', 'portaria', 'sindico'],
    handler: ({ params, usuario }) => ok(toReserva(reservaComEscopo(Number(params.reservaId), usuario))),
  },
  {
    method: 'DELETE', path: '/reservas/{reservaId}', perfis: ['morador', 'proprietario'],
    handler: ({ params, usuario }) => {
      const r = reservaComEscopo(Number(params.reservaId), usuario);
      if (r.status !== 'confirmada') throw new Problema(409, 'A reserva não está mais confirmada');
      r.status = 'cancelada';
      return ok(undefined, 204);
    },
  },
  {
    method: 'POST', path: '/reservas/{reservaId}/vistoria', perfis: ['portaria'],
    handler: ({ params, body, usuario }) => {
      exigir(body?.momento === 'entrada' || body?.momento === 'saida', 'momento', 'entrada ou saida');
      const r = reservaComEscopo(Number(params.reservaId), usuario);
      db.vistorias.push({ reservaId: r.id, momento: body.momento, dano: !!body.dano, observacao: body.observacao, fotosUrl: body.fotosUrl });
      if (body.dano) {
        db.ocorrencias.push({ id: proximoId(), condominioId: usuario.condominioId, reservaId: r.id, titulo: `Dano na vistoria de ${body.momento}`, descricao: body.observacao ?? 'Dano identificado na vistoria.', status: 'aberta', abertaEm: agoraIso() });
      }
      if (body.momento === 'saida') r.status = 'concluida';
      return ok(toReserva(r));
    },
  },

  // ---------------------------------------------------------------- Minha Unidade
  {
    method: 'GET', path: '/unidades/minha', perfis: ['morador', 'proprietario'],
    handler: ({ usuario }) => ok(toUnidade(usuario.unidadeId!)),
  },
  {
    method: 'GET', path: '/unidades/minha/vinculos', perfis: ['morador', 'proprietario'],
    // Vínculo encerrado (fim = hoje ou antes) não aparece mais.
    handler: ({ usuario }) => ok(db.vinculos.filter((v) => v.unidadeId === usuario.unidadeId && (!v.fim || v.fim > hoje())).map(toVinculo)),
  },
  {
    method: 'POST', path: '/unidades/minha/vinculos/solicitacoes', perfis: ['morador', 'proprietario'],
    handler: ({ body, usuario }) => {
      exigir(['proprietario', 'inquilino', 'dependente'].includes(body?.tipoVinculo), 'tipoVinculo');
      exigir(body?.nome, 'nome');
      const s = { id: proximoId(), unidadeId: usuario.unidadeId!, tipoVinculo: body.tipoVinculo, nomeSolicitado: body.nome, cpf: body.cpf, status: 'pendente' as const, solicitadoEm: agoraIso() };
      db.solicitacoes.push(s);
      const { cpf: _cpf, ...saida } = s;
      return ok(saida, 202);
    },
  },
  {
    method: 'POST', path: '/unidades/minha/inquilinos', perfis: ['proprietario'],
    handler: ({ body, usuario }) => {
      exigir(body?.nome, 'nome');
      exigir(body?.cpf, 'cpf');
      exigir(body?.contratoInicio, 'contratoInicio');
      if (body.email) exigir(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email), 'email', 'e-mail inválido');
      const cpf = String(body.cpf).replace(/\D/g, '');
      exigir(cpf.length === 11, 'cpf', 'deve ter 11 dígitos');
      let pessoa = db.pessoas.find((p) => p.cpf === cpf);
      if (!pessoa) {
        pessoa = { id: proximoId(), nome: body.nome, cpf, email: body.email ?? `${cpf}@sem-email.morah`, telefone: body.telefone, senha: 'demo123' };
        db.pessoas.push(pessoa);
      }
      const vinculo = { id: proximoId(), unidadeId: usuario.unidadeId!, pessoaId: pessoa.id, tipoVinculo: 'inquilino' as const, principal: false, inicio: body.contratoInicio, fim: body.contratoFim };
      db.vinculos.push(vinculo);
      db.perfis.push({ id: proximoId(), pessoaId: pessoa.id, perfil: 'morador', condominioId: usuario.condominioId, unidadeId: usuario.unidadeId });
      logger.info(`[mock] Convite de acesso enviado por e-mail para ${pessoa.email} (senha demo123)`);
      return ok(toVinculo(vinculo), 201);
    },
  },
  {
    method: 'DELETE', path: '/unidades/minha/inquilinos/{vinculoId}', perfis: ['proprietario'],
    handler: ({ params, usuario }) => {
      const v = db.vinculos.find((x) => x.id === Number(params.vinculoId) && x.unidadeId === usuario.unidadeId && x.tipoVinculo === 'inquilino' && (!x.fim || x.fim > hoje()));
      if (!v) throw new Problema(404, 'Vínculo de inquilino não encontrado');
      v.fim = hoje();
      db.perfis = db.perfis.filter((p) => !(p.pessoaId === v.pessoaId && p.unidadeId === v.unidadeId && p.perfil === 'morador'));
      db.sessoes = db.sessoes.filter((s) => !(s.pessoaId === v.pessoaId && s.unidadeId === v.unidadeId));
      return ok(undefined, 204);
    },
  },
  {
    method: 'GET', path: '/unidades/{unidadeId}', perfis: ['sindico'],
    handler: ({ params, usuario }) => ok(toUnidade(unidadeDoCondominio(Number(params.unidadeId), usuario.condominioId).id)),
  },
  {
    method: 'GET', path: '/unidades/{unidadeId}/vinculos/solicitacoes', perfis: ['sindico'],
    handler: ({ params, usuario }) => {
      const u = unidadeDoCondominio(Number(params.unidadeId), usuario.condominioId);
      return ok(db.solicitacoes.filter((s) => s.unidadeId === u.id && s.status === 'pendente').map(({ cpf: _cpf, ...s }) => s));
    },
  },
  {
    method: 'PATCH', path: '/unidades/{unidadeId}/vinculos/solicitacoes/{solicitacaoId}', perfis: ['sindico'],
    handler: ({ params, body, usuario }) => {
      exigir(body?.decisao === 'aprovada' || body?.decisao === 'rejeitada', 'decisao', 'aprovada ou rejeitada');
      const u = unidadeDoCondominio(Number(params.unidadeId), usuario.condominioId);
      const s = db.solicitacoes.find((x) => x.id === Number(params.solicitacaoId) && x.unidadeId === u.id);
      if (!s) throw new Problema(404, 'Solicitação não encontrada');
      if (s.status !== 'pendente') throw new Problema(409, 'Solicitação já decidida');
      s.status = body.decisao;
      if (s.status === 'aprovada') {
        const pessoa = { id: proximoId(), nome: s.nomeSolicitado, cpf: s.cpf ?? '', email: `pessoa${db.seq}@sem-email.morah`, senha: uuid() };
        db.pessoas.push(pessoa);
        db.vinculos.push({ id: proximoId(), unidadeId: u.id, pessoaId: pessoa.id, tipoVinculo: s.tipoVinculo, principal: false, inicio: hoje() });
      }
      const { cpf: _cpf, ...saida } = s;
      return ok(saida);
    },
  },

  // ---------------------------------------------------------------- Encomendas
  {
    method: 'GET', path: '/encomendas', perfis: ['morador', 'proprietario', 'portaria', 'sindico'],
    handler: ({ query, usuario }) => {
      let lista = db.encomendas.filter((e) => e.condominioId === usuario.condominioId);
      if (ehMorador(usuario)) lista = lista.filter((e) => e.unidadeId === usuario.unidadeId);
      if (query.status) lista = lista.filter((e) => e.status === query.status);
      return ok(paginar(lista.sort((a, b) => b.recebidaEm.localeCompare(a.recebidaEm)).map(toEncomenda), query));
    },
  },
  {
    method: 'POST', path: '/encomendas', perfis: ['portaria'],
    handler: ({ body, usuario }) => {
      exigir(body?.unidadeId, 'unidadeId');
      exigir(body?.transportadora, 'transportadora');
      const u = unidadeDoCondominio(Number(body.unidadeId), usuario.condominioId);
      const e = { id: proximoId(), condominioId: usuario.condominioId, unidadeId: u.id, remetente: body.remetente, transportadora: body.transportadora, codigoRastreio: body.codigoRastreio, codigoRetirada: gerarCodigo6(), fotoUrl: body.fotoUrl, recebidaEm: agoraIso(), status: 'aguardando_retirada' as const };
      db.encomendas.push(e);
      notificar(pessoasDaUnidade(u.id), 'encomenda', 'Encomenda recebida', `${e.transportadora} entregou uma encomenda para ${u.identificacao}.`, e.id);
      return ok(toEncomenda(e), 201);
    },
  },
  {
    method: 'GET', path: '/encomendas/{encomendaId}', perfis: ['morador', 'proprietario', 'portaria', 'sindico'],
    handler: ({ params, usuario }) => ok(toEncomenda(encomendaComEscopo(Number(params.encomendaId), usuario))),
  },
  {
    method: 'POST', path: '/encomendas/{encomendaId}/autorizacoes-retirada', perfis: ['morador', 'proprietario'],
    handler: ({ params, body, usuario }) => {
      exigir(body?.nomeTerceiro, 'nomeTerceiro');
      exigir(body?.documento, 'documento');
      const horas = body.validadeHoras ?? 24;
      exigir(Number.isInteger(horas) && horas >= 1, 'validadeHoras', 'mínimo 1');
      const e = encomendaComEscopo(Number(params.encomendaId), usuario);
      const aut = { id: proximoId(), encomendaId: e.id, nomeTerceiro: body.nomeTerceiro, documento: body.documento, codigo: gerarCodigo6(), validade: new Date(Date.now() + horas * 3600000).toISOString(), status: 'ativa' as const };
      db.autorizacoesRetirada.push(aut);
      return ok(aut, 201);
    },
  },
  {
    method: 'POST', path: '/encomendas/{encomendaId}/retirada', perfis: ['portaria'],
    handler: ({ params, body, usuario }) => {
      exigir(body?.codigo, 'codigo');
      const e = encomendaComEscopo(Number(params.encomendaId), usuario);
      if (e.status !== 'aguardando_retirada') throw new Problema(409, 'Encomenda já retirada ou extraviada');
      const codigo = String(body.codigo).trim();
      if (codigo !== e.codigoRetirada) {
        const terceiro = db.autorizacoesRetirada.find((a) => a.encomendaId === e.id && a.codigo === codigo && a.status === 'ativa' && new Date(a.validade).getTime() > Date.now());
        if (!terceiro) throw new Problema(409, 'Código de retirada inválido ou expirado');
        terceiro.status = 'utilizada';
      }
      e.status = 'retirada';
      e.retiradaEm = agoraIso();
      return ok(toEncomenda(e));
    },
  },
  {
    method: 'POST', path: '/encomendas/{encomendaId}/ocorrencias', perfis: ['morador', 'proprietario'],
    handler: ({ params, body, usuario }) => {
      exigir(body?.titulo, 'titulo');
      exigir(body?.descricao, 'descricao');
      const e = encomendaComEscopo(Number(params.encomendaId), usuario);
      const o = { id: proximoId(), condominioId: usuario.condominioId, encomendaId: e.id, titulo: body.titulo, descricao: body.descricao, status: 'aberta' as const, abertaEm: agoraIso() };
      db.ocorrencias.push(o);
      e.status = 'extraviada';
      return ok({ id: o.id, titulo: o.titulo, descricao: o.descricao, status: o.status, abertaEm: o.abertaEm }, 201);
    },
  },

  // ---------------------------------------------------------------- Notificações
  {
    method: 'GET', path: '/notificacoes', perfis: TODOS,
    handler: ({ query, usuario }) => {
      const lista = db.notificacoes.filter((n) => n.pessoaId === usuario.pessoaId).sort((a, b) => b.enviadaEm.localeCompare(a.enviadaEm)).map(({ pessoaId: _p, ...n }) => n);
      return ok(paginar(lista, query).content);
    },
  },
  {
    method: 'PATCH', path: '/notificacoes/{notificacaoId}/lida', perfis: TODOS,
    handler: ({ params, usuario }) => {
      const n = db.notificacoes.find((x) => x.id === Number(params.notificacaoId) && x.pessoaId === usuario.pessoaId);
      if (!n) throw new Problema(404, 'Notificação não encontrada');
      n.lidaEm = n.lidaEm ?? agoraIso();
      const { pessoaId: _p, ...saida } = n;
      return ok(saida);
    },
  },

  // ---------------------------------------------------------------- Personalização
  {
    method: 'GET', path: '/condominio/personalizacao', perfis: TODOS,
    handler: ({ usuario }) => ok(db.personalizacoes.find((p) => p.condominioId === usuario.condominioId)),
  },
  {
    method: 'PATCH', path: '/condominio/personalizacao', perfis: ['sindico'],
    handler: ({ body, usuario }) => {
      const b = (body ?? {}) as PersonalizacaoUpdateRequest;
      const cor = /^#[0-9A-Fa-f]{6}$/;
      const erros: { campo: string; mensagem: string }[] = [];
      for (const campo of ['corPrimaria', 'corSecundaria', 'corDestaque'] as const) {
        if (b[campo] != null && !cor.test(b[campo]!)) erros.push({ campo, mensagem: 'deve estar no formato #RRGGBB' });
      }
      if (b.nomeExibicao != null && (b.nomeExibicao.length < 1 || b.nomeExibicao.length > 60)) erros.push({ campo: 'nomeExibicao', mensagem: 'entre 1 e 60 caracteres' });
      if (erros.length) throw new Problema(400, 'Dados inválidos', erros);
      const p = db.personalizacoes.find((x) => x.condominioId === usuario.condominioId)!;
      if (b.nomeExibicao != null) p.nomeExibicao = b.nomeExibicao;
      if ('logoUrl' in b) p.logoUrl = b.logoUrl ?? null;
      if (b.corPrimaria != null) p.corPrimaria = b.corPrimaria;
      if (b.corSecundaria != null) p.corSecundaria = b.corSecundaria;
      if (b.corDestaque != null) p.corDestaque = b.corDestaque;
      p.atualizadoEm = agoraIso();
      return ok(p);
    },
  },
  {
    method: 'GET', path: '/condominio/modulos', perfis: TODOS,
    handler: ({ usuario }) =>
      ok(db.modulos.filter((m) => m.condominioId === usuario.condominioId).map((m) => ({ modulo: m.modulo, nome: NOMES_MODULOS[m.modulo], ativo: m.ativo, atualizadoEm: m.atualizadoEm }))),
  },
  {
    method: 'PATCH', path: '/condominio/modulos/{modulo}', perfis: ['sindico'],
    handler: ({ params, body, usuario }) => {
      if (!(params.modulo in NOMES_MODULOS)) throw new Problema(400, 'Módulo inválido', [{ campo: 'modulo', mensagem: 'valor não permitido' }]);
      exigir(typeof body?.ativo === 'boolean', 'ativo', 'deve ser true ou false');
      const m = db.modulos.find((x) => x.condominioId === usuario.condominioId && x.modulo === params.modulo)!;
      m.ativo = body.ativo;
      m.atualizadoEm = agoraIso();
      return ok({ modulo: m.modulo, nome: NOMES_MODULOS[m.modulo], ativo: m.ativo, atualizadoEm: m.atualizadoEm });
    },
  },
];

// ------------------------------------------------------------------ buscas com escopo

function cobrancaComEscopo(id: number, usuario: UsuarioLogado) {
  const c = db.cobrancas.find((x) => x.id === id && unidadesDoCondominio(usuario.condominioId).some((u) => u.id === x.unidadeId));
  if (!c) throw new Problema(404, 'Cobrança não encontrada');
  exigirMesmaUnidade(usuario, c.unidadeId);
  return c;
}

function autorizacaoComEscopo(id: number, usuario: UsuarioLogado) {
  const a = db.autorizacoes.find((x) => x.id === id && x.condominioId === usuario.condominioId);
  if (!a) throw new Problema(404, 'Autorização não encontrada');
  exigirMesmaUnidade(usuario, a.unidadeId);
  return a;
}

function avisoDoCondominio(id: number, usuario: UsuarioLogado) {
  const a = db.avisos.find((x) => x.id === id && x.condominioId === usuario.condominioId);
  if (!a) throw new Problema(404, 'Aviso não encontrado');
  return a;
}

function areaDoCondominio(id: number, usuario: UsuarioLogado) {
  const a = db.areas.find((x) => x.id === id && x.condominioId === usuario.condominioId);
  if (!a) throw new Problema(404, 'Área comum não encontrada');
  return a;
}

function reservaComEscopo(id: number, usuario: UsuarioLogado) {
  const r = db.reservas.find((x) => x.id === id && db.areas.some((a) => a.id === x.areaComumId && a.condominioId === usuario.condominioId));
  if (!r) throw new Problema(404, 'Reserva não encontrada');
  exigirMesmaUnidade(usuario, r.unidadeId);
  return r;
}

function encomendaComEscopo(id: number, usuario: UsuarioLogado) {
  const e = db.encomendas.find((x) => x.id === id && x.condominioId === usuario.condominioId);
  if (!e) throw new Problema(404, 'Encomenda não encontrada');
  exigirMesmaUnidade(usuario, e.unidadeId);
  return e;
}

function resumoInadimplencia(condominioId: number) {
  const unidades = unidadesDoCondominio(condominioId);
  const cobrancas = db.cobrancas.filter((c) => unidades.some((u) => u.id === c.unidadeId));
  const inadimplentes = new Set(cobrancas.filter((c) => statusCobranca(c) === 'atrasado').map((c) => c.unidadeId));
  const emAberto = cobrancas.filter((c) => c.status === 'pendente').reduce((soma, c) => soma + toCobranca(c).valorTotal, 0);
  return {
    totalUnidades: unidades.length,
    unidadesInadimplentes: inadimplentes.size,
    percentualInadimplencia: unidades.length ? arred((inadimplentes.size / unidades.length) * 100) : 0,
    valorTotalEmAberto: arred(emAberto),
  };
}

// ------------------------------------------------------------------ despacho

const rotasCompiladas = rotas.map((r) => {
  const nomes: string[] = [];
  const regex = new RegExp('^' + r.path.replace(/\{(\w+)\}/g, (_m, nome) => (nomes.push(nome), '([^/]+)')) + '$');
  return { ...r, regex, nomes };
});

function processar(req: Requisicao): Resposta {
  const caminho = req.path.split('?')[0];
  const candidatas = rotasCompiladas.filter((r) => r.regex.test(caminho));
  if (!candidatas.length) throw new Problema(404, `Rota ${caminho} não existe no contrato`);
  const rota = candidatas.find((r) => r.method === req.method);
  if (!rota) throw new Problema(405, `Método ${req.method} não permitido em ${caminho}`);

  const valores = caminho.match(rota.regex)!.slice(1);
  const params = Object.fromEntries(rota.nomes.map((n, i) => [n, decodeURIComponent(valores[i])]));
  const query = Object.fromEntries(Object.entries(req.query ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)]));

  let usuario = null as unknown as UsuarioLogado;
  if (rota.perfis) {
    usuario = autenticar(req.headers);
    if (!temPerfil(usuario, rota.perfis)) throw new Problema(403, 'Perfil sem permissão para esta operação');
    const modulo = moduloDaRota(caminho);
    if (modulo && !moduloAtivo(usuario.condominioId, modulo)) {
      throw new Problema(403, `Módulo ${NOMES_MODULOS[modulo]} desativado neste condomínio`);
    }
  }

  const resultado = rota.handler({ params, query, body: req.body, headers: req.headers, usuario });
  if (req.method !== 'GET') salvarDb();
  return { status: resultado.status, data: resultado.data };
}

/** Transporte do ApiClient que responde em memória, com um pequeno atraso para parecer rede. */
export const transporteMock: Transporte = async (req) => {
  await new Promise((r) => setTimeout(r, 120));
  try {
    // Cópia profunda: a tela nunca recebe referências ao "banco".
    const resposta = processar(req);
    return { status: resposta.status, data: resposta.data === undefined ? undefined : JSON.parse(JSON.stringify(resposta.data)) };
  } catch (erro) {
    if (erro instanceof Problema) {
      return { status: erro.status, data: { type: 'about:blank', title: TITULOS[erro.status] ?? 'Erro', status: erro.status, detail: erro.detail, instance: req.path, erros: erro.erros } };
    }
    logger.error('[mock] erro inesperado', erro);
    return { status: 500, data: { title: 'Erro interno', status: 500, detail: String(erro) } };
  }
};
