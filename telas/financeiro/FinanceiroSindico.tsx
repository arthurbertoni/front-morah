import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { AlertTriangle, ArrowDownToLine, CheckCircle2, FilePlus2, FileText, Layers, Plus, Search, WalletCards } from 'lucide-react-native';
import {
  Button,
  Card,
  Chips,
  colors,
  DetailRow,
  Feedback,
  Input,
  LoadMore,
  MetricCard,
  QueryState,
  Screen,
  Section,
  Sheet,
  StatusPill,
  TopBar,
} from '@/components/morah-ui';
import { useAcao, useApi, usePaged, useRecarregarAoFocar } from '@/hooks/useApi';
import {
  baixarCobrancaManualmente,
  criarTaxa,
  gerarCobrancasEmLote,
  getCobranca,
  getResumoInadimplencia,
  listarCobrancas,
  listarDocumentosFinanceiros,
  publicarDocumentoFinanceiro,
} from '@/lib/api/endpoints/financeiro';
import type { GerarCobrancasResponse, StatusCobranca, Taxa, TipoRateio } from '@/lib/api/types';
import { competencia, competenciaAtual, data, dataCurta, moeda, numero, STATUS_COBRANCA } from '@/lib/format';
import { comumStyles, useNomeCondominio } from '@/telas/comum';
import { LinhaCobranca } from './FinanceiroMorador';

type Filtro = 'todas' | StatusCobranca;

const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'pendente', label: 'Pendentes' },
  { value: 'atrasado', label: 'Atrasadas' },
  { value: 'pago', label: 'Pagas' },
  { value: 'cancelado', label: 'Canceladas' },
];

// UC08 — Financeiro (síndico): inadimplência, cobranças do condomínio, baixa manual,
// taxas com geração em lote e publicação de documentos (REQ010).
export default function FinanceiroSindico() {
  const nomeCondominio = useNomeCondominio();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [unidadeTexto, setUnidadeTexto] = useState('');
  const [compTexto, setCompTexto] = useState('');
  const [filtrosAplicados, setFiltrosAplicados] = useState<{ unidadeId?: number; competencia?: string }>({});
  const [cobrancaSelecionada, setCobrancaSelecionada] = useState<number | null>(null);
  const [novaTaxa, setNovaTaxa] = useState(false);
  const [novoDocumento, setNovoDocumento] = useState(false);
  const [gerarExistente, setGerarExistente] = useState(false);

  const inadimplencia = useApi(getResumoInadimplencia);
  const cobrancas = usePaged(
    (page) => listarCobrancas({ page, size: 10, status: filtro === 'todas' ? undefined : filtro, ...filtrosAplicados }),
    [filtro, filtrosAplicados],
  );
  const documentos = usePaged((page) => listarDocumentosFinanceiros({ page, size: 5 }));

  const recarregar = () => {
    inadimplencia.reload();
    cobrancas.reload();
    documentos.reload();
  };
  useRecarregarAoFocar(recarregar);

  const aplicarFiltros = () => {
    const unidadeId = unidadeTexto.trim() ? Number(unidadeTexto) : undefined;
    setFiltrosAplicados({ unidadeId: Number.isFinite(unidadeId) ? unidadeId : undefined, competencia: compTexto.trim() || undefined });
  };

  const inad = inadimplencia.data;

  return (
    <Screen onRefresh={recarregar} refreshing={cobrancas.loading && cobrancas.itens.length > 0}>
      <TopBar eyebrow={`${nomeCondominio} · painel do síndico`} title="Financeiro" />

      <Section title="Inadimplência">
        {inadimplencia.error ? <QueryState loading={false} error={inadimplencia.error} empty onRetry={inadimplencia.reload} /> : null}
        <View style={comumStyles.metrics}>
          <MetricCard icon={AlertTriangle} label="Unidades inadimplentes" value={inad ? `${inad.unidadesInadimplentes}/${inad.totalUnidades}` : '—'} caption="Com cobrança atrasada" tone="red" />
          <MetricCard icon={Layers} label="Percentual" value={inad ? `${inad.percentualInadimplencia.toLocaleString('pt-BR')}%` : '—'} caption="Das unidades do condomínio" tone="orange" />
          <MetricCard icon={WalletCards} label="Valor em aberto" value={inad ? moeda(inad.valorTotalEmAberto) : '—'} caption="Pendentes + atrasadas" tone="blue" />
        </View>
      </Section>

      <Section title="Taxas e rateio">
        <Card>
          <Text style={comumStyles.paragraph}>Cadastre uma taxa e gere as cobranças de todas as unidades (rateio igualitário ou por fração ideal).</Text>
          <View style={comumStyles.actions}>
            <Button label="Nova taxa" icon={Plus} onPress={() => setNovaTaxa(true)} />
            <Button label="Gerar cobranças de taxa existente" icon={Layers} variant="outline" onPress={() => setGerarExistente(true)} />
          </View>
        </Card>
      </Section>

      <Section title="Cobranças do condomínio">
        <View style={{ marginBottom: 12 }}>
          <Chips options={FILTROS} value={filtro} onChange={setFiltro} scroll />
        </View>
        <Card style={{ marginBottom: 12 }}>
          <View style={styles.filtros}>
            <View style={styles.filtroCampo}>
              <Input label="Unidade (id)" value={unidadeTexto} onChangeText={setUnidadeTexto} placeholder="Todas" keyboardType="number-pad" />
            </View>
            <View style={styles.filtroCampo}>
              <Input label="Competência" value={compTexto} onChangeText={setCompTexto} placeholder="AAAA-MM" autoCapitalize="none" />
            </View>
          </View>
          <Button label="Aplicar filtros" icon={Search} variant="outline" small onPress={aplicarFiltros} style={{ alignSelf: 'flex-start' }} />
        </Card>
        <QueryState loading={cobrancas.loading} error={cobrancas.error} empty={!cobrancas.itens.length} onRetry={cobrancas.reload} emptyTitle="Nenhuma cobrança" emptyDescription="Ajuste os filtros ou gere cobranças a partir de uma taxa." />
        {cobrancas.itens.map((c) => (
          <LinhaCobranca key={c.id} cobranca={c} mostrarUnidade onPress={() => setCobrancaSelecionada(c.id)} />
        ))}
        <LoadMore hasMore={cobrancas.hasMore} loading={cobrancas.loading} onPress={cobrancas.loadMore} />
      </Section>

      <Section title="Documentos financeiros" action="Publicar" onAction={() => setNovoDocumento(true)}>
        <QueryState loading={documentos.loading} error={documentos.error} empty={!documentos.itens.length} onRetry={documentos.reload} emptyTitle="Nenhum documento publicado" emptyDescription="Publique notas fiscais e prestações de contas para os moradores." />
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

      <BaixaManualSheet cobrancaId={cobrancaSelecionada} onClose={() => setCobrancaSelecionada(null)} onBaixa={recarregar} />
      <NovaTaxaSheet visible={novaTaxa} onClose={() => setNovaTaxa(false)} onGerado={recarregar} />
      <GerarExistenteSheet visible={gerarExistente} onClose={() => setGerarExistente(false)} onGerado={recarregar} />
      <NovoDocumentoSheet visible={novoDocumento} onClose={() => setNovoDocumento(false)} onPublicado={documentos.reload} />
    </Screen>
  );
}

