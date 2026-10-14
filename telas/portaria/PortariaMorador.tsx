import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Check, UserRound, X } from 'lucide-react-native';
import {
  Button,
  Card,
  Chips,
  colors,
  DetailRow,
  Feedback,
  Input,
  LoadMore,
  QueryState,
  Screen,
  Section,
  Sheet,
  StatusPill,
  TopBar,
} from '@/components/morah-ui';
import { useTema } from '@/contexts/CondominioContext';
import { useAcao, useApi, usePaged, useRecarregarAoFocar } from '@/hooks/useApi';
import { decidirAutorizacao, getAutorizacao, listarAutorizacoes } from '@/lib/api/endpoints/portaria';
import type { AutorizacaoVisita, DecisaoAutorizacao, StatusAutorizacaoVisita } from '@/lib/api/types';
import { dataHora, STATUS_AUTORIZACAO } from '@/lib/format';
import { comumStyles, useNomeCondominio } from '@/telas/comum';

type Filtro = 'todas' | StatusAutorizacaoVisita;

// UC05 — Portaria (morador): autorizar ou recusar a entrada de visitantes da própria unidade (REQ006).
export default function PortariaMorador() {
  const nomeCondominio = useNomeCondominio();
  const params = useLocalSearchParams<{ autorizacao?: string }>();
  const [filtro, setFiltro] = useState<Filtro>('pendente');
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const lista = usePaged((page) => listarAutorizacoes({ page, size: 10, status: filtro === 'todas' ? undefined : filtro }), [filtro]);
  useRecarregarAoFocar(lista.reload);

  // Aberto a partir de uma notificação (referenciaId).
  useEffect(() => {
    if (params.autorizacao) setDetalheId(Number(params.autorizacao));
  }, [params.autorizacao]);

  return (
    <Screen onRefresh={lista.reload} refreshing={lista.loading && lista.itens.length > 0}>
      <TopBar eyebrow={nomeCondominio} title="Visitantes" />
      {aviso ? <Feedback type="success" onClose={() => setAviso(null)}>{aviso}</Feedback> : null}
      <Section title="Autorizações de entrada">
        <View style={{ marginBottom: 12 }}>
          <Chips
            scroll
            value={filtro}
            onChange={setFiltro}
            options={[
              { value: 'pendente', label: 'Pendentes' },
              { value: 'todas', label: 'Todas' },
              { value: 'autorizada', label: 'Autorizadas' },
              { value: 'recusada', label: 'Recusadas' },
              { value: 'expirada', label: 'Expiradas' },
            ]}
          />
        </View>
        <QueryState loading={lista.loading} error={lista.error} empty={!lista.itens.length} onRetry={lista.reload} emptyTitle="Nenhum visitante" emptyDescription="Quando a portaria anunciar um visitante para sua unidade, ele aparece aqui para você liberar ou recusar." />
        {lista.itens.map((a) => (
          <CartaoAutorizacao key={a.id} autorizacao={a} onAbrir={() => setDetalheId(a.id)} />
        ))}
        <LoadMore hasMore={lista.hasMore} loading={lista.loading} onPress={lista.loadMore} />
        <Text style={[comumStyles.paragraph, { marginTop: 8 }]}>Sem resposta em 30 minutos, a solicitação expira e a decisão volta para a portaria.</Text>
      </Section>

      <DetalheAutorizacao
        autorizacaoId={detalheId}
        onClose={() => setDetalheId(null)}
        onDecidida={(texto) => {
          setDetalheId(null);
          setAviso(texto);
          lista.reload();
        }}
      />
    </Screen>
  );
}

