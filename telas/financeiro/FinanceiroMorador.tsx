import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { ArrowDownToLine, CircleDollarSign, Copy, FileText, QrCode, Receipt, Zap } from 'lucide-react-native';
import {
  Button,
  Card,
  Chips,
  colors,
  DetailRow,
  Feedback,
  LoadMore,
  QueryState,
  Screen,
  Section,
  Sheet,
  StatusPill,
  TopBar,
} from '@/components/morah-ui';
import { useAuth } from '@/contexts/AuthContext';
import { useTema } from '@/contexts/CondominioContext';
import { useAcao, useApi, usePaged, useRecarregarAoFocar } from '@/hooks/useApi';
import { mensagemDeErro } from '@/lib/api/client';
import {
  getCobranca,
  getPixCobranca,
  listarCobrancas,
  listarDocumentosFinanceiros,
  simularWebhookPagamento,
} from '@/lib/api/endpoints/financeiro';
import type { Cobranca, PixResponse, StatusCobranca } from '@/lib/api/types';
import { USE_MOCK } from '@/lib/config';
import { competencia, data, dataCurta, hora, moeda, STATUS_COBRANCA } from '@/lib/format';
import { comumStyles, useNomeCondominio } from '@/telas/comum';

type Filtro = 'todas' | StatusCobranca;

const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'pendente', label: 'Pendentes' },
  { value: 'atrasado', label: 'Atrasadas' },
  { value: 'pago', label: 'Pagas' },
];

// UC02 — Gerenciar Financeiro (morador/proprietário): cobranças da própria unidade, PIX e documentos.
export default function FinanceiroMorador() {
  const tema = useTema();
  const { me } = useAuth();
  const nomeCondominio = useNomeCondominio();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [selecionada, setSelecionada] = useState<number | null>(null);

  // Resumo: soma do que está em aberto (pendente + atrasado) da unidade.
  const resumo = useApi(() => listarCobrancas({ size: 100 }));
  const cobrancas = usePaged((page) => listarCobrancas({ page, size: 10, status: filtro === 'todas' ? undefined : filtro }), [filtro]);
  const documentos = usePaged((page) => listarDocumentosFinanceiros({ page, size: 5 }));

  const recarregar = () => {
    resumo.reload();
    cobrancas.reload();
    documentos.reload();
  };
  useRecarregarAoFocar(recarregar);

  const emAberto = (resumo.data?.content ?? []).filter((c) => c.status === 'pendente' || c.status === 'atrasado');
  const totalAberto = emAberto.reduce((soma, c) => soma + c.valorTotal, 0);
  const maisAntiga = [...emAberto].sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0];
  const pagas = (resumo.data?.content ?? []).filter((c) => c.status === 'pago');

  return (
    <Screen onRefresh={recarregar} refreshing={cobrancas.loading && cobrancas.itens.length > 0}>
      <TopBar eyebrow={`${nomeCondominio} · unidade ${me?.contextoAtivo.unidadeId ?? ''}`} title="Financeiro" />

      <Section>
        <View style={[styles.balance, { backgroundColor: tema.primaria }]}>
          <View style={styles.balanceIcon}>
            <CircleDollarSign size={23} color={colors.white} />
          </View>
          <Text style={styles.balanceLabel}>Em aberto</Text>
          <Text style={styles.balanceValue}>{moeda(totalAberto)}</Text>
          <Text style={styles.balanceCaption}>
            {maisAntiga ? `${emAberto.length} cobrança(s) · mais antiga vence em ${data(maisAntiga.vencimento)}` : 'Nenhuma cobrança em aberto'}
          </Text>
          {maisAntiga ? (
            <Button label="Pagar com PIX" icon={QrCode} variant="light" small onPress={() => setSelecionada(maisAntiga.id)} style={styles.balanceButton} />
          ) : null}
        </View>
      </Section>

      <Section>
        <View style={comumStyles.metrics}>
          <Card style={styles.stat}>
            <Text style={styles.statLabel}>Total pago</Text>
            <Text style={styles.statValue}>{moeda(pagas.reduce((s, c) => s + c.valorTotal, 0))}</Text>
            <Text style={styles.statCaption}>{pagas.length} cobrança(s) quitada(s)</Text>
          </Card>
          <Card style={styles.stat}>
            <Text style={styles.statLabel}>Documentos</Text>
            <Text style={styles.statValue}>{documentos.total}</Text>
            <Text style={styles.statCaption}>Disponíveis para consulta</Text>
          </Card>
        </View>
      </Section>

      <Section title="Suas cobranças">
        <View style={{ marginBottom: 12 }}>
          <Chips options={FILTROS} value={filtro} onChange={setFiltro} scroll />
        </View>
        <QueryState loading={cobrancas.loading} error={cobrancas.error} empty={!cobrancas.itens.length} onRetry={cobrancas.reload} emptyTitle="Nenhuma cobrança" emptyDescription="Não há cobranças com esse filtro." />
        {cobrancas.itens.map((c) => (
          <LinhaCobranca key={c.id} cobranca={c} onPress={() => setSelecionada(c.id)} />
        ))}
        <LoadMore hasMore={cobrancas.hasMore} loading={cobrancas.loading} onPress={cobrancas.loadMore} />
      </Section>

      <Section title="Documentos financeiros">
        <QueryState loading={documentos.loading} error={documentos.error} empty={!documentos.itens.length} onRetry={documentos.reload} emptyTitle="Sem documentos" emptyDescription="O síndico ainda não publicou notas fiscais ou prestações de contas." />
        {documentos.itens.length ? (
          <Card>
            {documentos.itens.map((d) => (
              <View key={d.id} style={styles.docRow}>
                <View style={[comumStyles.itemIcon, { backgroundColor: colors.blueSoft }]}>
                  <FileText size={18} color={colors.blue} />
                </View>
                <View style={comumStyles.itemCopy}>
                  <Text style={comumStyles.itemTitle}>{d.titulo}</Text>
                  <Text style={comumStyles.itemDetail}>{d.tipo.replace(/_/g, ' ')} · publicado em {dataCurta(d.publicadoEm)}</Text>
                </View>
                <Button label="Abrir" icon={ArrowDownToLine} variant="ghost" small onPress={() => WebBrowser.openBrowserAsync(d.arquivoUrl)} />
              </View>
            ))}
          </Card>
        ) : null}
        <LoadMore hasMore={documentos.hasMore} loading={documentos.loading} onPress={documentos.loadMore} />
      </Section>

      <DetalheCobranca
        cobrancaId={selecionada}
        onClose={() => setSelecionada(null)}
        onPago={recarregar}
      />
    </Screen>
  );
}

