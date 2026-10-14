import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarDays,
  FileText,
  Home,
  Megaphone,
  Package,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  WalletCards,
} from 'lucide-react-native';
import { Avatar, Card, colors, MetricCard, QueryState, Screen, Section, StatusPill, TopBar } from '@/components/morah-ui';
import { useAuth } from '@/contexts/AuthContext';
import { useCondominio, useTema } from '@/contexts/CondominioContext';
import { useApi, useRecarregarAoFocar } from '@/hooks/useApi';
import { getDashboard } from '@/lib/api/endpoints/home';
import type { DashboardMorador, DashboardPortaria, DashboardSindico } from '@/lib/api/types';
import { competencia, dataCurta, dataHora, hora, iniciais, moeda, rotuloCategoria, ROTULO_PERFIL, STATUS_COBRANCA } from '@/lib/format';
import { AcoesRapidas, comumStyles, NotificacoesBell, useNomeCondominio } from '@/telas/comum';

// Tela Inicial — GET /home/dashboard. O formato da resposta varia pelo campo `perfil`.

export default function HomeScreen() {
  const { me } = useAuth();
  const nomeCondominio = useNomeCondominio();
  const { data, loading, error, reload } = useApi(getDashboard);
  useRecarregarAoFocar(reload);
  const primeiroNome = me?.pessoa.nome.split(' ')[0] ?? '';

  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <TopBar
        eyebrow={nomeCondominio}
        title={`Olá, ${primeiroNome}`}
        action={
          <View style={styles.topActions}>
            <NotificacoesBell />
            <Avatar initials={iniciais(me?.pessoa.nome)} />
          </View>
        }
      />
      {!data ? (
        <Section>
          <QueryState loading={loading} error={error} empty onRetry={reload} />
        </Section>
      ) : data.perfil === 'sindico' ? (
        <InicioSindico dash={data} />
      ) : data.perfil === 'portaria' ? (
        <InicioPortaria dash={data} />
      ) : (
        <InicioMorador dash={data} />
      )}
    </Screen>
  );
}

function Hero({ kicker, title, text }: { kicker: string; title: string; text: string }) {
  const tema = useTema();
  return (
    <Section>
      <View style={[styles.hero, { backgroundColor: tema.primariaEscura }]}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroKicker}>{kicker}</Text>
          <Text style={styles.heroTitle}>{title}</Text>
          <Text style={styles.heroText}>{text}</Text>
        </View>
        <View style={[styles.heroMark, { backgroundColor: tema.primaria }]}>
          <Home size={28} color={colors.white} strokeWidth={1.7} />
        </View>
      </View>
    </Section>
  );
}

// ------------------------------------------------------------------ morador / proprietário

