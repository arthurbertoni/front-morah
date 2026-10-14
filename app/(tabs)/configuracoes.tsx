import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Palette, Save, Trash2 } from 'lucide-react-native';
import { Button, Card, colors, Confirm, Feedback, Input, QueryState, Screen, Section, TopBar } from '@/components/morah-ui';
import { useAuth } from '@/contexts/AuthContext';
import { useCondominio, useTema } from '@/contexts/CondominioContext';
import { useAcao } from '@/hooks/useApi';
import { atualizarModulo, atualizarPersonalizacao } from '@/lib/api/endpoints/condominio';
import type { ModuloCondominio, PersonalizacaoUpdateRequest } from '@/lib/api/types';
import { dataHora } from '@/lib/format';
import { comumStyles } from '@/telas/comum';

const COR = /^#[0-9A-Fa-f]{6}$/;

// UC09 — Gerenciar Módulos (REQ011) e identidade visual do condomínio (síndico).
export default function ConfiguracoesScreen() {
  const { perfil } = useAuth();
  if (perfil !== 'sindico') {
    return (
      <Screen>
        <TopBar eyebrow="Condomínio" title="Indisponível" onBack={() => router.back()} />
        <Section>
          <QueryState loading={false} error="Somente o síndico altera a personalização e os módulos." empty />
        </Section>
      </Screen>
    );
  }
  return <Configuracoes />;
}

function Configuracoes() {
  const { personalizacao, modulos, recarregar, aplicarPersonalizacao, aplicarModulo } = useCondominio();
  const tema = useTema();
  const { mensagem, setMensagem, executando, executar } = useAcao();
  const [nome, setNome] = useState('');
  const [logo, setLogo] = useState('');
  const [primaria, setPrimaria] = useState('');
  const [secundaria, setSecundaria] = useState('');
  const [destaque, setDestaque] = useState('');
  const [desativando, setDesativando] = useState<ModuloCondominio | null>(null);

  useEffect(() => {
    if (!personalizacao) return;
    setNome(personalizacao.nomeExibicao);
    setLogo(personalizacao.logoUrl ?? '');
    setPrimaria(personalizacao.corPrimaria);
    setSecundaria(personalizacao.corSecundaria);
    setDestaque(personalizacao.corDestaque);
  }, [personalizacao]);

  const salvar = async (extra?: PersonalizacaoUpdateRequest) => {
    if (!personalizacao) return;
    const invalidas = [primaria, secundaria, destaque].filter((c) => !COR.test(c));
    if (invalidas.length) {
      setMensagem({ tipo: 'warning', texto: `Cor fora do formato #RRGGBB: ${invalidas.join(', ')}` });
      return;
    }
    // PATCH parcial: só os campos alterados.
    const corpo: PersonalizacaoUpdateRequest = extra ?? {
      nomeExibicao: nome.trim() !== personalizacao.nomeExibicao ? nome.trim() : undefined,
      logoUrl: logo.trim() && logo.trim() !== personalizacao.logoUrl ? logo.trim() : undefined,
      corPrimaria: primaria !== personalizacao.corPrimaria ? primaria : undefined,
      corSecundaria: secundaria !== personalizacao.corSecundaria ? secundaria : undefined,
      corDestaque: destaque !== personalizacao.corDestaque ? destaque : undefined,
    };
    const r = await executar(() => atualizarPersonalizacao(corpo), 'Identidade visual atualizada para todos os usuários do condomínio.');
    if (r.ok) aplicarPersonalizacao(r.resultado);
  };

  const alternar = async (m: ModuloCondominio, ativo: boolean) => {
    const r = await executar(() => atualizarModulo(m.modulo, { ativo }), `Módulo ${m.nome} ${ativo ? 'ativado' : 'desativado'}. O app dos moradores reflete a mudança em até 5 minutos.`);
    setDesativando(null);
    if (r.ok) aplicarModulo(r.resultado);
    else recarregar();
  };

  return (
    <Screen onRefresh={recarregar}>
      <TopBar eyebrow="Painel do síndico" title="Condomínio" />
      {mensagem ? <Feedback type={mensagem.tipo} onClose={() => setMensagem(null)}>{mensagem.texto}</Feedback> : null}

      <Section title="Módulos do aplicativo">
        <QueryState loading={!modulos.length} error={null} empty={!modulos.length} />
        {modulos.length ? (
          <Card>
            {modulos.map((m, i) => (
              <View key={m.modulo} style={[styles.modulo, i === modulos.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={comumStyles.itemCopy}>
                  <Text style={comumStyles.itemTitle}>{m.nome}</Text>
                  <Text style={comumStyles.itemDetail}>{m.ativo ? 'Ativo' : 'Desativado'}{m.atualizadoEm ? ` · alterado ${dataHora(m.atualizadoEm).toLowerCase()}` : ''}</Text>
                </View>
                <Switch
                  value={m.ativo}
                  disabled={executando}
                  trackColor={{ true: tema.primaria, false: colors.line }}
                  onValueChange={(valor) => (valor ? alternar(m, true) : setDesativando(m))}
                />
              </View>
            ))}
          </Card>
        ) : null}
        <Text style={[comumStyles.paragraph, { marginTop: 8 }]}>Login, Início, Notificações e Personalização não podem ser desativados.</Text>
      </Section>

      <Section title="Identidade visual">
        <QueryState loading={!personalizacao} error={null} empty={!personalizacao} />
        {personalizacao ? (
          <Card>
            <Input label="Nome de exibição" value={nome} onChangeText={setNome} />
            <Input label="URL do logo" value={logo} onChangeText={setLogo} placeholder="https://…/logo.png" autoCapitalize="none" keyboardType="url" />
            <View style={styles.cores}>
              <CampoCor label="Cor primária" valor={primaria} onChange={setPrimaria} />
              <CampoCor label="Cor secundária" valor={secundaria} onChange={setSecundaria} />
              <CampoCor label="Cor de destaque" valor={destaque} onChange={setDestaque} />
            </View>
            <View style={comumStyles.actions}>
              <Button label="Salvar alterações" icon={Save} loading={executando} onPress={() => salvar()} />
              {personalizacao.logoUrl ? <Button label="Remover logo" icon={Trash2} variant="danger" onPress={() => salvar({ logoUrl: null })} /> : null}
            </View>
            {personalizacao.atualizadoEm ? <Text style={[comumStyles.itemDetail, { marginTop: 12 }]}>Última alteração {dataHora(personalizacao.atualizadoEm).toLowerCase()}</Text> : null}
          </Card>
        ) : null}
      </Section>

      <Confirm
        visible={!!desativando}
        title={`Desativar ${desativando?.nome}?`}
        message="O ícone do módulo some do app de todos os usuários e as rotas dele passam a responder 403, inclusive para o síndico."
        confirmLabel="Desativar"
        danger
        loading={executando}
        onCancel={() => setDesativando(null)}
        onConfirm={() => desativando && alternar(desativando, false)}
      />
    </Screen>
  );
}

function CampoCor({ label, valor, onChange }: { label: string; valor: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.cor}>
      <View style={[styles.amostra, { backgroundColor: COR.test(valor) ? valor : colors.white }]}>
        {!COR.test(valor) ? <Palette size={14} color={colors.red} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Input label={label} value={valor} onChangeText={onChange} placeholder="#RRGGBB" autoCapitalize="characters" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modulo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  cores: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cor: { flexDirection: 'row', alignItems: 'center', gap: 10, flexGrow: 1, flexBasis: 200 },
  amostra: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
});