export function LinhaCobranca({ cobranca: c, onPress, mostrarUnidade }: { cobranca: Cobranca; onPress: () => void; mostrarUnidade?: boolean }) {
  const tema = useTema();
  const status = STATUS_COBRANCA[c.status];
  return (
    <Card style={comumStyles.listItem} onPress={onPress}>
      <View style={[comumStyles.itemIcon, { backgroundColor: c.status === 'atrasado' ? colors.redSoft : tema.primariaSoft }]}>
        <Receipt size={18} color={c.status === 'atrasado' ? colors.red : tema.primaria} />
      </View>
      <View style={comumStyles.itemCopy}>
        <Text style={comumStyles.itemTitle}>{c.taxaDescricao}{mostrarUnidade ? ` · unidade ${c.unidadeId}` : ''}</Text>
        <Text style={comumStyles.itemDetail}>{competencia(c.competencia)} · vence {data(c.vencimento)}</Text>
      </View>
      <View style={comumStyles.itemRight}>
        <Text style={comumStyles.itemValue}>{moeda(c.valorTotal)}</Text>
        <StatusPill label={status.rotulo} tone={status.tom} />
      </View>
    </Card>
  );
}

function DetalheCobranca({ cobrancaId, onClose, onPago }: { cobrancaId: number | null; onClose: () => void; onPago: () => void }) {
  const [pix, setPix] = useState<PixResponse | null>(null);
  const { mensagem, setMensagem, executando, executar } = useAcao();
  const detalhe = useApi(() => (cobrancaId ? getCobranca(cobrancaId) : Promise.resolve(null)), [cobrancaId]);
  const c = detalhe.data;

  const fechar = () => {
    setPix(null);
    setMensagem(null);
    onClose();
  };

  const gerarPix = async () => {
    if (!c) return;
    const r = await executar(() => getPixCobranca(c.id));
    if (r.ok) setPix(r.resultado);
  };

  const copiar = async () => {
    if (!pix) return;
    try {
      await Clipboard.setStringAsync(pix.codigoPix);
      setMensagem({ tipo: 'success', texto: 'Código PIX copiado para a área de transferência.' });
    } catch (erro) {
      setMensagem({ tipo: 'warning', texto: mensagemDeErro(erro) });
    }
  };

  const simularPagamento = async () => {
    if (!c) return;
    const r = await executar(
      () => simularWebhookPagamento({ transacaoId: `sim-${Date.now()}`, cobrancaId: c.id, valor: c.valorTotal, status: 'confirmado', pagoEm: new Date().toISOString() }),
      'Pagamento confirmado pelo gateway (simulado). A cobrança agora está paga.',
    );
    if (r.ok) {
      setPix(null);
      detalhe.reload();
      onPago();
    }
  };

  const aberta = c && (c.status === 'pendente' || c.status === 'atrasado');

  return (
    <Sheet visible={cobrancaId !== null} title="Detalhe da cobrança" onClose={fechar}>
      <QueryState loading={detalhe.loading} error={detalhe.error} empty={!c} onRetry={detalhe.reload} />
      {c ? (
        <>
          <DetailRow label="Descrição" value={c.taxaDescricao} />
          <DetailRow label="Competência" value={competencia(c.competencia)} />
          <DetailRow label="Vencimento" value={data(c.vencimento)} />
          <DetailRow label="Valor original" value={moeda(c.valorOriginal)} />
          <DetailRow label="Multa" value={moeda(c.multa)} />
          <DetailRow label="Juros" value={moeda(c.juros)} />
          <DetailRow label="Total" value={moeda(c.valorTotal)} />
          <DetailRow label="Status" value={<StatusPill label={STATUS_COBRANCA[c.status].rotulo} tone={STATUS_COBRANCA[c.status].tom} />} />
          <View style={{ height: 16 }} />
          {pix ? (
            <Card style={{ marginBottom: 12 }}>
              <Text style={comumStyles.label}>PIX copia-e-cola</Text>
              <Text style={styles.pixCode} selectable>{pix.codigoPix}</Text>
              <Text style={comumStyles.itemDetail}>Válido até {hora(pix.expiraEm)} (30 minutos)</Text>
              <View style={comumStyles.actions}>
                <Button label="Copiar código PIX" icon={Copy} onPress={copiar} />
              </View>
            </Card>
          ) : aberta ? (
            <Button label="Gerar código PIX" icon={QrCode} loading={executando} onPress={gerarPix} style={{ marginBottom: 12 }} />
          ) : null}
          {pix && USE_MOCK ? (
            <Button label="Simular confirmação do gateway (webhook)" icon={Zap} variant="outline" loading={executando} onPress={simularPagamento} style={{ marginBottom: 12 }} />
          ) : null}
          {mensagem ? <Feedback type={mensagem.tipo}>{mensagem.texto}</Feedback> : null}
          {pix ? <Text style={[comumStyles.paragraph, { marginTop: 10 }]}>Após pagar no seu banco, o status muda para “pago” quando o gateway confirmar o pagamento.</Text> : null}
        </>
      ) : null}
      <View style={{ height: 12 }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  balance: { borderRadius: 20, padding: 22 },
  balanceIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginBottom: 17 },
  balanceLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 13, fontWeight: '600' },
  balanceValue: { color: colors.white, fontSize: 31, fontWeight: '700', marginTop: 4 },
  balanceCaption: { color: 'rgba(255,255,255,0.82)', fontSize: 13, marginTop: 5 },
  balanceButton: { alignSelf: 'flex-start', marginTop: 19 },
  stat: { flex: 1, minWidth: 150 },
  statLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  statValue: { color: colors.ink, fontSize: 23, fontWeight: '700', marginTop: 8 },
  statCaption: { color: colors.muted, fontSize: 12, marginTop: 4 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  pixCode: { color: colors.ink, fontSize: 12, lineHeight: 18, backgroundColor: colors.soft, padding: 10, borderRadius: 10, marginBottom: 8, fontFamily: 'monospace' },
});
