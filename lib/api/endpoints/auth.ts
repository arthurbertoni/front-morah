import { api } from '../client';
import type { ContextoAtivoResponse, ContextoRequest, LoginRequest, LoginResponse, MeResponse } from '../types';

// Tag "Login" do contrato.

/** POST /auth/login (operationId: login) */
export const login = (dados: LoginRequest) => api.post<LoginResponse>('/auth/login', dados, { auth: false });

/** GET /auth/me (operationId: getMe) */
export const getMe = () => api.get<MeResponse>('/auth/me');

/** POST /auth/contexto (operationId: selecionarContexto) */
export const selecionarContexto = (dados: ContextoRequest) =>
  api.post<ContextoAtivoResponse>('/auth/contexto', dados);

/** POST /auth/logout (operationId: logout) */
export const logout = () => api.post<void>('/auth/logout');
