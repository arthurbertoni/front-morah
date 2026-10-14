import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AlertOctagon, KeyRound, PackageCheck, PackageOpen, PackagePlus, UserCheck } from 'lucide-react-native';
import {
  Button,
  Card,
  Chips,
  colors,
  DetailRow,
  Feedback,
  Input,
  LoadMore,
  ModuloDesativado,
  QueryState,
  Screen,
  Section,
  Sheet,
  StatusPill,
  TopBar,
} from '@/components/morah-ui';
import { useAuth } from '@/contexts/AuthContext';
import { useCondominio, useTema } from '@/contexts/CondominioContext';
import { useAcao, useApi, usePaged, useRecarregarAoFocar } from '@/hooks/useApi';
import {
  abrirOcorrenciaEncomenda,
  autorizarRetiradaTerceiro,
  confirmarRetiradaEncomenda,
  getEncomenda,
  listarEncomendas,
  registrarEncomenda,
} from '@/lib/api/endpoints/encomendas';
import type { AutorizacaoRetirada, Encomenda, Perfil, StatusEncomenda } from '@/lib/api/types';
import { dataHora, STATUS_ENCOMENDA } from '@/lib/format';
import { comumStyles, useNomeCondominio } from '@/telas/comum';

type Filtro = 'todas' | StatusEncomenda;

// UC06 (morador), UC12 (porteiro) — Encomendas.
export default function EncomendasScreen() {
  const { moduloAtivo } = useCondominio();
  if (!moduloAtivo('encomendas')) return <ModuloDesativado nome="Encomendas" />;
  return <Encomendas />;
}

function Encomendas() {
  const { perfil } = useAuth();
  const nomeCondominio = useNomeCondominio();
  const params = useLocalSearchParams<{ encomenda?: string }>();
  const ehPortaria = perfil === 'portaria';
  const [filtro, setFiltro] = useState<Filtro>('aguardando_retirada');
  const [aberta, setAberta] = useState<number | null>(null);
  const [nova, setNova] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const lista = usePaged((page) => listarEncomendas({ page, size: 10, status: filtro === 'todas' ? undefined : filtro }), [filtro]);
  useRecarregarAoFocar(lista.reload);

  useEffect(() => {
    if (params.encomenda) setAberta(Number(params.encomenda));
  }, [params.encomenda]);

  return (
    <Screen onRefresh={lista.reload} refreshing={lista.loading && lista.itens.length > 0}>
      <TopBar
        eyebrow={ehPortaria ? `${nomeCondominio} · guarita` : nomeCondominio}
        title="Encomendas"
        action={ehPortaria ? <Button label="Receber" icon={PackagePlus} small onPress={() => setNova(true)} /> : undefined}
      />
      {aviso ? <Feedback type="success" onClose={() => setAviso(null)}>{aviso}</Feedback> : null}
      <Section>
        <Chips
          scroll
          value={filtro}
          onChange={setFiltro}
          options={[
            { value: 'aguardando_retirada', label: 'Aguardando retirada' },
            { value: 'retirada', label: 'Retiradas' },
            { value: 'extraviada', label: 'Extraviadas' },
            { value: 'todas', label: 'Todas' },
          ]}
        />
      </Section>
      <Section title={ehPortaria ? 'Encomendas do condomínio' : 'Suas encomendas'}>
        <QueryState
          loading={lista.loading}
          error={lista.error}
          empty={!lista.itens.length}
          onRetry={lista.reload}
          emptyTitle="Nenhuma encomenda"
          emptyDescription={ehPortaria ? 'Use “Receber” para registrar um pacote.' : 'Quando a portaria receber um pacote para sua unidade, ele aparece aqui.'}
        />
        {lista.itens.map((e) => (
          <LinhaEncomenda key={e.id} encomenda={e} mostrarUnidade={!['morador', 'proprietario'].includes(perfil ?? '')} onPress={() => setAberta(e.id)} />
        ))}
        <LoadMore hasMore={lista.hasMore} loading={lista.loading} onPress={lista.loadMore} />
      </Section>

      <DetalheEncomenda
        encomendaId={aberta}
        perfil={perfil}
        onClose={() => {
          setAberta(null);
          lista.reload();
        }}
      />
      <ReceberEncomendaSheet
        visible={nova}
        onClose={() => setNova(false)}
        onRegistrada={(e) => {
          setNova(false);
          setAviso(`Encomenda registrada para a unidade ${e.unidadeId}. Os moradores foram notificados.`);
          setFiltro('aguardando_retirada');
          lista.reload();
        }}
      />
    </Screen>
  );
}

