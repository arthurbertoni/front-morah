import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import {
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  DoorOpen,
  LogOut,
  LucideIcon,
  Megaphone,
  Package,
  Repeat,
  Settings,
  Users,
} from 'lucide-react-native';
import { Avatar, Card, colors, Feedback, InfoRow, Screen, Section, StatusPill, TopBar } from '@/components/morah-ui';
import { useAuth } from '@/contexts/AuthContext';
import { useCondominio, useTema } from '@/contexts/CondominioContext';
import { mensagemDeErro } from '@/lib/api/client';
import type { ModuloCodigo, Perfil, PerfilDisponivel } from '@/lib/api/types';
import { API_URL, USE_MOCK } from '@/lib/config';
import { iniciais, ROTULO_PERFIL } from '@/lib/format';
import { useNomeCondominio } from '@/telas/comum';

type Atalho = { title: string; detail: string; icon: LucideIcon; href: Href; perfis: Perfil[]; modulo?: ModuloCodigo };

const MORADORES: Perfil[] = ['morador', 'proprietario'];

const ATALHOS: Atalho[] = [
  { title: 'Reservas de áreas comuns', detail: 'Salão de festas, churrasqueira e mais', icon: CalendarDays, href: '/reservas', perfis: [...MORADORES, 'sindico'], modulo: 'reservas' },
  { title: 'Minhas encomendas', detail: 'Códigos de retirada e autorização de terceiros', icon: Package, href: '/encomendas', perfis: MORADORES, modulo: 'encomendas' },
  { title: 'Encomendas do condomínio', detail: 'Pacotes na portaria', icon: Package, href: '/encomendas', perfis: ['sindico'], modulo: 'encomendas' },
  { title: 'Minha unidade', detail: 'Dados, moradores, dependentes e inquilinos', icon: Building2, href: '/unidade', perfis: MORADORES, modulo: 'minha_unidade' },
  { title: 'Unidades e vínculos', detail: 'Aprovar solicitações de vínculo', icon: Users, href: '/unidades', perfis: ['sindico'], modulo: 'minha_unidade' },
  { title: 'Histórico de acessos', detail: 'Entradas e saídas de visitantes', icon: DoorOpen, href: '/portaria', perfis: ['sindico'], modulo: 'portaria' },
  { title: 'Mural de avisos', detail: 'Comunicados do condomínio', icon: Megaphone, href: '/avisos', perfis: ['portaria'], modulo: 'avisos' },
  { title: 'Módulos e identidade visual', detail: 'Ativar módulos, nome, logo e cores', icon: Settings, href: '/configuracoes', perfis: ['sindico'] },
  { title: 'Notificações', detail: 'Tudo o que aconteceu com você', icon: Bell, href: '/notificacoes', perfis: ['morador', 'proprietario', 'sindico', 'portaria'] },
];

export default function MoreScreen() {
  const tema = useTema();
  const { me, perfil, logout, trocarContexto } = useAuth();
  const { moduloAtivo } = useCondominio();
  const nomeCondominio = useNomeCondominio();
  const [erro, setErro] = useState('');
  const [trocando, setTrocando] = useState(false);

  if (!me || !perfil) return null;
  const ctx = me.contextoAtivo;
  const outros = me.perfisDisponiveis.filter((p) => !(p.perfil === ctx.perfil && p.condominioId === ctx.condominioId && p.unidadeId === ctx.unidadeId));

  const trocar = async (p: PerfilDisponivel) => {
    setTrocando(true);
    setErro('');
    try {
      await trocarContexto(p);
      router.replace('/');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setTrocando(false);
    }
  };

  return (
    <Screen>
      <TopBar eyebrow={nomeCondominio} title="Mais" />
      {erro ? <Feedback type="warning">{erro}</Feedback> : null}

      <Section>
        <Card style={styles.profile}>
          <Avatar size={54} initials={iniciais(me.pessoa.nome)} />
          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>{me.pessoa.nome}</Text>
            <Text style={styles.profileDetail}>{ROTULO_PERFIL[perfil]}{ctx.unidadeId ? ` · unidade ${ctx.unidadeId}` : ''}</Text>
            <Text style={styles.profileEmail}>{me.pessoa.email}</Text>
          </View>
        </Card>
      </Section>

      <Section title="Atalhos">
        {ATALHOS.filter((a) => a.perfis.includes(perfil) && (!a.modulo || moduloAtivo(a.modulo))).map((option) => (
          <Pressable key={option.title} onPress={() => router.push(option.href)} style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
            <View style={[styles.optionIcon, { backgroundColor: tema.primariaSoft }]}>
              <option.icon size={19} color={tema.primaria} />
            </View>
            <View style={styles.optionCopy}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionDetail}>{option.detail}</Text>
            </View>
            <ChevronRight size={18} color="#9AA9A6" />
          </Pressable>
        ))}
      </Section>

      <Section title="Contexto ativo">
        <Card>
          <InfoRow icon={Building2} title={ctx.condominioNome ?? nomeCondominio} detail={`${ROTULO_PERFIL[ctx.perfil]}${ctx.unidadeId ? ` · unidade ${ctx.unidadeId}` : ''}`} right={<StatusPill label="Ativo" tone="green" />} last={!outros.length} />
          {outros.map((p, i) => (
            <InfoRow
              key={`${p.condominioId}-${p.perfil}-${p.unidadeId ?? ''}`}
              icon={Repeat}
              title={`Trocar para ${ROTULO_PERFIL[p.perfil]}`}
              detail={`${p.condominioNome ?? `Condomínio ${p.condominioId}`}${p.unidadeId ? ` · unidade ${p.unidadeId}` : ''}`}
              right={<ChevronRight size={17} color={colors.muted} />}
              onPress={trocando ? undefined : () => trocar(p)}
              last={i === outros.length - 1}
            />
          ))}
        </Card>
        {!outros.length ? <Text style={styles.hint}>Você tem um único vínculo. Com mais de um perfil ou condomínio, a troca aparece aqui.</Text> : null}
      </Section>

      <Pressable onPress={logout} style={styles.logout}>
        <LogOut size={17} color={colors.red} />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </Pressable>
      <Text style={styles.footer}>{USE_MOCK ? 'Modo demonstração (API simulada)' : `API: ${API_URL}`}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20 },
  profileCopy: { flex: 1 },
  profileName: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  profileDetail: { color: colors.muted, fontSize: 12, marginTop: 5 },
  profileEmail: { color: colors.muted, fontSize: 12, marginTop: 3 },
  option: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 9 },
  optionIcon: { width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionCopy: { flex: 1 },
  optionTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  optionDetail: { color: colors.muted, fontSize: 12, marginTop: 4 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 8, lineHeight: 17 },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginTop: 18 },
  logoutText: { color: colors.red, fontSize: 13, fontWeight: '700' },
  footer: { color: '#9AA9A6', fontSize: 11, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
