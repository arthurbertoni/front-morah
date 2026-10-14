import { api } from '../client';
import type {
  AreaComum,
  Disponibilidade,
  PageParams,
  Reserva,
  ReservaCreateRequest,
  ReservaPage,
  VistoriaRequest,
} from '../types';

// Tag "Reservas" do contrato.

/** GET /areas-comuns (operationId: listarAreasComuns) */
export const listarAreasComuns = () => api.get<AreaComum[]>('/areas-comuns');

/** GET /areas-comuns/{areaComumId}/disponibilidade (operationId: getDisponibilidadeAreaComum) */
export const getDisponibilidadeAreaComum = (areaComumId: number, data: string) =>
  api.get<Disponibilidade>(`/areas-comuns/${areaComumId}/disponibilidade`, { data });

/** GET /reservas (operationId: listarReservas) */
export const listarReservas = (filtro: PageParams & { data?: string } = {}) =>
  api.get<ReservaPage>('/reservas', filtro);

/** POST /reservas (operationId: criarReserva) */
export const criarReserva = (dados: ReservaCreateRequest) => api.post<Reserva>('/reservas', dados);

/** GET /reservas/{reservaId} (operationId: getReserva) */
export const getReserva = (reservaId: number) => api.get<Reserva>(`/reservas/${reservaId}`);

/** DELETE /reservas/{reservaId} (operationId: cancelarReserva) */
export const cancelarReserva = (reservaId: number) => api.delete(`/reservas/${reservaId}`);

/** POST /reservas/{reservaId}/vistoria (operationId: registrarVistoriaReserva) */
export const registrarVistoriaReserva = (reservaId: number, dados: VistoriaRequest) =>
  api.post<Reserva>(`/reservas/${reservaId}/vistoria`, dados);
