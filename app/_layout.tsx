import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { CondominioProvider } from '@/contexts/CondominioContext';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <CondominioProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </CondominioProvider>
    </AuthProvider>
  );
}
