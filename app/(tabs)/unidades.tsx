import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Building2, Check, Search, X } from 'lucide-react-native';
import {
  Button,
  Card,
  DetailRow,
  Feedback,
  Input,
  ModuloDesativado,
  QueryState,
  Screen,
  Section,
  StatusPill,
  TopBar,
} from '@/components/morah-ui';
import { useAuth } from '@/contexts/AuthContext';
import { useCondominio, useTema } from '@/contexts/CondominioContext';
import { useAcao, useApi } from '@/hooks/useApi';
import { decidirSolicitacaoVinculo, getUnidade, listarSolicitacoesVinculo } from '@/lib/api/endpoints/unidades';
import type { DecisaoSolicitacaoVinculo, SolicitacaoVinculo } from '@/lib/api/types';
import { dataHora, ROTULO_VINCULO } from '@/lib/format';
import { comumStyles, useNomeCondominio } from '@/telas/comum';

// UC10/UC30 (parcial, conforme o contrato) — síndico consulta unidades e decide solicitações de vínculo.
export default function UnidadesScreen() {
  const { moduloAtivo } = useCondominio();
  const { perfil } = useAuth();
  if (!moduloAtivo('minha_unidade')) return <ModuloDesativado nome="Minha Unidade" />;
  if (perfil !== 'sindico') {
    return (
      <Screen>
        <TopBar eyebrow="Unidades" title="Indisponível" onBack={() => router.back()} />
        <Section>
          <QueryState loading={false} error="Somente o síndico acessa a gestão de unidades." empty />
        </Section>
      </Screen>
    );
  }
  return <Unidades />;
}

function Unidades() {
  const tema = useTema();
  const nomeCondominio = useNomeCondominio();
  const [texto, setTexto] = useState('1');
  const [unidadeId, setUnidadeId] = useState<number | null>(1);
  const [justificativa, setJustificativa] = useState('');
  const { mensagem, setMensagem, executando, executar } = useAcao();
  const unidade = useApi(() => (unidadeId ? getUnidade(unidadeId) : Promise.resolve(null)), [unidadeId]);
  const solicitacoes = useApi(() => (unidadeId ? listarSolicitacoesVinculo(unidadeId) : Promise.resolve([])), [unidadeId]);

  const buscar = () => {
    const id = Number(texto);
    setMensagem(null);
    setUnidadeId(Number.isInteger(id) && id > 0 ? id : null);
  };

  const decidir = async (s: SolicitacaoVinculo, decisao: DecisaoSolicitacaoVinculo) => {
    const r = await executar(
      () => decidirSolicitacaoVinculo(s.unidadeId, s.id, { decisao, justificativa: justificativa.trim() || undefined }),
      `Solicitação de ${s.nomeSolicitado} ${decisao === 'aprovada' ? 'aprovada: vínculo criado a partir de hoje' : 'rejeitada'}.`,
    );
    if (r.ok) setJustificativa('');
    solicitacoes.reload();
  };

  const u = unidade.data;

  return (
    <Screen onRefresh={() => { unidade.reload(); solicitacoes.reload(); }} refreshing={false}>
      <TopBar eyebrow={nomeCondominio} title="Unidades" onBack={() => router.back()} />
      {mensagem ? <Feedback type={mensagem.tipo} onClose={() => setMensagem(null)}>{mensagem.texto}</Feedback> : null}

      <Section title="Consultar unidade">
        <Card>
          <Input label="Id da unidade" value={texto} onChangeText={setTexto} keyboardType="number-pad" hint="O contrato não tem listagem de unidades; consulte pelo id (seed: 1 = Apto 302, 2 = Apto 502)." />
          <Button label="Buscar" icon={Search} variant="outline" small onPress={buscar} style={{ alignSelf: 'flex-start' }} />
        </Card>
      </Section>

      {unidadeId ? (
        <Section title="Dados">
          <QueryState loading={unidade.loading} error={unidade.error} empty={!u} onRetry={unidade.reload} />
          {u ? (
            <Card>
              <View style={[comumStyles.row, { marginBottom: 8 }]}>
                <View style={[comumStyles.itemIcon, { backgroundColor: tema.primariaSoft }]}>
                  <Building2 size={18} color={tema.primaria} />
                </View>
                <Text style={comumStyles.itemTitle}>{u.identificacao} · {u.blocoNome}</Text>
              </View>
              <DetailRow label="Tipo" value={u.tipo ?? '—'} />
              <DetailRow label="Situação" value={u.status ?? '—'} />
              <DetailRow label="Área" value={u.areaM2 ? `${u.areaM2} m²` : '—'} />
              <DetailRow label="Fração ideal" value={u.fracaoIdeal != null ? u.fracaoIdeal.toLocaleString('pt-BR') : '—'} />
            </Card>
          ) : null}
        </Section>
      ) : null}

      {unidadeId && u ? (
        <Section title="Solicitações de vínculo pendentes">
          <QueryState loading={solicitacoes.loading} error={solicitacoes.error} empty={!solicitacoes.data?.length} onRetry={solicitacoes.reload} emptyTitle="Sem pendências" emptyDescription="Nenhuma solicitação aguardando aprovação nesta unidade." />
          {solicitacoes.data?.length ? (
            <Input label="Justificativa (opcional, vale para a próxima decisão)" value={justificativa} onChangeText={setJustificativa} />
          ) : null}
          {(solicitacoes.data ?? []).map((s) => (
            <Card key={s.id} style={{ marginBottom: 10 }}>
              <View style={comumStyles.rowBetween}>
                <View style={comumStyles.itemCopy}>
                  <Text style={comumStyles.itemTitle}>{s.nomeSolicitado}</Text>
                  <Text style={comumStyles.itemDetail}>{ROTULO_VINCULO[s.tipoVinculo]} · solicitado {dataHora(s.solicitadoEm).toLowerCase()}</Text>
                </View>
                <StatusPill label="Pendente" tone="orange" />
              </View>
              <View style={comumStyles.actions}>
                <Button label="Rejeitar" icon={X} variant="danger" small loading={executando} onPress={() => decidir(s, 'rejeitada')} />
                <Button label="Aprovar" icon={Check} small loading={executando} onPress={() => decidir(s, 'aprovada')} />
              </View>
            </Card>
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}
