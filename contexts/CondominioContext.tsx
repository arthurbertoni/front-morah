import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { INTERVALO_RECARGA_CONDOMINIO_MS } from '@/lib/config';
import * as condominioApi from '@/lib/api/endpoints/condominio';
import type { ModuloCodigo, ModuloCondominio, Personalizacao } from '@/lib/api/types';
import { logger } from '@/lib/logger';
import { useAuth } from './AuthContext';

// Identidade visual e módulos ativos do condomínio do contexto ativo.
// Recarrega a cada 5 minutos e quando o app volta ao primeiro plano (REQ018).

export type Tema = {
  primaria: string;
  primariaSoft: string;
  primariaEscura: string;
  destaque: string;
  destaqueSoft: string;
  fundo: string;
};

const TEMA_PADRAO: Tema = criarTema('#0C716D', '#F7FAF8', '#C56E2E');

type CondominioValor = {
  personalizacao: Personalizacao | null;
  modulos: ModuloCondominio[];
  tema: Tema;
  moduloAtivo: (modulo: ModuloCodigo) => boolean;
  recarregar: () => Promise<void>;
  aplicarPersonalizacao: (p: Personalizacao) => void;
  aplicarModulo: (m: ModuloCondominio) => void;
};

const CondominioContext = createContext<CondominioValor | null>(null);

function hexParaRgb(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mistura a cor com branco (fator > 0) ou preto (fator < 0). */
function misturar(hex: string, fator: number) {
  const alvo = fator >= 0 ? 255 : 0;
  const f = Math.abs(fator);
  return (
    '#' +
    hexParaRgb(hex)
      .map((c) => Math.round(c + (alvo - c) * f).toString(16).padStart(2, '0'))
      .join('')
  );
}

function criarTema(primaria: string, fundo: string, destaque: string): Tema {
  return {
    primaria,
    primariaSoft: misturar(primaria, 0.88),
    primariaEscura: misturar(primaria, -0.55),
    destaque,
    destaqueSoft: misturar(destaque, 0.88),
    fundo: misturar(fundo, 0.4),
  };
}

export function CondominioProvider({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  const [personalizacao, setPersonalizacao] = useState<Personalizacao | null>(null);
  const [modulos, setModulos] = useState<ModuloCondominio[]>([]);
  const chaveContexto = me ? `${me.pessoa.id}-${me.contextoAtivo.condominioId}-${me.contextoAtivo.perfil}` : null;

  const recarregar = useCallback(async () => {
    try {
      const [p, m] = await Promise.all([condominioApi.getPersonalizacao(), condominioApi.listarModulos()]);
      setPersonalizacao(p);
      setModulos(m);
    } catch (erro) {
      logger.warn('Não foi possível carregar personalização/módulos', erro);
    }
  }, []);

  useEffect(() => {
    if (!chaveContexto) {
      setPersonalizacao(null);
      setModulos([]);
      return;
    }
    recarregar();
    const intervalo = setInterval(recarregar, INTERVALO_RECARGA_CONDOMINIO_MS);
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') recarregar();
    });
    return () => {
      clearInterval(intervalo);
      assinatura.remove();
    };
  }, [chaveContexto, recarregar]);

  const valor = useMemo<CondominioValor>(
    () => ({
      personalizacao,
      modulos,
      tema: personalizacao ? criarTema(personalizacao.corPrimaria, personalizacao.corSecundaria, personalizacao.corDestaque) : TEMA_PADRAO,
      // Enquanto a lista não chega, considera ativo (a API devolve 403 se não estiver).
      moduloAtivo: (modulo) => modulos.find((m) => m.modulo === modulo)?.ativo ?? true,
      recarregar,
      aplicarPersonalizacao: setPersonalizacao,
      aplicarModulo: (m) => setModulos((atual) => atual.map((x) => (x.modulo === m.modulo ? m : x))),
    }),
    [personalizacao, modulos, recarregar],
  );

  return <CondominioContext.Provider value={valor}>{children}</CondominioContext.Provider>;
}

export function useCondominio() {
  const valor = useContext(CondominioContext);
  if (!valor) throw new Error('useCondominio precisa estar dentro de <CondominioProvider>');
  return valor;
}

export function useTema() {
  return useCondominio().tema;
}