function CartaoAutorizacao({ autorizacao: a, onAbrir }: { autorizacao: AutorizacaoVisita; onAbrir: () => void }) {
  const tema = useTema();
  const status = STATUS_AUTORIZACAO[a.status];
  return (
    <Card style={comumStyles.listItem} onPress={onAbrir}>
      <View style={[comumStyles.itemIcon, { backgroundColor: tema.primariaSoft }]}>
        <UserRound size={18} color={tema.primaria} />
      </View>
      <View style={comumStyles.itemCopy}>
        <Text style={comumStyles.itemTitle}>{a.visitante.nome}</Text>
        <Text style={comumStyles.itemDetail}>{a.motivo} · {dataHora(a.solicitadoEm)}</Text>
      </View>
      {a.status === 'pendente' ? (
        <View style={styles.actions}>
          <Pressable onPress={onAbrir} style={[styles.iconButton, { backgroundColor: colors.redSoft }]} accessibilityLabel={`Recusar ${a.visitante.nome}`}>
            <X size={16} color={colors.red} />
          </Pressable>
          <Pressable onPress={onAbrir} style={[styles.iconButton, { backgroundColor: colors.greenSoft }]} accessibilityLabel={`Autorizar ${a.visitante.nome}`}>
            <Check size={16} color={colors.green} />
          </Pressable>
        </View>
      ) : (
        <StatusPill label={status.rotulo} tone={status.tom} />
      )}
    </Card>
  );
}

// GET /portaria/autorizacoes/{id} + PATCH /portaria/autorizacoes/{id}/decisao
function DetalheAutorizacao({ autorizacaoId, onClose, onDecidida }: { autorizacaoId: number | null; onClose: () => void; onDecidida: (texto: string) => void }) {
  const detalhe = useApi(() => (autorizacaoId ? getAutorizacao(autorizacaoId) : Promise.resolve(null)), [autorizacaoId]);
  const { mensagem, setMensagem, executando, executar } = useAcao();
  const [justificativa, setJustificativa] = useState('');
  const a = detalhe.data;

  const fechar = () => {
    setJustificativa('');
    setMensagem(null);
    onClose();
  };

  const decidir = async (decisao: DecisaoAutorizacao) => {
    if (!a) return;
    const r = await executar(() => decidirAutorizacao(a.id, { decisao, justificativa: justificativa.trim() || undefined }));
    if (r.ok) {
      setJustificativa('');
      onDecidida(`${a.visitante.nome} foi ${decisao === 'autorizado' ? 'autorizado(a)' : 'recusado(a)'}. A portaria já foi avisada.`);
    } else {
      // 409: já decidida ou expirada — mostra o status atualizado.
      detalhe.reload();
    }
  };

  return (
    <Sheet visible={autorizacaoId !== null} title="Visitante na portaria" onClose={fechar}>
      <QueryState loading={detalhe.loading} error={detalhe.error} empty={!a} onRetry={detalhe.reload} />
      {a ? (
        <>
          <DetailRow label="Visitante" value={a.visitante.nome} />
          <DetailRow label="Documento" value={a.visitante.documento ?? '—'} />
          <DetailRow label="Telefone" value={a.visitante.telefone ?? '—'} />
          <DetailRow label="Motivo" value={a.motivo} />
          <DetailRow label="Solicitado" value={dataHora(a.solicitadoEm)} />
          {a.respondidoEm ? <DetailRow label="Respondido" value={dataHora(a.respondidoEm)} /> : null}
          <DetailRow label="Status" value={<StatusPill label={STATUS_AUTORIZACAO[a.status].rotulo} tone={STATUS_AUTORIZACAO[a.status].tom} />} />
          {a.status === 'pendente' ? (
            <View style={{ marginTop: 16 }}>
              <Input label="Justificativa (opcional)" value={justificativa} onChangeText={setJustificativa} placeholder="Ex.: pode subir / não estou esperando ninguém" />
              <View style={styles.decisao}>
                <Button label="Recusar" icon={X} variant="danger" loading={executando} onPress={() => decidir('recusado')} style={{ flex: 1 }} />
                <Button label="Liberar entrada" icon={Check} loading={executando} onPress={() => decidir('autorizado')} style={{ flex: 1 }} />
              </View>
            </View>
          ) : null}
          {mensagem ? <Feedback type={mensagem.tipo}>{mensagem.texto}</Feedback> : null}
        </>
      ) : null}
      <View style={{ height: 12 }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconButton: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  decisao: { flexDirection: 'row', gap: 10 },
});