function InicioMorador({ dash }: { dash: DashboardMorador }) {
  const tema = useTema();
  const { moduloAtivo } = useCondominio();
  const proximo = dash.proximosBoletos[0];
  const avisosNaoLidos = dash.avisosRecentes.filter((a) => !a.lidoPeloUsuario).length;

  return (
    <>
      <Hero
        kicker={`${ROTULO_PERFIL[dash.perfil]} · ${dash.unidade ? `${dash.unidade.identificacao}, ${dash.unidade.blocoNome}` : ''}`}
        title="A vida no seu condomínio, mais simples."
        text="Acompanhe sua unidade, pagamentos e tudo o que acontece por aqui."
      />

      <Section>
        <View style={comumStyles.metrics}>
          {moduloAtivo('financeiro') ? (
            <MetricCard icon={WalletCards} label="Próximo boleto" value={proximo ? moeda(proximo.valorTotal) : 'Em dia'} caption={proximo ? `Vence em ${dataCurta(proximo.vencimento)}` : 'Nenhuma cobrança em aberto'} tone={proximo?.status === 'atrasado' ? 'red' : 'teal'} onPress={() => router.push('/financeiro')} />
          ) : null}
          {moduloAtivo('encomendas') ? (
            <MetricCard icon={Package} label="Encomendas" value={String(dash.encomendasPendentes.length).padStart(2, '0')} caption="Aguardando retirada" tone="orange" onPress={() => router.push('/encomendas')} />
          ) : null}
          {moduloAtivo('avisos') ? (
            <MetricCard icon={Bell} label="Avisos novos" value={String(avisosNaoLidos).padStart(2, '0')} caption="Ainda não lidos" tone="blue" onPress={() => router.push('/avisos')} />
          ) : null}
        </View>
      </Section>

      {dash.autorizacoesPendentes.length ? (
        <Section title="Visitantes aguardando você" action="Responder" onAction={() => router.push('/portaria')}>
          {dash.autorizacoesPendentes.map((a) => (
            <Card key={a.id} style={comumStyles.listItem} onPress={() => router.push('/portaria')}>
              <View style={[comumStyles.itemIcon, { backgroundColor: colors.orangeSoft }]}>
                <ShieldCheck size={18} color={colors.orange} />
              </View>
              <View style={comumStyles.itemCopy}>
                <Text style={comumStyles.itemTitle}>{a.visitante.nome}</Text>
                <Text style={comumStyles.itemDetail}>{a.motivo} · {dataHora(a.solicitadoEm)}</Text>
              </View>
              <StatusPill label="Pendente" tone="orange" />
            </Card>
          ))}
        </Section>
      ) : null}

      <Section title="Acesso rápido">
        <AcoesRapidas
          acoes={[
            { label: 'Pagar condomínio', icon: WalletCards, href: '/financeiro', visivel: moduloAtivo('financeiro') },
            { label: 'Autorizar visitante', icon: ShieldCheck, href: '/portaria', visivel: moduloAtivo('portaria') },
            { label: 'Reservar espaço', icon: CalendarDays, href: '/reservas', visivel: moduloAtivo('reservas') },
            { label: 'Ver encomendas', icon: Package, href: '/encomendas', visivel: moduloAtivo('encomendas') },
            { label: 'Minha unidade', icon: Building2, href: '/unidade', visivel: moduloAtivo('minha_unidade') },
          ]}
        />
      </Section>

      {moduloAtivo('financeiro') ? (
        <Section title="Próximos boletos" action="Ver tudo" onAction={() => router.push('/financeiro')}>
          {dash.proximosBoletos.length ? (
            dash.proximosBoletos.map((c) => (
              <Card key={c.id} style={comumStyles.listItem} onPress={() => router.push('/financeiro')}>
                <View style={[comumStyles.itemIcon, { backgroundColor: tema.primariaSoft }]}>
                  <WalletCards size={18} color={tema.primaria} />
                </View>
                <View style={comumStyles.itemCopy}>
                  <Text style={comumStyles.itemTitle}>{c.taxaDescricao}</Text>
                  <Text style={comumStyles.itemDetail}>{competencia(c.competencia)} · vence {dataCurta(c.vencimento)}</Text>
                </View>
                <View style={comumStyles.itemRight}>
                  <Text style={comumStyles.itemValue}>{moeda(c.valorTotal)}</Text>
                  <StatusPill label={STATUS_COBRANCA[c.status].rotulo} tone={STATUS_COBRANCA[c.status].tom} />
                </View>
              </Card>
            ))
          ) : (
            <Card><Text style={comumStyles.paragraph}>Nenhuma cobrança em aberto. Tudo em dia!</Text></Card>
          )}
        </Section>
      ) : null}

      {moduloAtivo('avisos') && dash.avisosRecentes.length ? (
        <Section title="Últimos avisos" action="Ver mural" onAction={() => router.push('/avisos')}>
          <Card>
            {dash.avisosRecentes.map((a, i) => (
              <View key={a.id} style={[styles.noticeRow, i === dash.avisosRecentes.length - 1 && { marginBottom: 0 }]}>
                <View style={[comumStyles.itemIcon, { backgroundColor: a.prioridade === 'urgente' ? colors.orangeSoft : tema.primariaSoft }]}>
                  {a.prioridade === 'urgente' ? <Megaphone size={17} color={colors.orange} /> : <FileText size={17} color={tema.primaria} />}
                </View>
                <View style={comumStyles.itemCopy}>
                  <Text style={comumStyles.itemTitle}>{a.titulo}</Text>
                  <Text style={comumStyles.itemDetail}>{dataHora(a.publicadoEm)} · {rotuloCategoria(a.categoria)}</Text>
                </View>
                {!a.lidoPeloUsuario ? <StatusPill label="Novo" /> : null}
              </View>
            ))}
          </Card>
        </Section>
      ) : null}

      {moduloAtivo('reservas') && dash.proximasReservas.length ? (
        <Section title="Suas próximas reservas" action="Reservas" onAction={() => router.push('/reservas')}>
          {dash.proximasReservas.map((r) => (
            <Card key={r.id} style={comumStyles.listItem}>
              <View style={[comumStyles.itemIcon, { backgroundColor: tema.primariaSoft }]}>
                <CalendarDays size={18} color={tema.primaria} />
              </View>
              <View style={comumStyles.itemCopy}>
                <Text style={comumStyles.itemTitle}>{r.areaComumNome}</Text>
                <Text style={comumStyles.itemDetail}>{dataCurta(r.inicio)} · {hora(r.inicio)}–{hora(r.fim)}</Text>
              </View>
            </Card>
          ))}
        </Section>
      ) : null}
    </>
  );
}

