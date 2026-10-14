import { api } from '../client';
import type { Notificacao, PageParams } from '../types';

// Tag "Notificações" do contrato.

/** GET /notificacoes (operationId: listarNotificacoes) — devolve só o array da página pedida. */
export const listarNotificacoes = (params: PageParams = {}) => api.get<Notificacao[]>('/notificacoes', params);

/** PATCH /notificacoes/{notificacaoId}/lida (operationId: marcarNotificacaoLida) */
export const marcarNotificacaoLida = (notificacaoId: number) =>
  api.patch<Notificacao>(`/notificacoes/${notificacaoId}/lida`);
