import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { mensagemDeErro } from '@/lib/api/client';
import type { Paged } from '@/lib/api/types';

/** Carrega um recurso da API: `{ data, loading, error, reload }`. */
export function useApi<T>(buscar: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await buscarRef.current());
    } catch (erro) {
      setError(mensagemDeErro(erro));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, setData, loading, error, reload };
}

/** Lista paginada `{ content, page }` com "carregar mais". */
export function usePaged<T>(buscar: (page: number) => Promise<Paged<T>>, deps: unknown[] = []) {
  const [itens, setItens] = useState<T[]>([]);
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;

  const carregar = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const resposta = await buscarRef.current(page);
      setItens((atual) => (page === 0 ? resposta.content : [...atual, ...resposta.content]));
      setPagina(resposta.page.page);
      setTotalPaginas(resposta.page.totalPages);
      setTotal(resposta.page.totalElements);
    } catch (erro) {
      setError(mensagemDeErro(erro));
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(() => carregar(0), [carregar]);
  const loadMore = useCallback(() => carregar(pagina + 1), [carregar, pagina]);

  useEffect(() => {
    carregar(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { itens, total, loading, error, reload, loadMore, hasMore: pagina + 1 < totalPaginas };
}

/** Recarrega os dados quando a tela volta a ficar visível (a primeira carga já é feita pelo hook). */
export function useRecarregarAoFocar(reload: () => void) {
  const primeira = useRef(true);
  // Ref: a função pode mudar a cada render sem disparar o efeito de novo (evita loop de recarga).
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  useFocusEffect(
    useCallback(() => {
      if (primeira.current) {
        primeira.current = false;
        return;
      }
      reloadRef.current();
    }, []),
  );
}

/** Executa uma ação (POST/PATCH/DELETE) e guarda a mensagem de sucesso ou erro para o `Feedback`. */
export function useAcao() {
  const [mensagem, setMensagem] = useState<{ tipo: 'success' | 'warning'; texto: string } | null>(null);
  const [executando, setExecutando] = useState(false);

  const executar = useCallback(async <R,>(
    acao: () => Promise<R>,
    sucesso?: string | ((r: R) => string),
  ): Promise<{ ok: true; resultado: R } | { ok: false; erro: string }> => {
    setExecutando(true);
    setMensagem(null);
    try {
      const resultado = await acao();
      if (sucesso) setMensagem({ tipo: 'success', texto: typeof sucesso === 'function' ? sucesso(resultado) : sucesso });
      return { ok: true, resultado };
    } catch (erro) {
      const texto = mensagemDeErro(erro);
      setMensagem({ tipo: 'warning', texto });
      return { ok: false, erro: texto };
    } finally {
      setExecutando(false);
    }
  }, []);

  return { mensagem, setMensagem, executando, executar };
}
