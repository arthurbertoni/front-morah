import { api } from '../client';
import type { Aviso, AvisoCreateRequest, AvisoPage, AvisoUpdateRequest, PageParams, PrioridadeAviso } from '../types';

// Tag "Avisos" do contrato.

/** GET /avisos (operationId: listarAvisos) */
export const listarAvisos = (filtro: PageParams & { categoria?: string; prioridade?: PrioridadeAviso } = {}) =>
  api.get<AvisoPage>('/avisos', filtro);

/** POST /avisos (operationId: criarAviso) */
export const criarAviso = (dados: AvisoCreateRequest) => api.post<Aviso>('/avisos', dados);

/** GET /avisos/{avisoId} (operationId: getAviso) — marca o aviso como lido. */
export const getAviso = (avisoId: number) => api.get<Aviso>(`/avisos/${avisoId}`);

/** PATCH /avisos/{avisoId} (operationId: atualizarAviso) */
export const atualizarAviso = (avisoId: number, dados: AvisoUpdateRequest) =>
  api.patch<Aviso>(`/avisos/${avisoId}`, dados);

/** DELETE /avisos/{avisoId} (operationId: removerAviso) — expira o aviso. */
export const removerAviso = (avisoId: number) => api.delete(`/avisos/${avisoId}`);