// ------------------------------------------------------------------ síndico

function InicioSindico({ dash }: { dash: DashboardSindico }) {
  const { moduloAtivo } = useCondominio();
  const tema = useTema();
  const inad = dash.inadimplencia;
  return (
    <>
      <Hero kicker="Painel do síndico" title="Gestão do condomínio em dia." text="Inadimplência, comunicados, vínculos e módulos do seu condomínio." />
      <Section>
        <View style={comumStyles.metrics}>
          {inad ? (
            <>
              <MetricCard icon={AlertTriangle} label="Inadimplência" value={`${inad.percentualInadimplencia.toLocaleString('pt-BR')}%`} caption={`${inad.unidadesInadimplentes} de ${inad.totalUnidades} unidades`} tone="red" onPress={() => router.push('/financeiro')} />
              <MetricCard icon={WalletCards} label="Em aberto" value={moeda(inad.valorTotalEmAberto)} caption="Pendentes + atrasadas" tone="orange" onPress={() => router.push('/financeiro')} />
            </>
          ) : null}
          <MetricCard icon={Users} label="Solicitações de vínculo" value={String(dash.solicitacoesVinculoPendentes).padStart(2, '0')} caption="Aguardando aprovação" tone="blue" onPress={() => router.push('/unidades')} />
          <MetricCard icon={AlertTriangle} label="Ocorrências abertas" value={String(dash.ocorrenciasAbertas).padStart(2, '0')} caption="Vistorias e extravios" />
        </View>
      </Section>
      <Section title="Acesso rápido">
        <AcoesRapidas
          acoes={[
            { label: 'Gerar cobranças', icon: WalletCards, href: '/financeiro', visivel: moduloAtivo('financeiro') },
            { label: 'Publicar aviso', icon: Megaphone, href: '/avisos', visivel: moduloAtivo('avisos') },
            { label: 'Unidades e vínculos', icon: UserPlus, href: '/unidades', visivel: moduloAtivo('minha_unidade') },
            { label: 'Módulos e identidade', icon: Settings, href: '/configuracoes' },
          ]}
        />
      </Section>
      {moduloAtivo('avisos') ? (
        <Section title="Avisos publicados recentemente" action="Gerenciar" onAction={() => router.push('/avisos')}>
          {dash.avisosPublicadosRecentes.length ? (
            dash.avisosPublicadosRecentes.map((a) => (
              <Card key={a.id} style={comumStyles.listItem}>
                <View style={[comumStyles.itemIcon, { backgroundColor: tema.primariaSoft }]}>
                  <Megaphone size={17} color={tema.primaria} />
                </View>
                <View style={comumStyles.itemCopy}>
                  <Text style={comumStyles.itemTitle}>{a.titulo}</Text>
                  <Text style={comumStyles.itemDetail}>{dataHora(a.publicadoEm)} · {rotuloCategoria(a.categoria)}</Text>
                </View>
                {a.prioridade === 'urgente' ? <StatusPill label="Urgente" tone="orange" /> : null}
              </Card>
            ))
          ) : (
            <Card><Text style={comumStyles.paragraph}>Nenhum aviso vigente.</Text></Card>
          )}
        </Section>
      ) : null}
    </>
  );
}