function LinhaEncomenda({ encomenda: e, mostrarUnidade, onPress }: { encomenda: Encomenda; mostrarUnidade: boolean; onPress: () => void }) {
  const tema = useTema();
  const status = STATUS_ENCOMENDA[e.status];
  return (
    <Card style={comumStyles.listItem} onPress={onPress}>
      <View style={[comumStyles.itemIcon, { backgroundColor: e.status === 'aguardando_retirada' ? colors.orangeSoft : tema.primariaSoft }]}>
        <PackageOpen size={18} color={e.status === 'aguardando_retirada' ? colors.orange : tema.primaria} />
      </View>
      <View style={comumStyles.itemCopy}>
        <Text style={comumStyles.itemTitle}>{e.remetente ?? e.transportadora}{mostrarUnidade ? ` · unidade ${e.unidadeId}` : ''}</Text>
        <Text style={comumStyles.itemDetail}>{e.transportadora} · recebida {dataHora(e.recebidaEm).toLowerCase()}</Text>
      </View>
      <StatusPill label={status.rotulo} tone={status.tom} />
    </Card>
  );
}

// GET /encomendas/{id} e as ações conforme o perfil.
function DetalheEncomenda({ encomendaId, perfil, onClose }: { encomendaId: number | null; perfil: Perfil | null; onClose: () => void }) {
  const detalhe = useApi(() => (encomendaId ? getEncomenda(encomendaId) : Promise.resolve(null)), [encomendaId]);
  const [modo, setModo] = useState<'detalhe' | 'terceiro' | 'ocorrencia' | 'retirada'>('detalhe');
  const [terceiro, setTerceiro] = useState<AutorizacaoRetirada | null>(null);
  const { mensagem, setMensagem, executando, executar } = useAcao();
  const [campo1, setCampo1] = useState('');
  const [campo2, setCampo2] = useState('');
  const [campo3, setCampo3] = useState('');
  const e = detalhe.data;
  const ehMorador = perfil === 'morador' || perfil === 'proprietario';
  const aguardando = e?.status === 'aguardando_retirada';

  useEffect(() => {
    setModo('detalhe');
    setTerceiro(null);
    setMensagem(null);
  }, [encomendaId, setMensagem]);

  const trocarModo = (m: typeof modo) => {
    setCampo1('');
    setCampo2('');
    setCampo3(m === 'terceiro' ? '24' : '');
    setMensagem(null);
    setModo(m);
  };

  const autorizarTerceiro = async () => {
    if (!e) return;
    const horas = campo3.trim() ? Number(campo3) : undefined;
    const r = await executar(() => autorizarRetiradaTerceiro(e.id, { nomeTerceiro: campo1.trim(), documento: campo2.trim(), validadeHoras: horas }));
    if (r.ok) {
      setTerceiro(r.resultado);
      setModo('detalhe');
    }
  };

  const abrirOcorrencia = async () => {
    if (!e) return;
    const r = await executar(() => abrirOcorrenciaEncomenda(e.id, { titulo: campo1.trim(), descricao: campo2.trim() }), 'Ocorrência aberta. A encomenda foi marcada como extraviada.');
    if (r.ok) {
      setModo('detalhe');
      detalhe.reload();
    }
  };

  const confirmarRetirada = async () => {
    if (!e) return;
    const r = await executar(
      () => confirmarRetiradaEncomenda(e.id, { codigo: campo1.trim(), retiradoPorNome: campo2.trim() || undefined, retiradoPorDocumento: campo3.trim() || undefined }),
      'Retirada confirmada. Encomenda entregue.',
    );
    if (r.ok) {
      detalhe.setData(r.resultado);
      setModo('detalhe');
    }
  };

  return (
    <Sheet visible={encomendaId !== null} title="Encomenda" onClose={onClose}>
      <QueryState loading={detalhe.loading} error={detalhe.error} empty={!e} onRetry={detalhe.reload} />
      {e && modo === 'detalhe' ? (
        <>
          {ehMorador && aguardando && e.codigoRetirada ? (
            <Card style={{ marginBottom: 14 }}>
              <Text style={[comumStyles.label, { textAlign: 'center' }]}>Código de retirada</Text>
              <Text style={comumStyles.code}>{e.codigoRetirada}</Text>
              <Text style={[comumStyles.itemDetail, { textAlign: 'center' }]}>Apresente este código na portaria.</Text>
            </Card>
          ) : null}
          {terceiro ? (
            <Card style={{ marginBottom: 14 }}>
              <Text style={[comumStyles.label, { textAlign: 'center' }]}>Código para {terceiro.nomeTerceiro}</Text>
              <Text style={comumStyles.code}>{terceiro.codigo}</Text>
              <Text style={[comumStyles.itemDetail, { textAlign: 'center' }]}>Válido até {dataHora(terceiro.validade).toLowerCase()}. Envie para a pessoa autorizada.</Text>
            </Card>
          ) : null}
          <DetailRow label="Unidade" value={String(e.unidadeId)} />
          <DetailRow label="Remetente" value={e.remetente ?? '—'} />
          <DetailRow label="Transportadora" value={e.transportadora} />
          <DetailRow label="Rastreio" value={e.codigoRastreio ?? '—'} />
          <DetailRow label="Recebida" value={dataHora(e.recebidaEm)} />
          {e.retiradaEm ? <DetailRow label="Retirada" value={dataHora(e.retiradaEm)} /> : null}
          <DetailRow label="Status" value={<StatusPill label={STATUS_ENCOMENDA[e.status].rotulo} tone={STATUS_ENCOMENDA[e.status].tom} />} />
          {ehMorador && aguardando ? (
            <View style={comumStyles.actions}>
              <Button label="Autorizar terceiro" icon={UserCheck} variant="outline" onPress={() => trocarModo('terceiro')} />
              <Button label="Não encontrada? Abrir ocorrência" icon={AlertOctagon} variant="danger" onPress={() => trocarModo('ocorrencia')} />
            </View>
          ) : null}
          {perfil === 'portaria' && aguardando ? (
            <View style={comumStyles.actions}>
              <Button label="Confirmar retirada" icon={PackageCheck} onPress={() => trocarModo('retirada')} />
            </View>
          ) : null}
        </>
      ) : null}

      {e && modo === 'terceiro' ? (
        <>
          <Text style={[comumStyles.paragraph, { marginBottom: 14 }]}>Gera um código temporário de 6 dígitos para outra pessoa retirar a encomenda.</Text>
          <Input label="Nome de quem vai retirar" value={campo1} onChangeText={setCampo1} autoCapitalize="words" />
          <Input label="Documento" value={campo2} onChangeText={setCampo2} placeholder="RG ou CPF" />
          <Input label="Validade (horas)" value={campo3} onChangeText={setCampo3} keyboardType="number-pad" />
          <View style={styles.row}>
            <Button label="Voltar" variant="outline" onPress={() => setModo('detalhe')} style={{ flex: 1 }} />
            <Button label="Gerar código" icon={KeyRound} loading={executando} onPress={autorizarTerceiro} style={{ flex: 1 }} />
          </View>
        </>
      ) : null}

      {e && modo === 'ocorrencia' ? (
        <>
          <Text style={[comumStyles.paragraph, { marginBottom: 14 }]}>Use quando a portaria não localizar o pacote. A encomenda passa a “extraviada”.</Text>
          <Input label="Título" value={campo1} onChangeText={setCampo1} placeholder="Ex.: Pacote não localizado" />
          <Input label="Descrição" value={campo2} onChangeText={setCampo2} multiline placeholder="O que aconteceu?" />
          <View style={styles.row}>
            <Button label="Voltar" variant="outline" onPress={() => setModo('detalhe')} style={{ flex: 1 }} />
            <Button label="Abrir ocorrência" icon={AlertOctagon} variant="danger" loading={executando} onPress={abrirOcorrencia} style={{ flex: 1 }} />
          </View>
        </>
      ) : null}

      {e && modo === 'retirada' ? (
        <>
          <Text style={[comumStyles.paragraph, { marginBottom: 14 }]}>Digite o código do morador ou o código de um terceiro autorizado.</Text>
          <Input label="Código de retirada" value={campo1} onChangeText={setCampo1} keyboardType="number-pad" placeholder="6 dígitos" />
          <Input label="Retirado por (opcional)" value={campo2} onChangeText={setCampo2} autoCapitalize="words" />
          <Input label="Documento (opcional)" value={campo3} onChangeText={setCampo3} />
          <View style={styles.row}>
            <Button label="Voltar" variant="outline" onPress={() => setModo('detalhe')} style={{ flex: 1 }} />
            <Button label="Confirmar" icon={PackageCheck} loading={executando} onPress={confirmarRetirada} style={{ flex: 1 }} />
          </View>
        </>
      ) : null}

      {mensagem ? <Feedback type={mensagem.tipo}>{mensagem.texto}</Feedback> : null}
      <View style={{ height: 12 }} />
    </Sheet>
  );
}

