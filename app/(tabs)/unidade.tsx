import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Building2, Send, UserMinus, UserPlus, UserRound } from 'lucide-react-native';
import {
  Button,
  Card,
  Chips,
  Confirm,
  DetailRow,
  Feedback,
  Input,
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
import { useAcao, useApi, useRecarregarAoFocar } from '@/hooks/useApi';
import {
  cadastrarInquilino,
  encerrarInquilino,
  getMinhaUnidade,
  listarVinculosMinhaUnidade,
  solicitarVinculo,
} from '@/lib/api/endpoints/unidades';
import type { TipoVinculo, VinculoUnidade } from '@/lib/api/types';
import { data as formatarData, dataLocal, ROTULO_VINCULO } from '@/lib/format';
import { comumStyles, useNomeCondominio } from '@/telas/comum';

// UC15 — Gerenciar minha Unidade e UC26 — Gerenciar Inquilinos (proprietário).
export default function MinhaUnidadeScreen() {
  const { moduloAtivo } = useCondominio();
  const { ehMorador } = useAuth();
  if (!moduloAtivo('minha_unidade')) return <ModuloDesativado nome="Minha Unidade" />;
  if (!ehMorador) {
    return (
      <Screen>
        <TopBar eyebrow="Minha unidade" title="Indisponível" onBack={() => router.back()} />
        <Section>
          <QueryState loading={false} error="Esta tela é para moradores e proprietários. O síndico usa “Unidades”." empty />
        </Section>
      </Screen>
    );
  }
  return <MinhaUnidade />;
}

function MinhaUnidade() {
  const tema = useTema();
  const { perfil } = useAuth();
  const nomeCondominio = useNomeCondominio();
  const ehProprietario = perfil === 'proprietario';
  const [solicitar, setSolicitar] = useState(false);
  const [novoInquilino, setNovoInquilino] = useState(false);
  const [encerrando, setEncerrando] = useState<VinculoUnidade | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const { mensagem, setMensagem, executando, executar } = useAcao();
  const unidade = useApi(getMinhaUnidade);
  const vinculos = useApi(listarVinculosMinhaUnidade);
  useRecarregarAoFocar(vinculos.reload);

  const encerrar = async () => {
    if (!encerrando) return;
    setAviso(null);
    const r = await executar(() => encerrarInquilino(encerrando.id), `Contrato de ${encerrando.pessoa.nome} encerrado e acesso revogado.`);
    setEncerrando(null);
    if (r.ok) vinculos.reload();
  };

  const u = unidade.data;

  return (
    <Screen onRefresh={() => { unidade.reload(); vinculos.reload(); }} refreshing={vinculos.loading && !!vinculos.data}>
      <TopBar eyebrow={nomeCondominio} title="Minha unidade" onBack={() => router.back()} />
      {aviso ? <Feedback type="success" onClose={() => setAviso(null)}>{aviso}</Feedback> : null}
      {mensagem ? <Feedback type={mensagem.tipo} onClose={() => setMensagem(null)}>{mensagem.texto}</Feedback> : null}

      <Section title="Dados da unidade">
        <QueryState loading={unidade.loading} error={unidade.error} empty={!u} onRetry={unidade.reload} />
        {u ? (
          <Card>
            <View style={[comumStyles.row, { marginBottom: 8 }]}>
              <View style={[comumStyles.itemIcon, { backgroundColor: tema.primariaSoft }]}>
                <Building2 size={18} color={tema.primaria} />
              </View>
              <View style={comumStyles.itemCopy}>
                <Text style={comumStyles.itemTitle}>{u.identificacao} · {u.blocoNome}</Text>
                <Text style={comumStyles.itemDetail}>{u.tipo} · {u.status}</Text>
              </View>
            </View>
            <DetailRow label="Área" value={u.areaM2 ? `${u.areaM2} m²` : '—'} />
            <DetailRow label="Fração ideal" value={u.fracaoIdeal != null ? u.fracaoIdeal.toLocaleString('pt-BR') : '—'} />
            <DetailRow label="Id da unidade" value={String(u.id)} />
          </Card>
        ) : null}
      </Section>

      <Section title="Moradores e vínculos" action="Solicitar vínculo" onAction={() => setSolicitar(true)}>
        <QueryState loading={vinculos.loading} error={vinculos.error} empty={!vinculos.data?.length} onRetry={vinculos.reload} emptyTitle="Nenhum vínculo" />
        {(vinculos.data ?? []).map((v) => (
          <Card key={v.id} style={comumStyles.listItem}>
            <View style={[comumStyles.itemIcon, { backgroundColor: tema.primariaSoft }]}>
              <UserRound size={18} color={tema.primaria} />
            </View>
            <View style={comumStyles.itemCopy}>
              <Text style={comumStyles.itemTitle}>{v.pessoa.nome}</Text>
              <Text style={comumStyles.itemDetail}>
                Desde {formatarData(v.inicio)}
                {v.fim ? ` · até ${formatarData(v.fim)}` : ''}
                {v.pessoa.telefone ? ` · ${v.pessoa.telefone}` : ''}
              </Text>
            </View>
            <View style={comumStyles.itemRight}>
              <StatusPill label={`${ROTULO_VINCULO[v.tipoVinculo]}${v.principal ? ' · titular' : ''}`} tone={v.tipoVinculo === 'proprietario' ? 'teal' : v.tipoVinculo === 'inquilino' ? 'blue' : 'green'} />
              {ehProprietario && v.tipoVinculo === 'inquilino' ? <Button label="Encerrar" icon={UserMinus} variant="danger" small onPress={() => setEncerrando(v)} /> : null}
            </View>
          </Card>
        ))}
      </Section>

      {ehProprietario ? (
        <Section title="Inquilinos">
          <Card>
            <Text style={comumStyles.paragraph}>Cadastre o inquilino e o período do contrato. Ele recebe por e-mail um convite de acesso como morador da unidade.</Text>
            <View style={comumStyles.actions}>
              <Button label="Cadastrar inquilino" icon={UserPlus} onPress={() => setNovoInquilino(true)} />
            </View>
          </Card>
        </Section>
      ) : null}

      <SolicitarVinculoSheet visible={solicitar} onClose={() => setSolicitar(false)} onEnviado={(t) => { setSolicitar(false); setAviso(t); }} />
      <NovoInquilinoSheet visible={novoInquilino} onClose={() => setNovoInquilino(false)} onCadastrado={(t) => { setNovoInquilino(false); setAviso(t); vinculos.reload(); }} />
      <Confirm
        visible={!!encerrando}
        title="Encerrar contrato?"
        message={`O vínculo de ${encerrando?.pessoa.nome} termina hoje e o acesso dele ao app é revogado imediatamente.`}
        confirmLabel="Encerrar contrato"
        danger
        loading={executando}
        onCancel={() => setEncerrando(null)}
        onConfirm={encerrar}
      />
    </Screen>
  );
}

// POST /unidades/minha/vinculos/solicitacoes
function SolicitarVinculoSheet({ visible, onClose, onEnviado }: { visible: boolean; onClose: () => void; onEnviado: (texto: string) => void }) {
  const { mensagem, setMensagem, executando, executar } = useAcao();
  const [tipo, setTipo] = useState<TipoVinculo>('dependente');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [observacao, setObservacao] = useState('');

  const enviar = async () => {
    const r = await executar(() => solicitarVinculo({ tipoVinculo: tipo, nome: nome.trim(), cpf: cpf.trim() || undefined, observacao: observacao.trim() || undefined }));
    if (r.ok) {
      setNome('');
      setCpf('');
      setObservacao('');
      onEnviado(`Solicitação de vínculo de ${r.resultado.nomeSolicitado} enviada para aprovação do síndico.`);
    }
  };

  return (
    <Sheet visible={visible} title="Solicitar novo vínculo" onClose={() => { setMensagem(null); onClose(); }}>
      <Text style={comumStyles.label}>Tipo de vínculo</Text>
      <View style={{ marginBottom: 14 }}>
        <Chips value={tipo} onChange={setTipo} options={[{ value: 'dependente', label: 'Dependente' }, { value: 'inquilino', label: 'Inquilino' }, { value: 'proprietario', label: 'Proprietário' }]} />
      </View>
      <Input label="Nome" value={nome} onChangeText={setNome} autoCapitalize="words" />
      <Input label="CPF (opcional)" value={cpf} onChangeText={setCpf} keyboardType="number-pad" />
      <Input label="Observação (opcional)" value={observacao} onChangeText={setObservacao} placeholder="Ex.: filho menor de idade" />
      <Button label="Enviar para aprovação" icon={Send} loading={executando} onPress={enviar} />
      {mensagem ? <Feedback type={mensagem.tipo}>{mensagem.texto}</Feedback> : null}
      <View style={{ height: 12 }} />
    </Sheet>
  );
}

// POST /unidades/minha/inquilinos
function NovoInquilinoSheet({ visible, onClose, onCadastrado }: { visible: boolean; onClose: () => void; onCadastrado: (texto: string) => void }) {
  const { mensagem, setMensagem, executando, executar } = useAcao();
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [inicio, setInicio] = useState(dataLocal());
  const [fim, setFim] = useState('');

  const cadastrar = async () => {
    const formato = /^\d{4}-\d{2}-\d{2}$/;
    if (!formato.test(inicio) || (fim && !formato.test(fim))) {
      setMensagem({ tipo: 'warning', texto: 'Datas no formato AAAA-MM-DD.' });
      return;
    }
    const r = await executar(() =>
      cadastrarInquilino({ nome: nome.trim(), cpf: cpf.trim(), email: email.trim() || undefined, telefone: telefone.trim() || undefined, contratoInicio: inicio, contratoFim: fim || undefined }),
    );
    if (r.ok) {
      setNome('');
      setCpf('');
      setEmail('');
      setTelefone('');
      setFim('');
      onCadastrado(`${r.resultado.pessoa.nome} cadastrado(a) como inquilino(a). Convite de acesso enviado por e-mail.`);
    }
  };

  return (
    <Sheet visible={visible} title="Cadastrar inquilino" onClose={() => { setMensagem(null); onClose(); }}>
      <Input label="Nome" value={nome} onChangeText={setNome} autoCapitalize="words" />
      <Input label="CPF" value={cpf} onChangeText={setCpf} keyboardType="number-pad" placeholder="Somente números" />
      <Input label="E-mail (recebe o convite)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Input label="Telefone (opcional)" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
      <Input label="Início do contrato" value={inicio} onChangeText={setInicio} placeholder="AAAA-MM-DD" autoCapitalize="none" />
      <Input label="Fim do contrato (opcional)" value={fim} onChangeText={setFim} placeholder="AAAA-MM-DD" autoCapitalize="none" />
      <Button label="Cadastrar e enviar convite" icon={UserPlus} loading={executando} onPress={cadastrar} />
      {mensagem ? <Feedback type={mensagem.tipo}>{mensagem.texto}</Feedback> : null}
      <View style={{ height: 12 }} />
    </Sheet>
  );
}
