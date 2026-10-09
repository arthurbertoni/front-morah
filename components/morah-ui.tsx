import { createContext, ReactNode, useContext, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, CircleAlert, CircleCheck, Clock3, LucideIcon } from 'lucide-react-native';

export type UserProfile = 'morador' | 'sindico';

type ProfileContextValue = { profile: UserProfile; setProfile: (profile: UserProfile) => void };

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>('morador');
  return <ProfileContext.Provider value={{ profile, setProfile }}>{children}</ProfileContext.Provider>;
}

export function useUserProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useUserProfile must be used within ProfileProvider');
  return context;
}

export const colors = {
  ink: '#102A2A',
  muted: '#6F817E',
  soft: '#F7FAF8',
  line: '#E2EBE8',
  white: '#FFFFFF',
  teal: '#0C716D',
  tealSoft: '#E2F3F0',
  orange: '#C56E2E',
  orangeSoft: '#FFF0E5',
  red: '#C24F4F',
  redSoft: '#FDECEC',
  blue: '#3B6B9B',
  blueSoft: '#EAF2FA',
  green: '#3E8068',
  greenSoft: '#E6F4ED',
};

export function Page({ children }: { children: ReactNode }) {
  return <View style={styles.page}>{children}</View>;
}

export function TopBar({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <View style={styles.topBar}>
      <View>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.pageTitle}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function Avatar({ initials = 'MS', size = 42 }: { initials?: string; size?: number }) {
  return <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}><Text style={styles.avatarText}>{initials}</Text></View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={styles.sectionTitle}><Text style={styles.sectionTitleText}>{title}</Text>{action ? <Pressable onPress={onAction} hitSlop={8}><Text style={styles.link}>{action}</Text></Pressable> : null}</View>;
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatusPill({ label, tone = 'teal' }: { label: string; tone?: 'teal' | 'orange' | 'red' | 'blue' | 'green' }) {
  const toneStyles = { teal: [colors.tealSoft, colors.teal], orange: [colors.orangeSoft, colors.orange], red: [colors.redSoft, colors.red], blue: [colors.blueSoft, colors.blue], green: [colors.greenSoft, colors.green] } as const;
  return <View style={[styles.pill, { backgroundColor: toneStyles[tone][0] }]}><Text style={[styles.pillText, { color: toneStyles[tone][1] }]}>{label}</Text></View>;
}

export function MetricCard({ icon: Icon, label, value, caption, tone = 'teal' }: { icon: LucideIcon; label: string; value: string; caption: string; tone?: 'teal' | 'orange' | 'blue' }) {
  const bg = tone === 'orange' ? colors.orangeSoft : tone === 'blue' ? colors.blueSoft : colors.tealSoft;
  const color = tone === 'orange' ? colors.orange : tone === 'blue' ? colors.blue : colors.teal;
  return <Card style={styles.metricCard}><View style={[styles.metricIcon, { backgroundColor: bg }]}><Icon size={18} color={color} /></View><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricCaption}>{caption}</Text></Card>;
}

export function EmptyAction({ icon: Icon, title, description, action, onPress }: { icon: LucideIcon; title: string; description: string; action: string; onPress?: () => void }) {
  return <Card style={styles.emptyCard}><View style={styles.emptyIcon}><Icon size={20} color={colors.teal} /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyDescription}>{description}</Text><Pressable onPress={onPress} style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}><Text style={styles.outlineButtonText}>{action}</Text><ChevronRight size={16} color={colors.teal} /></Pressable></Card>;
}

export function Feedback({ type, children }: { type: 'success' | 'warning'; children: ReactNode }) {
  const success = type === 'success';
  return <View style={[styles.feedback, { backgroundColor: success ? colors.greenSoft : colors.orangeSoft }]}>{success ? <CircleCheck size={18} color={colors.green} /> : <CircleAlert size={18} color={colors.orange} />}<Text style={[styles.feedbackText, { color: success ? colors.green : colors.orange }]}>{children}</Text></View>;
}

export function InfoRow({ icon: Icon, title, detail, right }: { icon: LucideIcon; title: string; detail: string; right?: ReactNode }) {
  return <View style={styles.infoRow}><View style={styles.infoIcon}><Icon size={18} color={colors.teal} /></View><View style={styles.infoText}><Text style={styles.infoTitle}>{title}</Text><Text style={styles.infoDetail}>{detail}</Text></View>{right}</View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.soft },
  topBar: { maxWidth: 1180, width: '100%', alignSelf: 'center', paddingHorizontal: 24, paddingTop: 28, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 6 },
  pageTitle: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: '700' },
  avatar: { backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitleText: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  link: { color: colors.teal, fontSize: 13, fontWeight: '700' },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 18 },
  metricCard: { flex: 1, minWidth: 145, padding: 16 },
  metricIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  metricLabel: { color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  metricValue: { color: colors.ink, fontSize: 24, fontWeight: '700', marginBottom: 5 },
  metricCaption: { color: colors.muted, fontSize: 12 },
  pill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 100, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontWeight: '700' },
  emptyCard: { alignItems: 'center', paddingVertical: 28 },
  emptyIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.tealSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptyDescription: { color: colors.muted, fontSize: 13, textAlign: 'center', maxWidth: 300, lineHeight: 20 },
  outlineButton: { marginTop: 18, borderWidth: 1, borderColor: '#B8D9D3', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  outlineButtonText: { color: colors.teal, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.7 },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, borderRadius: 12 },
  feedbackText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 12 },
  infoIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.tealSoft, alignItems: 'center', justifyContent: 'center' },
  infoText: { flex: 1 },
  infoTitle: { color: colors.ink, fontSize: 14, fontWeight: '700', marginBottom: 3 },
  infoDetail: { color: colors.muted, fontSize: 12 },
});

export const uiStyles = styles;