import { ReactNode, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, XCircle } from 'lucide-react-native';
import {
  Button,
  Card,
  Chips,
  colors,
  Confirm,
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
  cancelarReserva,
  criarReserva,
  getDisponibilidadeAreaComum,
  getReserva,
  listarAreasComuns,
  listarReservas,
  registrarVistoriaReserva,
} from '@/lib/api/endpoints/reservas';
import type { AreaComum, HorarioDisponivel, MomentoVistoria, Reserva } from '@/lib/api/types';
import { data as formatarData, dataCurta, dataLocal, hora, moeda, STATUS_RESERVA } from '@/lib/format';
import { comumStyles, useNomeCondominio } from '@/telas/comum';

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function proximosDias(qtd: number) {
  return Array.from({ length: qtd }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return { valor: dataLocal(d), rotulo: i === 0 ? 'Hoje' : `${DIAS_SEMANA[d.getDay()]} ${d.getDate()}` };
  });
}

function deslocarDia(dia: string, dias: number) {
  const [a, m, d] = dia.split('-').map(Number);
  return dataLocal(new Date(a, m - 1, d + dias));
}

// UC04 (morador), UC13 (porteiro) — Reservas de áreas comuns.
export default function ReservasScreen() {
  const { perfil } = useAuth();
  const { moduloAtivo } = useCondominio();
  if (!moduloAtivo('reservas')) return <ModuloDesativado nome="Reservas" />;
  if (perfil === 'portaria') return <ReservasPortaria />;
  if (perfil === 'sindico') return <ReservasSindico />;
  return <ReservasMorador />;
}

// ------------------------------------------------------------------ morador / proprietário

