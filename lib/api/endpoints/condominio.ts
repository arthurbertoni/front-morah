import { api } from '../client';
import type {
  ModuloCodigo,
  ModuloCondominio,
  ModuloUpdateRequest,
  Personalizacao,
  PersonalizacaoUpdateRequest,
} from '../types';

// Tag "Personalização" do contrato.

/** GET /condominio/personalizacao (operationId: getPersonalizacao) */
export const getPersonalizacao = () => api.get<Personalizacao>('/condominio/personalizacao');

/** PATCH /condominio/personalizacao (operationId: atualizarPersonalizacao) */
export const atualizarPersonalizacao = (dados: PersonalizacaoUpdateRequest) =>
  api.patch<Personalizacao>('/condominio/personalizacao', dados);

/** GET /condominio/modulos (operationId: listarModulos) */
export const listarModulos = () => api.get<ModuloCondominio[]>('/condominio/modulos');

/** PATCH /condominio/modulos/{modulo} (operationId: atualizarModulo) */
export const atualizarModulo = (modulo: ModuloCodigo, dados: ModuloUpdateRequest) =>
  api.patch<ModuloCondominio>(`/condominio/modulos/${modulo}`, dados);
