import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BellRing, DoorOpen, Plus, ShieldAlert, UserRound } from 'lucide-react-native';
import {
  Button,
  Card,
  Chips,
  colors,
  Confirm,
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
import { useAcao, usePaged, useRecarregarAoFocar } from '@/hooks/useApi';
import { listarAutorizacoes, registrarAcesso, registrarVisitante, reenviarAutorizacao } from '@/lib/api/endpoints/portaria';
import type { Acesso, AutorizacaoVisita, StatusAutorizacaoVisita } from '@/lib/api/types';
import { dataHora, STATUS_AUTORIZACAO } from '@/lib/format';
import { comumStyles, useNomeCondominio } from '@/telas/comum';
import { ListaAcessos } from './HistoricoAcessos';

type Filtro = 'todas' | StatusAutorizacaoVisita;

// UC11 — Gerenciar Portaria (porteiro): anunciar visitante, acompanhar a resposta do morador,
// reenviar notificação e registrar entrada/saída (REQ013).
export default function PortariaOperacao() {
  const tema = useTema();
  const nomeCondominio = useNomeCondominio();
  const [filtro, setFiltro] = useState<Filtro>('pendente');
  const [novo, setNovo] = useState(false);
  const [entradaManual, setEntradaManual] = useState<AutorizacaoVisita | null>(null);
  const [versaoAcessos, setVersaoAcessos] = useState(0);
  const { mensagem, setMensagem, executando, executar } = useAcao();
  const fila = usePaged((page) => listarAutorizacoes({ page, size: 10, status: filtro === 'todas' ? undefined : filtro }), [filtro]);
  useRecarregarAoFocar(fila.reload);

  const atualizarTudo = () => {
    fila.reload();
    setVersaoAcessos((v) => v + 1);
  };

  const reenviar = async (a: AutorizacaoVisita) => {
    await executar(() => reenviarAutorizacao(a.id), `Notificação reenviada para a unidade ${a.unidadeId}.`);
    fila.reload();
  };

  const entrada = async (a: AutorizacaoVisita, comAutorizacao: boolean) => {
    const r = await executar(
      () => registrarAcesso({ visitanteId: a.visitante.id, autorizacaoId: comAutorizacao ? a.id : undefined, tipo: 'entrada' }),
      `Entrada de ${a.visitante.nome} registrada.`,
    );
    setEntradaManual(null);
    if (r.ok) atualizarTudo();
  };

  const saida = async (acesso: Acesso) => {
    const r = await executar(() => registrarAcesso({ visitanteId: acesso.visitante.id, tipo: 'saida' }), `Saída de ${acesso.visitante.nome} registrada.`);
    if (r.ok) setVersaoAcessos((v) => v + 1);
  };

  return (
    <Screen onRefresh={atualizarTudo} refreshing={fila.loading && fila.itens.length > 0}>
      <TopBar eyebrow={`${nomeCondominio} · guarita`} title="Portaria" action={<Button label="Novo visitante" icon={Plus} small onPress={() => setNovo(true)} />} />
      {mensagem ? <Feedback type={mensagem.tipo} onClose={() => setMensagem(null)}>{mensagem.texto}</Feedback> : null}

      <Section title="Fila de autorizações">
        <View style={{ marginBottom: 12 }}>
          <Chips
            scroll
            value={filtro}
            onChange={setFiltro}
            options={[
              { value: 'pendente', label: 'Aguardando morador' },
              { value: 'autorizada', label: 'Autorizadas' },
              { value: 'expirada', label: 'Expiradas' },
              { value: 'recusada', label: 'Recusadas' },
              { value: 'todas', label: 'Todas' },
            ]}
          />
        </View>
        <QueryState loading={fila.loading} error={fila.error} empty={!fila.itens.length} onRetry={fila.reload} emptyTitle="Fila vazia" emptyDescription="Use “Novo visitante” para anunciar alguém a uma unidade." />
        {fila.itens.map((a) => {
          const status = STATUS_AUTORIZACAO[a.status];
          return (
            <Card key={a.id} style={styles.item}>
              <View style={comumStyles.row}>
                <View style={[comumStyles.itemIcon, { backgroundColor: tema.primariaSoft }]}>
                  <UserRound size={18} color={tema.primaria} />
                </View>
                <View style={comumStyles.itemCopy}>
                  <Text style={comumStyles.itemTitle}>{a.visitante.nome}</Text>
                  <Text style={comumStyles.itemDetail}>Unidade {a.unidadeId} · {a.motivo} · {dataHora(a.solicitadoEm)}</Text>
                </View>
                <StatusPill label={status.rotulo} tone={status.tom} />
              </View>
              {a.status === 'pendente' ? (
                <View style={comumStyles.actions}>
                  <Button label="Reenviar notificação" icon={BellRing} variant="outline" small loading={executando} onPress={() => reenviar(a)} />
                </View>
              ) : a.status === 'autorizada' ? (
                <View style={comumStyles.actions}>
                  <Button label="Registrar entrada" icon={DoorOpen} small loading={executando} onPress={() => entrada(a, true)} />
                </View>
              ) : a.status === 'expirada' ? (
                <View style={comumStyles.actions}>
                  <Button label="Decidir na portaria" icon={ShieldAlert} variant="outline" small onPress={() => setEntradaManual(a)} />
                </View>
              ) : (
                <Text style={[comumStyles.itemDetail, { color: colors.red }]}>Entrada recusada pelo morador.</Text>
              )}
            </Card>
          );
        })}
        <LoadMore hasMore={fila.hasMore} loading={fila.loading} onPress={fila.loadMore} />
      </Section>

      <Section title="Entradas e saídas">
        <ListaAcessos versao={versaoAcessos} onRegistrarSaida={saida} />
      </Section>

      <NovoVisitanteSheet visible={novo} onClose={() => setNovo(false)} onCriado={(a) => { setNovo(false); setFiltro('pendente'); fila.reload(); setMensagem({ tipo: 'success', texto: `${a.visitante.nome} anunciado(a). Os moradores da unidade ${a.unidadeId} foram notificados.` }); }} />

      <Confirm
        visible={!!entradaManual}
        title="Liberar entrada manualmente?"
        message={`O morador não respondeu a tempo. Confirme com a unidade ${entradaManual?.unidadeId} antes de liberar ${entradaManual?.visitante.nome}.`}
        confirmLabel="Liberar entrada"
        loading={executando}
        onCancel={() => setEntradaManual(null)}
        onConfirm={() => entradaManual && entrada(entradaManual, false)}
      />
    </Screen>
  );
}

const MOTIVOS = ['Visita', 'Prestador de serviço', 'Entrega', 'Outro'];

// POST /portaria/visitantes
function NovoVisitanteSheet({ visible, onClose, onCriado }: { visible: boolean; onClose: () => void; onCriado: (a: AutorizacaoVisita) => void }) {
  const { mensagem, setMensagem, executando, executar } = useAcao();
  const [unidade, setUnidade] = useState('');
  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [motivo, setMotivo] = useState('Visita');
  const [motivoOutro, setMotivoOutro] = useState('');

  const limpar = () => {
    setUnidade('');
    setNome('');
    setDocumento('');
    setTelefone('');
    setMotivo('Visita');
    setMotivoOutro('');
    setMensagem(null);
  };

  const enviar = async () => {
    const unidadeId = Number(unidade);
    if (!Number.isInteger(unidadeId) || unidadeId <= 0) {
      setMensagem({ tipo: 'warning', texto: 'Informe o número (id) da unidade.' });
      return;
    }
    const r = await executar(() =>
      registrarVisitante({
        unidadeId,
        visitante: { nome: nome.trim(), documento: documento.trim() || undefined, telefone: telefone.trim() || undefined },
        motivo: motivo === 'Outro' ? motivoOutro.trim() : motivo,
      }),
    );
    if (r.ok) {
      limpar();
      onCriado(r.resultado);
    }
  };

  return (
    <Sheet visible={visible} title="Anunciar visitante" onClose={() => { limpar(); onClose(); }}>
      <Input label="Unidade (id)" value={unidade} onChangeText={setUnidade} keyboardType="number-pad" placeholder="Ex.: 1" hint="O contrato não oferece busca de unidades para a portaria; informe o id da unidade." />
      <Input label="Nome do visitante" value={nome} onChangeText={setNome} placeholder="Nome completo" autoCapitalize="words" />
      <Input label="Documento (opcional)" value={documento} onChangeText={setDocumento} placeholder="RG ou CPF" />
      <Input label="Telefone (opcional)" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
      <Text style={comumStyles.label}>Motivo</Text>
      <View style={{ marginBottom: 14 }}>
        <Chips options={MOTIVOS.map((m) => ({ value: m, label: m }))} value={motivo} onChange={setMotivo} />
      </View>
      {motivo === 'Outro' ? <Input label="Descreva o motivo" value={motivoOutro} onChangeText={setMotivoOutro} /> : null}
      <Button label="Notificar morador" icon={BellRing} loading={executando} onPress={enviar} />
      {mensagem ? <Feedback type={mensagem.tipo}>{mensagem.texto}</Feedback> : null}
      <View style={{ height: 12 }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  item: { marginBottom: 10 },
});
