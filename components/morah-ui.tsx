import { ReactNode, useRef } from 'react';
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowLeft, ChevronRight, CircleAlert, CircleCheck, Inbox, LucideIcon, Lock, RotateCw, X } from 'lucide-react-native';
import { useTema } from '@/contexts/CondominioContext';
import type { Tom } from '@/lib/format';

// Paleta neutra fixa. As cores de marca (primária, destaque, fundo) vêm da personalização
// do condomínio via useTema() — GET /condominio/personalizacao.
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

function useTons() {
  const tema = useTema();
  return {
    teal: [tema.primariaSoft, tema.primaria],
    orange: [colors.orangeSoft, colors.orange],
    red: [colors.redSoft, colors.red],
    blue: [colors.blueSoft, colors.blue],
    green: [colors.greenSoft, colors.green],
  } as Record<Tom, [string, string]>;
}

export function Page({ children }: { children: ReactNode }) {
  const tema = useTema();
  return <View style={[styles.page, { backgroundColor: tema.fundo }]}>{children}</View>;
}

/** Página com rolagem e "puxar para atualizar". */
export function Screen({ children, onRefresh, refreshing = false }: { children: ReactNode; onRefresh?: () => void; refreshing?: boolean }) {
  const tema = useTema();
  return (
    <Page>
      <ScrollView
        contentContainerStyle={styles.screenContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tema.primaria} /> : undefined}
      >
        {children}
      </ScrollView>
    </Page>
  );
}

/** Faixa central com largura máxima — o mesmo alinhamento das seções do protótipo. */
export function Section({ children, title, action, onAction, style }: { children?: ReactNode; title?: string; action?: string; onAction?: () => void; style?: object }) {
  return (
    <View style={[styles.section, style]}>
      {title ? <SectionTitle title={title} action={action} onAction={onAction} /> : null}
      {children}
    </View>
  );
}

export function TopBar({ eyebrow, title, action, onBack }: { eyebrow: string; title: string; action?: ReactNode; onBack?: () => void }) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarLeft}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.backButton} accessibilityLabel="Voltar">
            <ArrowLeft size={19} color={colors.ink} />
          </Pressable>
        ) : null}
        <View style={styles.topBarText}>
          <Text style={styles.eyebrow} numberOfLines={1}>{eyebrow}</Text>
          <Text style={styles.pageTitle} numberOfLines={1}>{title}</Text>
        </View>
      </View>
      {action}
    </View>
  );
}

export function Avatar({ initials = '?', size = 42 }: { initials?: string; size?: number }) {
  const tema = useTema();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: tema.primariaEscura }]}>
      <Text style={[styles.avatarText, { fontSize: size > 46 ? 17 : 14 }]}>{initials}</Text>
    </View>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const tema = useTema();
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.link, { color: tema.primaria }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: object; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatusPill({ label, tone = 'teal' }: { label: string; tone?: Tom }) {
  const [fundo, texto] = useTons()[tone];
  return (
    <View style={[styles.pill, { backgroundColor: fundo }]}>
      <Text style={[styles.pillText, { color: texto }]}>{label}</Text>
    </View>
  );
}

export function MetricCard({ icon: Icon, label, value, caption, tone = 'teal', onPress }: { icon: LucideIcon; label: string; value: string; caption: string; tone?: 'teal' | 'orange' | 'blue' | 'red'; onPress?: () => void }) {
  const [bg, color] = useTons()[tone];
  return (
    <Card style={styles.metricCard} onPress={onPress}>
      <View style={[styles.metricIcon, { backgroundColor: bg }]}>
        <Icon size={18} color={color} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricCaption}>{caption}</Text>
    </Card>
  );
}

export function EmptyAction({ icon: Icon = Inbox, title, description, action, onPress }: { icon?: LucideIcon; title: string; description: string; action?: string; onPress?: () => void }) {
  const tema = useTema();
  return (
    <Card style={styles.emptyCard}>
      <View style={[styles.emptyIcon, { backgroundColor: tema.primariaSoft }]}>
        <Icon size={20} color={tema.primaria} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {action ? (
        <Pressable onPress={onPress} style={({ pressed }) => [styles.outlineButton, { borderColor: tema.primariaSoft }, pressed && styles.pressed]}>
          <Text style={[styles.outlineButtonText, { color: tema.primaria }]}>{action}</Text>
          <ChevronRight size={16} color={tema.primaria} />
        </Pressable>
      ) : null}
    </Card>
  );
}

