import { Tabs } from 'expo-router';
import { LayoutDashboard, Megaphone, MoreHorizontal, Package, WalletCards } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

const colors = {
  ink: '#102A2A',
  muted: '#6F817E',
  line: '#E2EBE8',
  paper: '#F7FAF8',
  white: '#FFFFFF',
  teal: '#0C716D',
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: '#91A19E',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarIcon: ({ color, focused }) => {
          const Icon = route.name === 'index'
            ? LayoutDashboard
            : route.name === 'financeiro'
              ? WalletCards
              : route.name === 'portaria'
                ? Package
                : route.name === 'avisos'
                  ? Megaphone
                  : MoreHorizontal;
          return (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Icon size={20} color={color} strokeWidth={focused ? 2.4 : 2} />
            </View>
          );
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="financeiro" options={{ title: 'Financeiro' }} />
      <Tabs.Screen name="portaria" options={{ title: 'Portaria' }} />
      <Tabs.Screen name="avisos" options={{ title: 'Avisos' }} />
      <Tabs.Screen name="mais" options={{ title: 'Mais' }} />
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
  iconWrapActive: {
    backgroundColor: '#E2F3F0',
  },
});