// POST /financeiro/cobrancas/{id}/baixa-manual
function BaixaManualSheet({ cobrancaId, onClose, onBaixa }: { cobrancaId: number | null; onClose: () => void; onBaixa: () => void }) {
  const detalhe = useApi(() => (cobrancaId ? getCobranca(cobrancaId) : Promise.resolve(null)), [cobrancaId]);
  const { mensagem, setMensagem, executando, executar } = useAcao();
  const [meio, setMeio] = useState('transferencia');
  const [valor, setValor] = useState('');
  const [observacao, setObservacao] = useState('');
  const c = detalhe.data;

  const fechar = () => {
    setMensagem(null);
    setValor('');
    setObservacao('');
    onClose();
  };

  const registrar = async () => {
    if (!c) return;
    const v = valor.trim() ? numero(valor) : c.valorTotal;
    if (!Number.isFinite(v) || v <= 0) {
      setMensagem({ tipo: 'warning', texto: 'Informe um valor válido.' });
      return;
    }
    const r = await executar(
      () => baixarCobrancaManualmente(c.id, { meio, valor: v, pagoEm: new Date().toISOString(), observacao: observacao.trim() || undefined }),
      'Baixa registrada: a cobrança agora está paga e a unidade foi notificada.',
    );
    if (r.ok) {
      detalhe.setData(r.resultado);
      onBaixa();
    }
  };

  const podeBaixar = c && (c.status === 'pendente' || c.status === 'atrasado');

  return (
    <Sheet visible={cobrancaId !== null} title="Cobrança" onClose={fechar}>
      <QueryState loading={detalhe.loading} error={detalhe.error} empty={!c} onRetry={detalhe.reload} />
      {c ? (
        <>
          <DetailRow label="Unidade" value={String(c.unidadeId)} />
          <DetailRow label="Descrição" value={c.taxaDescricao} />
          <DetailRow label="Competência" value={competencia(c.competencia)} />
          <DetailRow label="Vencimento" value={data(c.vencimento)} />
          <DetailRow label="Valor original" value={moeda(c.valorOriginal)} />
          <DetailRow label="Multa + juros" value={moeda(c.multa + c.juros)} />
          <DetailRow label="Total" value={moeda(c.valorTotal)} />
          <DetailRow label="Status" value={<StatusPill label={STATUS_COBRANCA[c.status].rotulo} tone={STATUS_COBRANCA[c.status].tom} />} />
          {podeBaixar ? (
            <View style={{ marginTop: 18 }}>
              <Text style={comumStyles.label}>Registrar baixa manual (pagamento fora do gateway)</Text>
              <View style={{ marginBottom: 14 }}>
                <Chips
                  options={[
                    { value: 'transferencia', label: 'Transferência' },
                    { value: 'dinheiro', label: 'Dinheiro' },
                    { value: 'boleto', label: 'Boleto' },
                    { value: 'pix_externo', label: 'PIX externo' },
                  ]}
                  value={meio}
                  onChange={setMeio}
                />
              </View>
              <Input label="Valor recebido" value={valor} onChangeText={setValor} placeholder={c.valorTotal.toFixed(2).replace('.', ',')} keyboardType="decimal-pad" />
              <Input label="Observação (opcional)" value={observacao} onChangeText={setObservacao} placeholder="Ex.: comprovante enviado por e-mail" />
              <Button label="Confirmar baixa" icon={CheckCircle2} loading={executando} onPress={registrar} />
            </View>
          ) : null}
          {mensagem ? <Feedback type={mensagem.tipo}>{mensagem.texto}</Feedback> : null}
        </>
      ) : null}
      <View style={{ height: 12 }} />
    </Sheet>
  );
}

