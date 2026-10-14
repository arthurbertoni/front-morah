import { api } from '../client';
import type {
  Acesso,
  AcessoCreateRequest,
  AcessoPage,
  AutorizacaoVisita,
  AutorizacaoVisitaCreateRequest,
  AutorizacaoVisitaPage,
  DecisaoAutorizacaoRequest,
  PageParams,
  StatusAutorizacaoVisita,
} from '../types';

// Tag "Portaria" do contrato.

/** POST /portaria/visitantes (operationId: registrarVisitante) */
export const registrarVisitante = (dados: AutorizacaoVisitaCreateRequest) =>
  api.post<AutorizacaoVisita>('/portaria/visitantes', dados);

/** GET /portaria/autorizacoes (operationId: listarAutorizacoes) */
export const listarAutorizacoes = (filtro: PageParams & { status?: StatusAutorizacaoVisita } = {}) =>
  api.get<AutorizacaoVisitaPage>('/portaria/autorizacoes', filtro);

/** GET /portaria/autorizacoes/{autorizacaoId} (operationId: getAutorizacao) */
export const getAutorizacao = (autorizacaoId: number) =>
  api.get<AutorizacaoVisita>(`/portaria/autorizacoes/${autorizacaoId}`);

/** PATCH /portaria/autorizacoes/{autorizacaoId}/decisao (operationId: decidirAutorizacao) */
export const decidirAutorizacao = (autorizacaoId: number, dados: DecisaoAutorizacaoRequest) =>
  api.patch<AutorizacaoVisita>(`/portaria/autorizacoes/${autorizacaoId}/decisao`, dados);

/** POST /portaria/autorizacoes/{autorizacaoId}/reenviar (operationId: reenviarAutorizacao) */
export const reenviarAutorizacao = (autorizacaoId: number) =>
  api.post<void>(`/portaria/autorizacoes/${autorizacaoId}/reenviar`);

/** GET /portaria/acessos (operationId: listarAcessos) */
export const listarAcessos = (filtro: PageParams & { data?: string } = {}) =>
  api.get<AcessoPage>('/portaria/acessos', filtro);

/** POST /portaria/acessos (operationId: registrarAcesso) */
export const registrarAcesso = (dados: AcessoCreateRequest) => api.post<Acesso>('/portaria/acessos', dados);