// ------------------------------------------------------------------ portaria

function InicioPortaria({ dash }: { dash: DashboardPortaria }) {
  const { moduloAtivo } = useCondominio();
  const tema = useTema();
  return (
    <>
      <Section>
        <View style={comumStyles.metrics}>
          <MetricCard icon={ShieldCheck} label="Autorizações pendentes" value={String(dash.autorizacoesPendentes.length).padStart(2, '0')} caption="Aguardando morador" tone="orange" onPress={() => router.push('/portaria')} />
          <MetricCard icon={CalendarDays} label="Reservas do dia" value={String(dash.reservasDoDia.length).padStart(2, '0')} caption="Vistorias a fazer" onPress={() => router.push('/reservas')} />
          <MetricCard icon={Package} label="Encomendas hoje" value={String(dash.encomendasRecebidasHoje).padStart(2, '0')} caption="Recebidas na portaria" tone="blue" onPress={() => router.push('/encomendas')} />
        </View>
      </Section>
      <Section title="Acesso rápido">
        <AcoesRapidas
          acoes={[
            { label: 'Registrar visitante', icon: ShieldCheck, href: '/portaria', visivel: moduloAtivo('portaria') },
            { label: 'Receber encomenda', icon: Package, href: '/encomendas', visivel: moduloAtivo('encomendas') },
            { label: 'Vistoria de reservas', icon: CalendarDays, href: '/reservas', visivel: moduloAtivo('reservas') },
            { label: 'Mural de avisos', icon: Megaphone, href: '/avisos', visivel: moduloAtivo('avisos') },
          ]}
        />
      </Section>
      {dash.autorizacoesPendentes.length ? (
        <Section title="Aguardando resposta do morador" action="Fila" onAction={() => router.push('/portaria')}>
          {dash.autorizacoesPendentes.map((a) => (
            <Card key={a.id} style={comumStyles.listItem}>
              <View style={[comumStyles.itemIcon, { backgroundColor: colors.orangeSoft }]}>
                <ShieldCheck size={18} color={colors.orange} />
              </View>
              <View style={comumStyles.itemCopy}>
                <Text style={comumStyles.itemTitle}>{a.visitante.nome}</Text>
                <Text style={comumStyles.itemDetail}>Unidade {a.unidadeId} · {a.motivo} · {dataHora(a.solicitadoEm)}</Text>
              </View>
            </Card>
          ))}
        </Section>
      ) : null}
      {dash.reservasDoDia.length ? (
        <Section title="Reservas de hoje" action="Vistorias" onAction={() => router.push('/reservas')}>
          <Card>
            {dash.reservasDoDia.map((r) => (
              <View key={r.id} style={styles.booking}>
                <View style={styles.timeBox}>
                  <Text style={[styles.time, { color: tema.primaria }]}>{hora(r.inicio)}</Text>
                  <Text style={styles.timeEnd}>{hora(r.fim)}</Text>
                </View>
                <View style={comumStyles.itemCopy}>
                  <Text style={comumStyles.itemTitle}>{r.areaComumNome}</Text>
                  <Text style={comumStyles.itemDetail}>Unidade {r.unidadeId} · {r.solicitante.nome}</Text>
                </View>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  hero: { minHeight: 160, borderRadius: 24, padding: 25, flexDirection: 'row', justifyContent: 'space-between', overflow: 'hidden', gap: 12 },
  heroCopy: { maxWidth: 570, flexShrink: 1 },
  heroKicker: { color: '#C9DDE0', fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 },
  heroTitle: { color: colors.white, fontSize: 25, lineHeight: 31, fontWeight: '700', marginBottom: 9 },
  heroText: { color: '#D2DFE0', fontSize: 14, lineHeight: 21 },
  heroMark: { width: 70, height: 70, borderRadius: 24, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', transform: [{ rotate: '-8deg' }] },
  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  booking: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 10 },
  timeBox: { width: 48 },
  time: { fontSize: 13, fontWeight: '700' },
  timeEnd: { color: colors.muted, fontSize: 11, marginTop: 3 },
});