export function Feedback({ type, children, onClose }: { type: 'success' | 'warning'; children: ReactNode; onClose?: () => void }) {
  const success = type === 'success';
  const cor = success ? colors.green : colors.orange;
  return (
    <View style={styles.feedbackWrap}>
      <View style={[styles.feedback, { backgroundColor: success ? colors.greenSoft : colors.orangeSoft }]}>
        {success ? <CircleCheck size={18} color={cor} /> : <CircleAlert size={18} color={cor} />}
        <Text style={[styles.feedbackText, { color: cor }]}>{children}</Text>
        {onClose ? (
          <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Fechar mensagem">
            <X size={16} color={cor} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function InfoRow({ icon: Icon, title, detail, right, onPress, last }: { icon: LucideIcon; title: string; detail?: string; right?: ReactNode; onPress?: () => void; last?: boolean }) {
  const tema = useTema();
  const conteudo = (
    <>
      <View style={[styles.infoIcon, { backgroundColor: tema.primariaSoft }]}>
        <Icon size={18} color={tema.primaria} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoTitle}>{title}</Text>
        {detail ? <Text style={styles.infoDetail}>{detail}</Text> : null}
      </View>
      {right}
    </>
  );
  const estilo = [styles.infoRow, last && { borderBottomWidth: 0 }];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...estilo, pressed && styles.pressed]}>
        {conteudo}
      </Pressable>
    );
  }
  return <View style={estilo}>{conteudo}</View>;
}

type Variante = 'primary' | 'outline' | 'ghost' | 'danger' | 'light';

export function Button({ label, onPress, variant = 'primary', icon: Icon, loading, disabled, small, style }: { label: string; onPress?: () => void; variant?: Variante; icon?: LucideIcon; loading?: boolean; disabled?: boolean; small?: boolean; style?: object }) {
  const tema = useTema();
  const fundo = { primary: tema.primaria, outline: colors.white, ghost: 'transparent', danger: colors.redSoft, light: colors.white }[variant];
  const texto = { primary: colors.white, outline: tema.primaria, ghost: tema.primaria, danger: colors.red, light: colors.ink }[variant];
  const borda = variant === 'outline' ? tema.primaria : 'transparent';
  const inativo = disabled || loading;
  return (
    <Pressable
      onPress={inativo ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inativo }}
      style={({ pressed }) => [styles.button, small && styles.buttonSmall, { backgroundColor: fundo, borderColor: borda }, inativo && styles.disabled, pressed && styles.pressed, style]}
    >
      {loading ? <ActivityIndicator size="small" color={texto} /> : Icon ? <Icon size={small ? 14 : 16} color={texto} /> : null}
      <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: texto }]}>{label}</Text>
    </Pressable>
  );
}

export function Input({ label, value, onChangeText, placeholder, keyboardType, multiline, secureTextEntry, autoCapitalize = 'sentences', hint }: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; keyboardType?: KeyboardTypeOptions; multiline?: boolean; secureTextEntry?: boolean; autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'; hint?: string }) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9AA9A6"
        keyboardType={keyboardType}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
      {hint ? <Text style={styles.inputHint}>{hint}</Text> : null}
    </View>
  );
}

export function Chips<T extends string>({ options, value, onChange, scroll }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; scroll?: boolean }) {
  const tema = useTema();
  const itens = options.map((o) => {
    const ativo = o.value === value;
    return (
      <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.chip, ativo && { backgroundColor: tema.primariaEscura, borderColor: tema.primariaEscura }]}>
        <Text style={[styles.chipText, ativo && { color: colors.white }]}>{o.label}</Text>
      </Pressable>
    );
  });
  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {itens}
      </ScrollView>
    );
  }
  return <View style={[styles.chips, { flexWrap: 'wrap' }]}>{itens}</View>;
}

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  const tema = useTema();
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={tema.primaria} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card style={styles.errorCard}>
      <CircleAlert size={20} color={colors.red} />
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? <Button label="Tentar de novo" icon={RotateCw} variant="outline" small onPress={onRetry} /> : null}
    </Card>
  );
}