function ResultadoLote({ resultado }: { resultado: GerarCobrancasResponse }) {
  return (
    <Card style={{ marginTop: 12 }}>
      <Text style={comumStyles.itemTitle}>Lote da taxa #{resultado.taxaId}</Text>
      <Text style={comumStyles.itemDetail}>{resultado.totalGeradas} cobrança(s) gerada(s).</Text>
      {resultado.falhas.length ? (
        <View style={{ marginTop: 10 }}>
          <Text style={comumStyles.label}>Unidades com falha</Text>
          {resultado.falhas.map((f) => (
            <Text key={f.unidadeId} style={comumStyles.itemDetail}>• Unidade {f.unidadeId}: {f.motivo}</Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

// POST /financeiro/taxas → POST /financeiro/taxas/{taxaId}/gerar-cobrancas
function NovaTaxaSheet({ visible, onClose, onGerado }: { visible: boolean; onClose: () => void; onGerado: () => void }) {
  const { mensagem, setMensagem, executando, executar } = useAcao();
  const [descricao, setDescricao] = useState('Taxa condominial');
  const [comp, setComp] = useState(competenciaAtual(1));
  const [valor, setValor] = useState('');
  const [rateio, setRateio] = useState<TipoRateio>('igualitario');
  const [dia, setDia] = useState('10');
  const [taxa, setTaxa] = useState<Taxa | null>(null);
  const [lote, setLote] = useState<GerarCobrancasResponse | null>(null);

  const fechar = () => {
    setMensagem(null);
    setTaxa(null);
    setLote(null);
    setValor('');
    onClose();
  };

  const salvar = async () => {
    const r = await executar(
      () => criarTaxa({ descricao: descricao.trim(), competencia: comp.trim(), valor: numero(valor), tipoRateio: rateio, vencimentoDia: Number(dia) }),
      (t) => `Taxa #${t.id} criada. Agora gere as cobranças das unidades.`,
    );
    if (r.ok) setTaxa(r.resultado);
  };

  const gerar = async () => {
    if (!taxa) return;
    const r = await executar(() => gerarCobrancasEmLote(taxa.id), 'Lote processado e moradores notificados.');
    if (r.ok) {
      setLote(r.resultado);
      onGerado();
    }
  };

  return (
    <Sheet visible={visible} title="Nova taxa" onClose={fechar}>
      {!taxa ? (
        <>
          <Input label="Descrição" value={descricao} onChangeText={setDescricao} />
          <Input label="Competência" value={comp} onChangeText={setComp} placeholder="AAAA-MM" autoCapitalize="none" hint={comp ? competencia(comp) : undefined} />
          <Input label="Valor total da taxa (R$)" value={valor} onChangeText={setValor} placeholder="1600,00" keyboardType="decimal-pad" />
          <Text style={comumStyles.label}>Rateio</Text>
          <View style={{ marginBottom: 14 }}>
            <Chips options={[{ value: 'igualitario', label: 'Igualitário' }, { value: 'fracao_ideal', label: 'Fração ideal' }]} value={rateio} onChange={setRateio} />
          </View>
          <Input label="Dia de vencimento (1 a 28)" value={dia} onChangeText={setDia} keyboardType="number-pad" />
          <Button label="Cadastrar taxa" icon={Plus} loading={executando} onPress={salvar} />
        </>
      ) : (
        <>
          <DetailRow label="Taxa" value={`#${taxa.id} · ${taxa.descricao}`} />
          <DetailRow label="Competência" value={competencia(taxa.competencia)} />
          <DetailRow label="Valor" value={moeda(taxa.valor)} />
          <DetailRow label="Rateio" value={taxa.tipoRateio === 'igualitario' ? 'Igualitário' : 'Fração ideal'} />
          <DetailRow label="Vencimento" value={`Dia ${taxa.vencimentoDia}`} />
          {!lote ? <Button label="Gerar cobranças das unidades" icon={Layers} loading={executando} onPress={gerar} style={{ marginTop: 16 }} /> : <ResultadoLote resultado={lote} />}
        </>
      )}
      {mensagem ? <Feedback type={mensagem.tipo}>{mensagem.texto}</Feedback> : null}
      <View style={{ height: 12 }} />
    </Sheet>
  );
}

// O contrato não tem GET /financeiro/taxas: para uma taxa já cadastrada, o síndico informa o id.
function GerarExistenteSheet({ visible, onClose, onGerado }: { visible: boolean; onClose: () => void; onGerado: () => void }) {
  const { mensagem, setMensagem, executando, executar } = useAcao();
  const [taxaId, setTaxaId] = useState('');
  const [lote, setLote] = useState<GerarCobrancasResponse | null>(null);

  const fechar = () => {
    setMensagem(null);
    setLote(null);
    onClose();
  };

  const gerar = async () => {
    const id = Number(taxaId);
    if (!Number.isInteger(id) || id <= 0) {
      setMensagem({ tipo: 'warning', texto: 'Informe o id numérico da taxa.' });
      return;
    }
    const r = await executar(() => gerarCobrancasEmLote(id), 'Lote processado.');
    if (r.ok) {
      setLote(r.resultado);
      onGerado();
    }
  };

  return (
    <Sheet visible={visible} title="Gerar cobranças em lote" onClose={fechar}>
      <Input label="Id da taxa" value={taxaId} onChangeText={setTaxaId} keyboardType="number-pad" hint="Unidades já cobradas por esta taxa aparecem em “falhas”." />
      <Button label="Gerar cobranças" icon={Layers} loading={executando} onPress={gerar} />
      {lote ? <ResultadoLote resultado={lote} /> : null}
      {mensagem ? <Feedback type={mensagem.tipo}>{mensagem.texto}</Feedback> : null}
      <View style={{ height: 12 }} />
    </Sheet>
  );
}

// POST /financeiro/documentos
function NovoDocumentoSheet({ visible, onClose, onPublicado }: { visible: boolean; onClose: () => void; onPublicado: () => void }) {
  const { mensagem, setMensagem, executando, executar } = useAcao();
  const [tipo, setTipo] = useState('nota_fiscal');
  const [titulo, setTitulo] = useState('');
  const [url, setUrl] = useState('');
  const [comp, setComp] = useState('');

  const fechar = () => {
    setMensagem(null);
    onClose();
  };

  const publicar = async () => {
    const r = await executar(
      () => publicarDocumentoFinanceiro({ tipo, titulo: titulo.trim(), arquivoUrl: url.trim(), competencia: comp.trim() || undefined }),
      'Documento publicado e disponível aos moradores.',
    );
    if (r.ok) {
      setTitulo('');
      setUrl('');
      setComp('');
      onPublicado();
    }
  };

  return (
    <Sheet visible={visible} title="Publicar documento" onClose={fechar}>
      <Text style={comumStyles.label}>Tipo</Text>
      <View style={{ marginBottom: 14 }}>
        <Chips options={[{ value: 'nota_fiscal', label: 'Nota fiscal' }, { value: 'prestacao_contas', label: 'Prestação de contas' }, { value: 'outro', label: 'Outro' }]} value={tipo} onChange={setTipo} />
      </View>
      <Input label="Título" value={titulo} onChangeText={setTitulo} placeholder="Ex.: Nota fiscal — jardinagem" />
      <Input label="URL do arquivo" value={url} onChangeText={setUrl} placeholder="https://…/arquivo.pdf" autoCapitalize="none" keyboardType="url" hint="O contrato recebe a URL do arquivo já hospedado (não há upload)." />
      <Input label="Competência (opcional)" value={comp} onChangeText={setComp} placeholder="AAAA-MM-DD" autoCapitalize="none" />
      <Button label="Publicar" icon={FilePlus2} loading={executando} onPress={publicar} />
      {mensagem ? <Feedback type={mensagem.tipo}>{mensagem.texto}</Feedback> : null}
      <View style={{ height: 12 }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  filtros: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  filtroCampo: { flex: 1, minWidth: 140 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
});