// POST /encomendas
function ReceberEncomendaSheet({ visible, onClose, onRegistrada }: { visible: boolean; onClose: () => void; onRegistrada: (e: Encomenda) => void }) {
  const { mensagem, setMensagem, executando, executar } = useAcao();
  const [unidade, setUnidade] = useState('');
  const [transportadora, setTransportadora] = useState('');
  const [remetente, setRemetente] = useState('');
  const [rastreio, setRastreio] = useState('');
  const [foto, setFoto] = useState('');

  const registrar = async () => {
    const unidadeId = Number(unidade);
    if (!Number.isInteger(unidadeId) || unidadeId <= 0) {
      setMensagem({ tipo: 'warning', texto: 'Informe o número (id) da unidade.' });
      return;
    }
    const r = await executar(() =>
      registrarEncomenda({
        unidadeId,
        transportadora: transportadora.trim(),
        remetente: remetente.trim() || undefined,
        codigoRastreio: rastreio.trim() || undefined,
        fotoUrl: foto.trim() || undefined,
      }),
    );
    if (r.ok) {
      setUnidade('');
      setTransportadora('');
      setRemetente('');
      setRastreio('');
      setFoto('');
      onRegistrada(r.resultado);
    }
  };

  return (
    <Sheet visible={visible} title="Receber encomenda" onClose={() => { setMensagem(null); onClose(); }}>
      <Input label="Unidade (id)" value={unidade} onChangeText={setUnidade} keyboardType="number-pad" placeholder="Ex.: 1" hint="Sem endpoint de busca de unidades para a portaria; informe o id." />
      <Input label="Transportadora" value={transportadora} onChangeText={setTransportadora} placeholder="Correios, Loggi…" />
      <Input label="Remetente (opcional)" value={remetente} onChangeText={setRemetente} />
      <Input label="Código de rastreio (opcional)" value={rastreio} onChangeText={setRastreio} autoCapitalize="characters" />
      <Input label="URL da foto do volume (opcional)" value={foto} onChangeText={setFoto} autoCapitalize="none" keyboardType="url" hint="Sem câmera disponível, registre só com a descrição." />
      <Button label="Registrar e notificar" icon={PackagePlus} loading={executando} onPress={registrar} />
      {mensagem ? <Feedback type={mensagem.tipo}>{mensagem.texto}</Feedback> : null}
      <View style={{ height: 12 }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
});
