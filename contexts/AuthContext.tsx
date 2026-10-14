import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import * as authApi from '@/lib/api/endpoints/auth';
import type { ContextoAtivo, MeResponse, Perfil, PerfilDisponivel } from '@/lib/api/types';
import { logger } from '@/lib/logger';

// Sessão do usuário: tokens (no ApiClient), pessoa autenticada e contexto ativo (condomínio + perfil).

type AuthValor = {
  carregando: boolean;
  me: MeResponse | null;
  contexto: ContextoAtivo | null;
  perfil: Perfil | null;
  /** morador ou proprietário (proprietário é cumulativo ao morador). */
  ehMorador: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  trocarContexto: (destino: PerfilDisponivel) => Promise<void>;
  recarregar: () => Promise<void>;
};

const AuthContext = createContext<AuthValor | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);

  const recarregar = useCallback(async () => {
    setMe(await authApi.getMe());
  }, []);

  // Restaura a sessão salva ao abrir o app (o ApiClient renova o token se precisar).
  useEffect(() => {
    api.setAoEncerrarSessao(() => setMe(null));
    (async () => {
      try {
        if (await api.carregarTokens()) await recarregar();
      } catch (erro) {
        logger.warn('Sessão salva inválida; voltando ao login', erro);
        await api.limparTokens();
      } finally {
        setCarregando(false);
      }
    })();
    return () => api.setAoEncerrarSessao(null);
  }, [recarregar]);

  const login = useCallback(
    async (email: string, senha: string) => {
      const resposta = await authApi.login({ email, senha });
      await api.salvarTokens(resposta.accessToken, resposta.refreshToken);
      await recarregar();
      logger.info(`Login de ${email} como ${resposta.contexto.perfil}`);
    },
    [recarregar],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // mesmo que a API falhe, a sessão local é encerrada
    }
    await api.limparTokens();
    setMe(null);
  }, []);

  const trocarContexto = useCallback(
    async (destino: PerfilDisponivel) => {
      const resposta = await authApi.selecionarContexto({ condominioId: destino.condominioId, perfil: destino.perfil });
      await api.salvarTokens(resposta.accessToken, resposta.refreshToken);
      await recarregar();
    },
    [recarregar],
  );

  const valor = useMemo<AuthValor>(() => {
    const contexto = me?.contextoAtivo ?? null;
    const perfil = contexto?.perfil ?? null;
    return {
      carregando,
      me,
      contexto,
      perfil,
      ehMorador: perfil === 'morador' || perfil === 'proprietario',
      login,
      logout,
      trocarContexto,
      recarregar,
    };
  }, [carregando, me, login, logout, trocarContexto, recarregar]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const valor = useContext(AuthContext);
  if (!valor) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return valor;
}