/** Estado padrão de uma consulta: carregando, erro ou vazio. Devolve null quando há dados. */
export function QueryState({ loading, error, empty, onRetry, emptyTitle = 'Nada por aqui', emptyDescription = 'Não há registros para mostrar.' }: { loading: boolean; error: string | null; empty: boolean; onRetry?: () => void; emptyTitle?: string; emptyDescription?: string }) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (loading && empty) return <Loading />;
  if (empty) return <EmptyAction title={emptyTitle} description={emptyDescription} />;
  return null;
}

export function LoadMore({ hasMore, loading, onPress }: { hasMore: boolean; loading: boolean; onPress: () => void }) {
  if (!hasMore) return null;
  return <Button label="Carregar mais" variant="ghost" loading={loading} onPress={onPress} style={{ alignSelf: 'center', marginTop: 4 }} />;
}

export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  // Mantém o último título enquanto o modal some (o estado de quem abriu já foi limpo).
  const ultimoTitulo = useRef(title);
  if (visible) ultimoTitulo.current = title;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{ultimoTitulo.current}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fechar">
              <X size={20} color={colors.muted} />
            </Pressable>
          </View>
          <ScrollView style={styles.sheetBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {visible ? children : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function Confirm({ visible, title, message, confirmLabel = 'Confirmar', danger, loading, onConfirm, onCancel }: { visible: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean; loading?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Sheet visible={visible} title={title} onClose={onCancel}>
      <Text style={styles.confirmText}>{message}</Text>
      <View style={styles.row}>
        <Button label="Voltar" variant="outline" onPress={onCancel} style={{ flex: 1 }} />
        <Button label={confirmLabel} variant={danger ? 'danger' : 'primary'} loading={loading} onPress={onConfirm} style={{ flex: 1 }} />
      </View>
    </Sheet>
  );
}

/** Linha de detalhe "rótulo: valor" usada nos sheets. */
export function DetailRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? <Text style={styles.detailValue}>{value}</Text> : value}
    </View>
  );
}

export function ModuloDesativado({ nome }: { nome: string }) {
  return (
    <Screen>
      <TopBar eyebrow="Módulo indisponível" title={nome} />
      <Section>
        <EmptyAction icon={Lock} title={`Módulo ${nome} desativado`} description="O síndico desativou este módulo no condomínio. Ele volta a aparecer assim que for reativado." />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.soft },
  screenContent: { paddingBottom: 34 },
  section: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 24, marginTop: 24 },
  topBar: { maxWidth: 1180, width: '100%', alignSelf: 'center', paddingHorizontal: 24, paddingTop: 28, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  topBarText: { flexShrink: 1 },
  backButton: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
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
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptyDescription: { color: colors.muted, fontSize: 13, textAlign: 'center', maxWidth: 320, lineHeight: 20 },
  outlineButton: { marginTop: 18, borderWidth: 1, borderColor: '#B8D9D3', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  outlineButtonText: { color: colors.teal, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
  feedbackWrap: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 24, marginTop: 12 },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, borderRadius: 12 },
  feedbackText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 12 },
  infoIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.tealSoft, alignItems: 'center', justifyContent: 'center' },
  infoText: { flex: 1 },
  infoTitle: { color: colors.ink, fontSize: 14, fontWeight: '700', marginBottom: 3 },
  infoDetail: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 11, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  buttonSmall: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9 },
  buttonText: { fontSize: 13, fontWeight: '700' },
  buttonTextSmall: { fontSize: 12 },
  inputWrap: { marginBottom: 14 },
  inputLabel: { color: colors.ink, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 11, color: colors.ink, fontSize: 14 },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top' },
  inputHint: { color: colors.muted, fontSize: 11, marginTop: 5 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 13, backgroundColor: colors.white },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  loading: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  loadingText: { color: colors.muted, fontSize: 13 },
  errorCard: { alignItems: 'center', gap: 10, paddingVertical: 22 },
  errorText: { color: colors.ink, fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 420 },
  backdrop: { flex: 1, backgroundColor: 'rgba(16,42,42,0.45)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 520, maxHeight: '90%', backgroundColor: colors.white, borderRadius: 20, paddingTop: 18, paddingHorizontal: 20, paddingBottom: 8 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12 },
  sheetTitle: { color: colors.ink, fontSize: 18, fontWeight: '700', flex: 1 },
  sheetBody: { paddingBottom: 12 },
  confirmText: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 18 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 12 },
  detailLabel: { color: colors.muted, fontSize: 13 },
  detailValue: { color: colors.ink, fontSize: 13, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
});

export const uiStyles = styles;
