import { api } from '../client';
import type {
  AutorizacaoRetirada,
  AutorizacaoRetiradaCreateRequest,
  Encomenda,
  EncomendaCreateRequest,
  EncomendaPage,
  Ocorrencia,
  OcorrenciaCreateRequest,
  PageParams,
  RetiradaConfirmRequest,
  StatusEncomenda,
} from '../types';

// Tag "Encomendas" do contrato.

/** GET /encomendas (operationId: listarEncomendas) */
export const listarEncomendas = (filtro: PageParams & { status?: StatusEncomenda } = {}) =>
  api.get<EncomendaPage>('/encomendas', filtro);

/** POST /encomendas (operationId: registrarEncomenda) */
export const registrarEncomenda = (dados: EncomendaCreateRequest) => api.post<Encomenda>('/encomendas', dados);

/** GET /encomendas/{encomendaId} (operationId: getEncomenda) */
export const getEncomenda = (encomendaId: number) => api.get<Encomenda>(`/encomendas/${encomendaId}`);

/** POST /encomendas/{encomendaId}/autorizacoes-retirada (operationId: autorizarRetiradaTerceiro) */
export const autorizarRetiradaTerceiro = (encomendaId: number, dados: AutorizacaoRetiradaCreateRequest) =>
  api.post<AutorizacaoRetirada>(`/encomendas/${encomendaId}/autorizacoes-retirada`, dados);

/** POST /encomendas/{encomendaId}/retirada (operationId: confirmarRetiradaEncomenda) */
export const confirmarRetiradaEncomenda = (encomendaId: number, dados: RetiradaConfirmRequest) =>
  api.post<Encomenda>(`/encomendas/${encomendaId}/retirada`, dados);

/** POST /encomendas/{encomendaId}/ocorrencias (operationId: abrirOcorrenciaEncomenda) */
export const abrirOcorrenciaEncomenda = (encomendaId: number, dados: OcorrenciaCreateRequest) =>
  api.post<Ocorrencia>(`/encomendas/${encomendaId}/ocorrencias`, dados);