function ReservasMorador() {
  const nomeCondominio = useNomeCondominio();
  const tema = useTema();
  const [area, setArea] = useState<AreaComum | null>(null);
  const [cancelando, setCancelando] = useState<Reserva | null>(null);
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const { mensagem, setMensagem, executando, executar } = useAcao();
  const areas = useApi(listarAreasComuns);
  const minhas = usePaged((page) => listarReservas({ page, size: 10 }));
  useRecarregarAoFocar(minhas.reload);

  const cancelar = async () => {
    if (!cancelando) return;
    await executar(() => cancelarReserva(cancelando.id), 'Reserva cancelada e horário liberado.');
    setCancelando(null);
    minhas.reload();
  };

  const futuras = minhas.itens;

  return (
    <Screen onRefresh={() => { areas.reload(); minhas.reload(); }} refreshing={minhas.loading && minhas.itens.length > 0}>
      <TopBar eyebrow={nomeCondominio} title="Reservas" />
      {mensagem ? <Feedback type={mensagem.tipo} onClose={() => setMensagem(null)}>{mensagem.texto}</Feedback> : null}

      <Section title="Áreas comuns">
        <QueryState loading={areas.loading} error={areas.error} empty={!areas.data?.length} onRetry={areas.reload} emptyTitle="Nenhuma área comum" />
        <View style={styles.areas}>
          {(areas.data ?? []).map((a) => (
            <Card key={a.id} style={styles.area} onPress={() => setArea(a)}>
              <View style={[comumStyles.itemIcon, { backgroundColor: tema.primariaSoft, marginBottom: 12 }]}>
                <CalendarDays size={18} color={tema.primaria} />
              </View>
              <Text style={comumStyles.itemTitle}>{a.nome}</Text>
              <Text style={comumStyles.itemDetail} numberOfLines={2}>{a.descricao}</Text>
              <View style={[comumStyles.rowBetween, { marginTop: 12 }]}>
                <Text style={styles.areaMeta}>Até {a.capacidade} pessoas</Text>
                <Text style={[styles.areaMeta, { color: colors.ink, fontWeight: '700' }]}>{a.taxa ? moeda(a.taxa) : 'Sem taxa'}</Text>
              </View>
              <Button label="Ver horários" variant="outline" small onPress={() => setArea(a)} style={{ marginTop: 12 }} />
            </Card>
          ))}
        </View>
      </Section>

      <Section title="Minhas reservas">
        <QueryState loading={minhas.loading} error={minhas.error} empty={!futuras.length} onRetry={minhas.reload} emptyTitle="Nenhuma reserva" emptyDescription="Escolha uma área comum acima para reservar um horário." />
        {futuras.map((r) => (
          <Card key={r.id} style={comumStyles.listItem} onPress={() => setDetalheId(r.id)}>
            <View style={[comumStyles.itemIcon, { backgroundColor: tema.primariaSoft }]}>
              <CalendarCheck size={18} color={tema.primaria} />
            </View>
            <View style={comumStyles.itemCopy}>
              <Text style={comumStyles.itemTitle}>{r.areaComumNome}</Text>
              <Text style={comumStyles.itemDetail}>{formatarData(r.inicio)} · {hora(r.inicio)}–{hora(r.fim)}{r.valor ? ` · ${moeda(r.valor)}` : ''}</Text>
            </View>
            {r.status === 'confirmada' && new Date(r.inicio).getTime() > Date.now() ? (
              <Button label="Cancelar" icon={XCircle} variant="danger" small onPress={() => setCancelando(r)} />
            ) : (
              <StatusPill label={STATUS_RESERVA[r.status].rotulo} tone={STATUS_RESERVA[r.status].tom} />
            )}
          </Card>
        ))}
        <LoadMore hasMore={minhas.hasMore} loading={minhas.loading} onPress={minhas.loadMore} />
      </Section>

      <NovaReservaSheet
        area={area}
        onClose={() => setArea(null)}
        onReservado={(r) => {
          setArea(null);
          setMensagem({ tipo: 'success', texto: `Reserva confirmada: ${r.areaComumNome}, ${formatarData(r.inicio)} das ${hora(r.inicio)} às ${hora(r.fim)}.` });
          minhas.reload();
        }}
      />
      <DetalheReserva reservaId={detalheId} onClose={() => setDetalheId(null)} />
      <Confirm
        visible={!!cancelando}
        title="Cancelar reserva?"
        message={`${cancelando?.areaComumNome} em ${formatarData(cancelando?.inicio)} das ${hora(cancelando?.inicio)} às ${hora(cancelando?.fim)}. O horário será liberado para outros moradores.`}
        confirmLabel="Cancelar reserva"
        danger
        loading={executando}
        onCancel={() => setCancelando(null)}
        onConfirm={cancelar}
      />
    </Screen>
  );
}

