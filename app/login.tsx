import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Building2, LogIn, RotateCcw } from 'lucide-react-native';
import { Button, Card, colors, Feedback, Input, Loading, Page } from '@/components/morah-ui';
import { useAuth } from '@/contexts/AuthContext';
import { useTema } from '@/contexts/CondominioContext';
import { mensagemDeErro } from '@/lib/api/client';
import { API_URL, USE_MOCK } from '@/lib/config';

// Usuários de demonstração do seed (exemplos de POST /auth/login no contrato), senha demo123.
const DEMO = [
  { email: 'camila.duarte@demo.com.br', nome: 'Camila Duarte', papel: 'Moradora · Apto 502' },
  { email: 'rafael.nunes@demo.com.br', nome: 'Rafael Nunes', papel: 'Proprietário · Apto 302' },
  { email: 'helena.prado@demo.com.br', nome: 'Helena Prado', papel: 'Síndica' },
  { email: 'portaria@demo.com.br', nome: 'Portaria Central', papel: 'Portaria' },
];

export default function LoginScreen() {
  const { me, carregando, login } = useAuth();
  const tema = useTema();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  if (carregando) return <Page><Loading label="Abrindo o Morah…" /></Page>;
  if (me) return <Redirect href="/" />;

  const entrar = async (emailLogin = email, senhaLogin = senha) => {
    if (!emailLogin.trim() || !senhaLogin) {
      setErro('Informe e-mail e senha.');
      return;
    }
    setEntrando(true);
    setErro('');
    try {
      await login(emailLogin.trim(), senhaLogin);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEntrando(false);
    }
  };

  const reiniciarDados = () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { reiniciarMock } = require('@/lib/api/mock/server') as typeof import('@/lib/api/mock/server');
    reiniciarMock();
    setAviso('Dados de demonstração restaurados.');
  };

  return (
    <Page>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.brand, { backgroundColor: tema.primariaEscura }]}>
            <View style={[styles.brandIcon, { backgroundColor: tema.primaria }]}>
              <Building2 size={26} color={colors.white} />
            </View>
            <Text style={styles.brandName}>Morah</Text>
            <Text style={styles.brandText}>Gestão do seu condomínio em um só lugar.</Text>
          </View>

          <Card style={styles.form}>
            <Text style={styles.title}>Entrar</Text>
            <Input label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@email.com" keyboardType="email-address" autoCapitalize="none" />
            <Input label="Senha" value={senha} onChangeText={setSenha} placeholder="Sua senha" secureTextEntry autoCapitalize="none" />
            {erro ? <Text style={styles.error}>{erro}</Text> : null}
            <Button label="Entrar" icon={LogIn} loading={entrando} onPress={() => entrar()} />
          </Card>

          {USE_MOCK ? (
            <Card style={styles.form}>
              <Text style={styles.demoTitle}>Modo demonstração</Text>
              <Text style={styles.demoText}>A API ainda não está no ar: o app usa um servidor simulado que segue o contrato. Toque num usuário para entrar (senha demo123).</Text>
              {DEMO.map((u) => (
                <Pressable key={u.email} onPress={() => { setEmail(u.email); setSenha('demo123'); entrar(u.email, 'demo123'); }} style={({ pressed }) => [styles.demoUser, pressed && { opacity: 0.7 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.demoName}>{u.nome}</Text>
                    <Text style={styles.demoRole}>{u.papel} · {u.email}</Text>
                  </View>
                  <LogIn size={16} color={tema.primaria} />
                </Pressable>
              ))}
              <Button label="Restaurar dados de demonstração" icon={RotateCcw} variant="ghost" small onPress={reiniciarDados} style={{ marginTop: 6 }} />
              {aviso ? <Feedback type="success">{aviso}</Feedback> : null}
            </Card>
          ) : (
            <Text style={styles.server}>Servidor: {API_URL}</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 40, paddingBottom: 40, alignItems: 'center', gap: 14 },
  brand: { width: '100%', maxWidth: 440, borderRadius: 24, padding: 24 },
  brandIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  brandName: { color: colors.white, fontSize: 30, fontWeight: '700' },
  brandText: { color: '#C9DDE0', fontSize: 14, marginTop: 6, lineHeight: 20 },
  form: { width: '100%', maxWidth: 440 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '700', marginBottom: 16 },
  error: { color: colors.red, fontSize: 13, marginBottom: 12, lineHeight: 18 },
  demoTitle: { color: colors.ink, fontSize: 15, fontWeight: '700', marginBottom: 6 },
  demoText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  demoUser: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.line },
  demoName: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  demoRole: { color: colors.muted, fontSize: 11, marginTop: 3 },
  server: { color: colors.muted, fontSize: 12 },
});
