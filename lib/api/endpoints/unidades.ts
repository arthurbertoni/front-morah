import { api } from '../client';
import type {
  DecisaoSolicitacaoVinculoRequest,
  InquilinoCreateRequest,
  SolicitacaoVinculo,
  SolicitacaoVinculoCreateRequest,
  Unidade,
  VinculoUnidade,
} from '../types';

// Tag "Minha Unidade" do contrato.

/** GET /unidades/minha (operationId: getMinhaUnidade) */
export const getMinhaUnidade = () => api.get<Unidade>('/unidades/minha');

/** GET /unidades/minha/vinculos (operationId: listarVinculosMinhaUnidade) */
export const listarVinculosMinhaUnidade = () => api.get<VinculoUnidade[]>('/unidades/minha/vinculos');

/** POST /unidades/minha/vinculos/solicitacoes (operationId: solicitarVinculo) */
export const solicitarVinculo = (dados: SolicitacaoVinculoCreateRequest) =>
  api.post<SolicitacaoVinculo>('/unidades/minha/vinculos/solicitacoes', dados);

/** POST /unidades/minha/inquilinos (operationId: cadastrarInquilino) */
export const cadastrarInquilino = (dados: InquilinoCreateRequest) =>
  api.post<VinculoUnidade>('/unidades/minha/inquilinos', dados);

/** DELETE /unidades/minha/inquilinos/{vinculoId} (operationId: encerrarInquilino) */
export const encerrarInquilino = (vinculoId: number) => api.delete(`/unidades/minha/inquilinos/${vinculoId}`);

/** GET /unidades/{unidadeId} (operationId: getUnidade) */
export const getUnidade = (unidadeId: number) => api.get<Unidade>(`/unidades/${unidadeId}`);

/** GET /unidades/{unidadeId}/vinculos/solicitacoes (operationId: listarSolicitacoesVinculo) */
export const listarSolicitacoesVinculo = (unidadeId: number) =>
  api.get<SolicitacaoVinculo[]>(`/unidades/${unidadeId}/vinculos/solicitacoes`);

/** PATCH /unidades/{unidadeId}/vinculos/solicitacoes/{solicitacaoId} (operationId: decidirSolicitacaoVinculo) */
export const decidirSolicitacaoVinculo = (
  unidadeId: number,
  solicitacaoId: number,
  dados: DecisaoSolicitacaoVinculoRequest,
) => api.patch<SolicitacaoVinculo>(`/unidades/${unidadeId}/vinculos/solicitacoes/${solicitacaoId}`, dados);