// GET /areas-comuns/{id}/disponibilidade + POST /reservas
function NovaReservaSheet({ area, onClose, onReservado }: { area: AreaComum | null; onClose: () => void; onReservado: (r: Reserva) => void }) {
  const tema = useTema();
  const dias = proximosDias(14);
  const [dia, setDia] = useState(dias[0].valor);
  const [inicio, setInicio] = useState<number | null>(null);
  const [fim, setFim] = useState<number | null>(null);
  const { mensagem, setMensagem, executando, executar } = useAcao();
  const disp = useApi(() => (area ? getDisponibilidadeAreaComum(area.id, dia) : Promise.resolve(null)), [area?.id, dia]);
  const horarios = disp.data?.horarios ?? [];

  useEffect(() => {
    setInicio(null);
    setFim(null);
    setMensagem(null);
  }, [area?.id, dia, setMensagem]);

  // Seleção de um intervalo contínuo de horários livres: toque no primeiro e no último.
  const tocar = (i: number) => {
    if (!horarios[i].disponivel) return;
    if (inicio === null || fim !== null || i < inicio) {
      setInicio(i);
      setFim(null);
      return;
    }
    const livres = horarios.slice(inicio, i + 1).every((h) => h.disponivel);
    if (!livres) {
      setMensagem({ tipo: 'warning', texto: 'O intervalo escolhido passa por um horário ocupado.' });
      return;
    }
    setFim(i);
  };

  const selecionado = (i: number) => inicio !== null && (fim === null ? i === inicio : i >= inicio && i <= fim);
  const slotInicio: HorarioDisponivel | undefined = inicio !== null ? horarios[inicio] : undefined;
  const slotFim: HorarioDisponivel | undefined = inicio !== null ? horarios[fim ?? inicio] : undefined;

  const reservar = async () => {
    if (!area || !slotInicio || !slotFim) return;
    const r = await executar(() => criarReserva({ areaComumId: area.id, inicio: slotInicio.inicio, fim: slotFim.fim }));
    if (r.ok) onReservado(r.resultado);
    else disp.reload(); // 409: alguém reservou antes — atualiza a grade
  };

  return (
    <Sheet visible={!!area} title={area ? `Reservar ${area.nome}` : ''} onClose={onClose}>
      <Text style={comumStyles.label}>Dia</Text>
      <Chips scroll value={dia} onChange={setDia} options={dias.map((d) => ({ value: d.valor, label: d.rotulo }))} />
      <Text style={[comumStyles.label, { marginTop: 16 }]}>Horários (toque no início e no fim)</Text>
      <QueryState loading={disp.loading} error={disp.error} empty={!horarios.length} onRetry={disp.reload} />
      <View style={styles.slots}>
        {horarios.map((h, i) => {
          const sel = selecionado(i);
          return (
            <Pressable
              key={h.inicio}
              onPress={() => tocar(i)}
              disabled={!h.disponivel}
              style={[styles.slot, !h.disponivel && styles.slotOcupado, sel && { backgroundColor: tema.primaria, borderColor: tema.primaria }]}
            >
              <Text style={[styles.slotText, !h.disponivel && { color: '#A7B4B1' }, sel && { color: colors.white }]}>{hora(h.inicio)}</Text>
            </Pressable>
          );
        })}
      </View>
      {slotInicio && slotFim ? (
        <Card style={{ marginVertical: 12 }}>
          <Text style={comumStyles.itemTitle}>{formatarData(dia)} · {hora(slotInicio.inicio)} às {hora(slotFim.fim)}</Text>
          <Text style={comumStyles.itemDetail}>Taxa da área: {area?.taxa ? moeda(area.taxa) : 'sem taxa'}</Text>
        </Card>
      ) : null}
      <Button label="Confirmar reserva" icon={CalendarCheck} disabled={!slotInicio} loading={executando} onPress={reservar} />
      {mensagem ? <Feedback type={mensagem.tipo}>{mensagem.texto}</Feedback> : null}
      <View style={{ height: 12 }} />
    </Sheet>
  );
}

// GET /reservas/{id}
function DetalheReserva({ reservaId, onClose, children }: { reservaId: number | null; onClose: () => void; children?: (r: Reserva) => ReactNode }) {
  const detalhe = useApi(() => (reservaId ? getReserva(reservaId) : Promise.resolve(null)), [reservaId]);
  const r = detalhe.data;
  return (
    <Sheet visible={reservaId !== null} title={r?.areaComumNome ?? 'Reserva'} onClose={onClose}>
      <QueryState loading={detalhe.loading} error={detalhe.error} empty={!r} onRetry={detalhe.reload} />
      {r ? (
        <>
          <DetailRow label="Data" value={formatarData(r.inicio)} />
          <DetailRow label="Horário" value={`${hora(r.inicio)} às ${hora(r.fim)}`} />
          <DetailRow label="Unidade" value={String(r.unidadeId)} />
          <DetailRow label="Solicitante" value={r.solicitante.nome} />
          <DetailRow label="Valor" value={r.valor ? moeda(r.valor) : 'Sem taxa'} />
          <DetailRow label="Status" value={<StatusPill label={STATUS_RESERVA[r.status].rotulo} tone={STATUS_RESERVA[r.status].tom} />} />
          {children ? children(r) : null}
        </>
      ) : null}
      <View style={{ height: 12 }} />
    </Sheet>
  );
}

// ------------------------------------------------------------------ portaria

