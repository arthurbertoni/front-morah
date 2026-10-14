import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Bell, CalendarDays, CheckCheck, Megaphone, Package, ShieldCheck, WalletCards } from 'lucide-react-native';
import { Button, Card, colors, Feedback, LoadMore, QueryState, Screen, Section, TopBar } from '@/components/morah-ui';
import { useAuth } from '@/contexts/AuthContext';
import { useTema } from '@/contexts/CondominioContext';
import { useAcao, useRecarregarAoFocar } from '@/hooks/useApi';
import { mensagemDeErro } from '@/lib/api/client';
import { listarNotificacoes, marcarNotificacaoLida } from '@/lib/api/endpoints/notificacoes';
import type { Notificacao, TipoNotificacao } from '@/lib/api/types';
import { dataHora } from '@/lib/format';
import { comumStyles } from '@/telas/comum';

const TAMANHO = 20;

const ICONES: Record<TipoNotificacao, typeof Bell> = {
  portaria: ShieldCheck,
  encomenda: Package,
  financeiro: WalletCards,
  aviso: Megaphone,
  reserva: CalendarDays,
};

// UC24 — Visualizar Notificação. GET /notificacoes devolve só o array da página (sem metadados).
export default function NotificacoesScreen() {
  const tema = useTema();
  const { perfil } = useAuth();
  const [itens, setItens] = useState<Notificacao[]>([]);
  const [pagina, setPagina] = useState(0);
  const [temMais, setTemMais] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { mensagem, setMensagem, executando, executar } = useAcao();

  const carregar = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const lista = await listarNotificacoes({ page, size: TAMANHO });
      setItens((atual) => (page === 0 ? lista : [...atual, ...lista]));
      setPagina(page);
      setTemMais(lista.length === TAMANHO);
    } catch (erro) {
      setError(mensagemDeErro(erro));
    } finally {
      setLoading(false);
    }
  }, []);

  const recarregar = useCallback(() => carregar(0), [carregar]);
  useEffect(() => {
    recarregar();
  }, [recarregar]);
  useRecarregarAoFocar(recarregar);

  /** Abre a tela relacionada ao `tipo`/`referenciaId` da notificação. */
  const destino = (n: Notificacao): Href | null => {
    const ref = n.referenciaId ? String(n.referenciaId) : undefined;
    switch (n.tipo) {
      case 'portaria':
        return perfil === 'portaria' ? '/portaria' : { pathname: '/portaria', params: ref ? { autorizacao: ref } : {} };
      case 'encomenda':
        return { pathname: '/encomendas', params: ref ? { encomenda: ref } : {} };
      case 'aviso':
        return { pathname: '/avisos', params: ref ? { aviso: ref } : {} };
      case 'financeiro':
        return '/financeiro';
      case 'reserva':
        return '/reservas';
      default:
        return null;
    }
  };

  const abrir = async (n: Notificacao) => {
    if (!n.lidaEm) {
      const r = await executar(() => marcarNotificacaoLida(n.id));
      if (r.ok) setItens((atual) => atual.map((x) => (x.id === n.id ? r.resultado : x)));
    }
    const href = destino(n);
    if (href) router.push(href);
  };

  const marcarTodas = async () => {
    const naoLidas = itens.filter((n) => !n.lidaEm);
    const r = await executar(async () => Promise.all(naoLidas.map((n) => marcarNotificacaoLida(n.id))), 'Todas as notificações foram marcadas como lidas.');
    if (r.ok) setItens((atual) => atual.map((x) => r.resultado.find((y) => y.id === x.id) ?? x));
  };

  const naoLidas = itens.filter((n) => !n.lidaEm).length;

  return (
    <Screen onRefresh={recarregar} refreshing={loading && itens.length > 0}>
      <TopBar
        eyebrow={`${naoLidas} não lida(s)`}
        title="Notificações"
        onBack={() => router.back()}
        action={naoLidas ? <Button label="Ler todas" icon={CheckCheck} variant="outline" small loading={executando} onPress={marcarTodas} /> : undefined}
      />
      {mensagem ? <Feedback type={mensagem.tipo} onClose={() => setMensagem(null)}>{mensagem.texto}</Feedback> : null}
      <Section>
        <QueryState loading={loading} error={error} empty={!itens.length} onRetry={recarregar} emptyTitle="Nenhuma notificação" emptyDescription="Avisos, visitantes, encomendas, cobranças e reservas geram notificações aqui." />
        {itens.map((n) => {
          const Icone = ICONES[n.tipo] ?? Bell;
          return (
            <Card key={n.id} style={[comumStyles.listItem, !n.lidaEm && { borderColor: tema.primaria }]} onPress={() => abrir(n)}>
              <View style={[comumStyles.itemIcon, { backgroundColor: n.lidaEm ? colors.soft : tema.primariaSoft }]}>
                <Icone size={18} color={n.lidaEm ? colors.muted : tema.primaria} />
              </View>
              <View style={comumStyles.itemCopy}>
                <Text style={comumStyles.itemTitle}>{n.titulo}</Text>
                <Text style={comumStyles.itemDetail}>{n.mensagem}</Text>
                <Text style={[comumStyles.itemDetail, { fontSize: 11 }]}>{dataHora(n.enviadaEm)}</Text>
              </View>
              {!n.lidaEm ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: tema.destaque }} /> : null}
            </Card>
          );
        })}
        <LoadMore hasMore={temMais} loading={loading} onPress={() => carregar(pagina + 1)} />
      </Section>
    </Screen>
  );
}
