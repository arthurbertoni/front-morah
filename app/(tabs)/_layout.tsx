import { Redirect, Tabs } from 'expo-router';
import {
  Building2,
  CalendarDays,
  LayoutDashboard,
  LucideIcon,
  Megaphone,
  MoreHorizontal,
  Package,
  Settings,
  ShieldCheck,
  WalletCards,
  Bell,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, Loading, Page } from '@/components/morah-ui';
import { useAuth } from '@/contexts/AuthContext';
import { useCondominio } from '@/contexts/CondominioContext';
import type { ModuloCodigo, Perfil } from '@/lib/api/types';

type Aba = { nome: string; titulo: string; icone: LucideIcon; modulo?: ModuloCodigo; perfis: Perfil[] };

const MORADORES: Perfil[] = ['morador', 'proprietario'];

// Abas visíveis por perfil (no máximo 5 na barra). As demais telas continuam acessíveis
// pelos atalhos de "Início" e "Mais", mas ficam fora da barra (href: null).
const ABAS: Aba[] = [
  { nome: 'index', titulo: 'Início', icone: LayoutDashboard, perfis: ['morador', 'proprietario', 'sindico', 'portaria'] },
  { nome: 'financeiro', titulo: 'Financeiro', icone: WalletCards, modulo: 'financeiro', perfis: [...MORADORES, 'sindico'] },
  { nome: 'portaria', titulo: 'Portaria', icone: ShieldCheck, modulo: 'portaria', perfis: [...MORADORES, 'portaria'] },
  { nome: 'encomendas', titulo: 'Encomendas', icone: Package, modulo: 'encomendas', perfis: ['portaria'] },
  { nome: 'reservas', titulo: 'Reservas', icone: CalendarDays, modulo: 'reservas', perfis: ['portaria'] },
  { nome: 'avisos', titulo: 'Avisos', icone: Megaphone, modulo: 'avisos', perfis: [...MORADORES, 'sindico'] },
  { nome: 'configuracoes', titulo: 'Condomínio', icone: Settings, perfis: ['sindico'] },
  { nome: 'mais', titulo: 'Mais', icone: MoreHorizontal, perfis: ['morador', 'proprietario', 'sindico', 'portaria'] },
  // Telas fora da barra
  { nome: 'unidade', titulo: 'Minha unidade', icone: Building2, modulo: 'minha_unidade', perfis: [] },
  { nome: 'unidades', titulo: 'Unidades', icone: Building2, modulo: 'minha_unidade', perfis: [] },
  { nome: 'notificacoes', titulo: 'Notificações', icone: Bell, perfis: [] },
];

export default function TabsLayout() {
  const { me, perfil, carregando } = useAuth();
  const { moduloAtivo, tema } = useCondominio();

  if (carregando) return <Page><Loading label="Abrindo o Morah…" /></Page>;
  if (!me || !perfil) return <Redirect href="/login" />;

  const visivel = (aba: Aba) => aba.perfis.includes(perfil) && (!aba.modulo || moduloAtivo(aba.modulo));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tema.primaria,
        tabBarInactiveTintColor: '#91A19E',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      {ABAS.map((aba) => (
        <Tabs.Screen
          key={aba.nome}
          name={aba.nome}
          options={{
            title: aba.titulo,
            href: visivel(aba) ? undefined : null,
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconWrap, focused && { backgroundColor: tema.primariaSoft }]}>
                <aba.icone size={20} color={color} strokeWidth={focused ? 2.4 : 2} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 74,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabItem: {
    gap: 2,
  },
  iconWrap: {
    width: 30,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
});