function ReservasPortaria() {
  const nomeCondominio = useNomeCondominio();
  const params = useLocalSearchParams<{ data?: string }>();
  const [dia, setDia] = useState(params.data ?? dataLocal());
  const [vistoria, setVistoria] = useState<Reserva | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const reservas = usePaged((page) => listarReservas({ page, size: 20, data: dia }), [dia]);
  useRecarregarAoFocar(reservas.reload);

  return (
    <Screen onRefresh={reservas.reload} refreshing={reservas.loading && reservas.itens.length > 0}>
      <TopBar eyebrow={`${nomeCondominio} · guarita`} title="Reservas do dia" />
      {aviso ? <Feedback type="success" onClose={() => setAviso(null)}>{aviso}</Feedback> : null}
      <Section>
        <View style={comumStyles.rowBetween}>
          <Button label="" icon={ChevronLeft} variant="outline" small onPress={() => setDia(deslocarDia(dia, -1))} />
          <Text style={comumStyles.itemTitle}>{dia === dataLocal() ? `Hoje · ${formatarData(dia)}` : formatarData(dia)}</Text>
          <Button label="" icon={ChevronRight} variant="outline" small onPress={() => setDia(deslocarDia(dia, 1))} />
        </View>
      </Section>
      <Section title="Reservas">
        <QueryState loading={reservas.loading} error={reservas.error} empty={!reservas.itens.length} onRetry={reservas.reload} emptyTitle="Nenhuma reserva" emptyDescription="Não há reservas para este dia." />
        {reservas.itens.map((r) => (
          <LinhaReserva key={r.id} reserva={r} acao={r.status === 'confirmada' ? <Button label="Vistoria" icon={ClipboardCheck} small onPress={() => setVistoria(r)} /> : undefined} />
        ))}
        <LoadMore hasMore={reservas.hasMore} loading={reservas.loading} onPress={reservas.loadMore} />
      </Section>
      <VistoriaSheet
        reserva={vistoria}
        onClose={() => setVistoria(null)}
        onRegistrada={(texto) => {
          setVistoria(null);
          setAviso(texto);
          reservas.reload();
        }}
      />
    </Screen>
  );
}

function LinhaReserva({ reserva: r, acao, onPress }: { reserva: Reserva; acao?: ReactNode; onPress?: () => void }) {
  const tema = useTema();
  return (
    <Card style={comumStyles.listItem} onPress={onPress}>
      <View style={styles.timeBox}>
        <Text style={[styles.time, { color: tema.primaria }]}>{hora(r.inicio)}</Text>
        <Text style={styles.timeEnd}>{hora(r.fim)}</Text>
      </View>
      <View style={comumStyles.itemCopy}>
        <Text style={comumStyles.itemTitle}>{r.areaComumNome}</Text>
        <Text style={comumStyles.itemDetail}>{dataCurta(r.inicio)} · unidade {r.unidadeId} · {r.solicitante.nome}</Text>
      </View>
      {acao ?? <StatusPill label={STATUS_RESERVA[r.status].rotulo} tone={STATUS_RESERVA[r.status].tom} />}
    </Card>
  );
}

