import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { Bell, ChevronRight, LucideIcon } from 'lucide-react-native';
import { colors } from '@/components/morah-ui';
import { useAuth } from '@/contexts/AuthContext';
import { useCondominio, useTema } from '@/contexts/CondominioContext';
import { listarNotificacoes } from '@/lib/api/endpoints/notificacoes';

/** Nome de exibição do condomínio ativo (personalização), usado como "eyebrow" das telas. */
export function useNomeCondominio() {
  const { personalizacao } = useCondominio();
  const { contexto } = useAuth();
  return personalizacao?.nomeExibicao ?? contexto?.condominioNome ?? 'Morah';
}

/** Sino com contador de notificações não lidas (GET /notificacoes). */
export function NotificacoesBell() {
  const tema = useTema();
  const [naoLidas, setNaoLidas] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      listarNotificacoes({ size: 100 })
        .then((lista) => ativo && setNaoLidas(lista.filter((n) => !n.lidaEm).length))
        .catch(() => undefined);
      return () => {
        ativo = false;
      };
    }, []),
  );

  return (
    <Pressable onPress={() => router.push('/notificacoes')} style={styles.bell} accessibilityLabel={`Notificações, ${naoLidas} não lidas`}>
      <Bell size={20} color={colors.ink} />
      {naoLidas > 0 ? (
        <View style={[styles.badge, { backgroundColor: tema.destaque }]}>
          <Text style={styles.badgeText}>{naoLidas > 9 ? '9+' : naoLidas}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export type AcaoRapida = { label: string; icon: LucideIcon; href: Href; visivel?: boolean };

export function AcoesRapidas({ acoes }: { acoes: AcaoRapida[] }) {
  const tema = useTema();
  return (
    <View style={styles.quickGrid}>
      {acoes
        .filter((a) => a.visivel !== false)
        .map((item) => (
          <Pressable key={item.label} onPress={() => router.push(item.href)} style={({ pressed }) => [styles.quickCard, pressed && { opacity: 0.72 }]}>
            <View style={[styles.quickIcon, { backgroundColor: tema.primariaSoft }]}>
              <item.icon size={19} color={tema.primaria} />
            </View>
            <Text style={styles.quickLabel}>{item.label}</Text>
            <ChevronRight size={16} color="#9AA9A6" />
          </Pressable>
        ))}
    </View>
  );
}

export const comumStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  itemIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemCopy: { flex: 1 },
  itemTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  itemDetail: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  itemRight: { alignItems: 'flex-end', gap: 7 },
  itemValue: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  paragraph: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 12 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  code: { color: colors.ink, fontSize: 26, fontWeight: '700', letterSpacing: 6, textAlign: 'center', paddingVertical: 12 },
});

const styles = StyleSheet.create({
  bell: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 4, right: 3, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.white },
  badgeText: { color: colors.white, fontSize: 9, fontWeight: '700' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: { flexGrow: 1, flexBasis: '22%', minWidth: 160, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  quickIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '700', lineHeight: 16 },
});
