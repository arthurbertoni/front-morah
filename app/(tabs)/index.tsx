import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, CalendarDays, ChevronRight, FileText, Home, Package, ShieldCheck, WalletCards } from 'lucide-react-native';
import { Avatar, Card, colors, Feedback, MetricCard, Page, SectionTitle, StatusPill, TopBar } from '@/components/morah-ui';

const quickActions = [
  { label: 'Pagar condomínio', icon: WalletCards, tab: 'Financeiro' },
  { label: 'Autorizar visitante', icon: ShieldCheck, tab: 'Portaria' },
  { label: 'Reservar espaço', icon: CalendarDays, tab: 'Reservas' },
  { label: 'Ver encomendas', icon: Package, tab: 'Encomendas' },
];

export default function HomeScreen() {
  const [notice, setNotice] = useState('');
  return <Page><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <TopBar eyebrow="Residencial Vila Madalena" title="Olá, Marina" action={<View style={styles.topActions}><Pressable style={styles.bell}><Bell size={20} color={colors.ink} /><View style={styles.dot} /></Pressable><Avatar /></View>} />
    <View style={styles.hero}><View style={styles.heroCopy}><Text style={styles.heroKicker}>Tudo em um só lugar</Text><Text style={styles.heroTitle}>A vida no seu condomínio, mais simples.</Text><Text style={styles.heroText}>Acompanhe sua unidade, pagamentos e tudo o que acontece por aqui.</Text></View><View style={styles.heroMark}><Home size={28} color={colors.white} strokeWidth={1.7} /></View></View>
    {notice ? <Feedback type="success">{notice}</Feedback> : null}
    <View style={styles.metrics}><MetricCard icon={WalletCards} label="Próximo boleto" value="R$ 842,50" caption="Vence em 08 out" /><MetricCard icon={Package} label="Encomendas" value="03" caption="Aguardando retirada" tone="orange" /><MetricCard icon={Bell} label="Avisos novos" value="02" caption="Desde ontem" tone="blue" /></View>
    <View style={styles.section}><SectionTitle title="Acesso rápido" /><View style={styles.quickGrid}>{quickActions.map((item) => <Pressable key={item.label} onPress={() => setNotice(`${item.tab}: ação disponível no menu inferior.`)} style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}><View style={styles.quickIcon}><item.icon size={19} color={colors.teal} /></View><Text style={styles.quickLabel}>{item.label}</Text><ChevronRight size={16} color="#9AA9A6" /></Pressable>)}</View></View>
    <View style={styles.section}><SectionTitle title="Resumo financeiro" action="Ver tudo" /><Card><View style={styles.billTop}><View><Text style={styles.billLabel}>Taxa condominial</Text><Text style={styles.billDate}>Competência setembro 2026</Text></View><StatusPill label="Pendente" tone="orange" /></View><View style={styles.billBottom}><Text style={styles.billValue}>R$ 842,50</Text><Pressable onPress={() => setNotice('Boleto copiado. O código PIX está pronto para pagamento.')} style={styles.primarySmall}><Text style={styles.primarySmallText}>Pagar agora</Text></Pressable></View></Card></View>
    <View style={styles.section}><SectionTitle title="Últimos avisos" action="Ver mural" /><Card><View style={styles.noticeRow}><View style={styles.noticeBadge}><FileText size={17} color={colors.teal} /></View><View style={styles.noticeCopy}><Text style={styles.noticeTitle}>Manutenção dos elevadores</Text><Text style={styles.noticeDate}>Hoje, 09:42 · Administração</Text></View><StatusPill label="Novo" tone="teal" /></View><View style={styles.noticeRow}><View style={[styles.noticeBadge, { backgroundColor: colors.orangeSoft }]}><Bell size={17} color={colors.orange} /></View><View style={styles.noticeCopy}><Text style={styles.noticeTitle}>Dedetização nas áreas comuns</Text><Text style={styles.noticeDate}>Ontem · Administração</Text></View></View></Card></View>
  </ScrollView></Page>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 34 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bell: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 5, backgroundColor: colors.orange, borderWidth: 1, borderColor: colors.white },
  hero: { maxWidth: 1180, marginHorizontal: 24, minHeight: 176, borderRadius: 24, backgroundColor: colors.ink, padding: 25, flexDirection: 'row', justifyContent: 'space-between', overflow: 'hidden' },
  heroCopy: { maxWidth: 570 },
  heroKicker: { color: '#A9D9D2', fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 },
  heroTitle: { color: colors.white, fontSize: 27, lineHeight: 32, fontWeight: '700', marginBottom: 9 },
  heroText: { color: '#BFD3D0', fontSize: 14, lineHeight: 21 },
  heroMark: { width: 74, height: 74, borderRadius: 25, backgroundColor: '#185451', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', transform: [{ rotate: '-8deg' }] },
  metrics: { maxWidth: 1180, marginHorizontal: 24, flexDirection: 'row', gap: 12, marginTop: 18 },
  section: { maxWidth: 1180, marginHorizontal: 24, marginTop: 28 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: { flexGrow: 1, flexBasis: '22%', minWidth: 190, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  quickIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.tealSoft, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '700', lineHeight: 16 },
  billTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  billLabel: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  billDate: { color: colors.muted, fontSize: 12, marginTop: 5 },
  billBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line },
  billValue: { color: colors.ink, fontSize: 23, fontWeight: '700' },
  primarySmall: { backgroundColor: colors.teal, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  primarySmallText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 5, marginBottom: 12 },
  noticeBadge: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.tealSoft, alignItems: 'center', justifyContent: 'center' },
  noticeCopy: { flex: 1 },
  noticeTitle: { color: colors.ink, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  noticeDate: { color: colors.muted, fontSize: 12 },
  pressed: { opacity: 0.72 },
});