// POST /reservas/{id}/vistoria — dano gera ocorrência; vistoria de saída conclui a reserva.
function VistoriaSheet({ reserva, onClose, onRegistrada }: { reserva: Reserva | null; onClose: () => void; onRegistrada: (texto: string) => void }) {
  const { mensagem, setMensagem, executando, executar } = useAcao();
  const [momento, setMomento] = useState<MomentoVistoria>('entrada');
  const [dano, setDano] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [foto, setFoto] = useState('');

  useEffect(() => {
    setMomento('entrada');
    setDano(false);
    setObservacao('');
    setFoto('');
    setMensagem(null);
  }, [reserva?.id, setMensagem]);

  const registrar = async () => {
    if (!reserva) return;
    const r = await executar(() =>
      registrarVistoriaReserva(reserva.id, { momento, dano, observacao: observacao.trim() || undefined, fotosUrl: foto.trim() ? [foto.trim()] : undefined }),
    );
    if (r.ok) {
      onRegistrada(
        `Vistoria de ${momento === 'saida' ? 'saída' : 'entrada'} registrada${dano ? ' e ocorrência aberta para o dano' : ''}${momento === 'saida' ? '. Reserva concluída.' : '.'}`,
      );
    }
  };

  return (
    <Sheet visible={!!reserva} title="Vistoria do espaço" onClose={onClose}>
      {reserva ? (
        <>
          <DetailRow label="Área" value={reserva.areaComumNome} />
          <DetailRow label="Horário" value={`${hora(reserva.inicio)} às ${hora(reserva.fim)}`} />
          <DetailRow label="Responsável" value={`${reserva.solicitante.nome} · unidade ${reserva.unidadeId}`} />
          <Text style={[comumStyles.label, { marginTop: 16 }]}>Momento</Text>
          <View style={{ marginBottom: 14 }}>
            <Chips value={momento} onChange={setMomento} options={[{ value: 'entrada', label: 'Entrada' }, { value: 'saida', label: 'Saída' }]} />
          </View>
          <View style={[comumStyles.rowBetween, { marginBottom: 14 }]}>
            <Text style={comumStyles.itemTitle}>Foi encontrado dano?</Text>
            <Switch value={dano} onValueChange={setDano} />
          </View>
          <Input label="Observação" value={observacao} onChangeText={setObservacao} multiline placeholder={dano ? 'Descreva o dano encontrado' : 'Checklist ok'} />
          <Input label="URL da foto (opcional)" value={foto} onChangeText={setFoto} autoCapitalize="none" keyboardType="url" />
          <Button label="Registrar vistoria" icon={ClipboardCheck} loading={executando} onPress={registrar} />
          {mensagem ? <Feedback type={mensagem.tipo}>{mensagem.texto}</Feedback> : null}
        </>
      ) : null}
      <View style={{ height: 12 }} />
    </Sheet>
  );
}

// ------------------------------------------------------------------ síndico (consulta)

function ReservasSindico() {
  const nomeCondominio = useNomeCondominio();
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const areas = useApi(listarAreasComuns);
  const reservas = usePaged((page) => listarReservas({ page, size: 10 }));
  useRecarregarAoFocar(reservas.reload);
  return (
    <Screen onRefresh={reservas.reload} refreshing={reservas.loading && reservas.itens.length > 0}>
      <TopBar eyebrow={nomeCondominio} title="Reservas" />
      <Section title="Áreas comuns">
        <QueryState loading={areas.loading} error={areas.error} empty={!areas.data?.length} onRetry={areas.reload} />
        {(areas.data ?? []).map((a) => (
          <Card key={a.id} style={comumStyles.listItem}>
            <View style={comumStyles.itemCopy}>
              <Text style={comumStyles.itemTitle}>{a.nome}</Text>
              <Text style={comumStyles.itemDetail}>Capacidade {a.capacidade} · taxa {moeda(a.taxa)} · {a.status}</Text>
            </View>
          </Card>
        ))}
      </Section>
      <Section title="Todas as reservas">
        <QueryState loading={reservas.loading} error={reservas.error} empty={!reservas.itens.length} onRetry={reservas.reload} emptyTitle="Nenhuma reserva" />
        {reservas.itens.map((r) => (
          <LinhaReserva key={r.id} reserva={r} onPress={() => setDetalheId(r.id)} />
        ))}
        <LoadMore hasMore={reservas.hasMore} loading={reservas.loading} onPress={reservas.loadMore} />
      </Section>
      <DetalheReserva reservaId={detalheId} onClose={() => setDetalheId(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  areas: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  area: { flexGrow: 1, flexBasis: 260 },
  areaMeta: { color: colors.muted, fontSize: 12 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  slot: { width: 66, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  slotOcupado: { backgroundColor: colors.soft, borderStyle: 'dashed' },
  slotText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  timeBox: { width: 48 },
  time: { fontSize: 13, fontWeight: '700' },
  timeEnd: { color: colors.muted, fontSize: 11, marginTop: 3 },
});
