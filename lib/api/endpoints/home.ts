import { api } from '../client';
import type { Dashboard } from '../types';

// Tag "Tela Inicial" do contrato.

/** GET /home/dashboard (operationId: getDashboard) — formato varia pelo campo `perfil`. */
export const getDashboard = () => api.get<Dashboard>('/home/dashboard');
