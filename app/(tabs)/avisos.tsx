import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Bell, CalendarDays, ChevronRight, Megaphone, Pencil, Plus, Save, Trash2 } from 'lucide-react-native';
import {
  Button,
  Card,
  Chips,
  colors,
  Confirm,
  DetailRow,
  Feedback,
  Input,
  LoadMore,
  ModuloDesativado,
  QueryState,
  Screen,
  Section,
  Sheet,
  StatusPill,
  TopBar,
} from '@/components/morah-ui';
import { useAuth } from '@/contexts/AuthContext';
import { useCondominio, useTema } from '@/contexts/CondominioContext';
import { useAcao, useApi, usePaged, useRecarregarAoFocar } from '@/hooks/useApi';
import { ApiError } from '@/lib/api/client';
import { atualizarAviso, criarAviso, getAviso, listarAvisos, removerAviso } from '@/lib/api/endpoints/avisos';
import type { Aviso, PrioridadeAviso, TipoPublicoAlvo } from '@/lib/api/types';
import { dataHora, rotuloCategoria } from '@/lib/format';
import { comumStyles, useNomeCondominio } from '@/telas/comum';

const CATEGORIAS = ['manutencao', 'assembleia', 'seguranca', 'financeiro', 'geral'];

// UC25 — Visualizar Avisos (todos) e UC31 — Gerenciar Avisos (síndico).
export default function AvisosScreen() {
  const { moduloAtivo } = useCondominio();
  if (!moduloAtivo('avisos')) return <ModuloDesativado nome="Avisos" />;
  return <Mural />;
}

function Mural() {
  const tema = useTema();
  const { perfil } = useAuth();
  const nomeCondominio = useNomeCondominio();
  const params = useLocalSearchParams<{ aviso?: string }>();
  const ehSindico = perfil === 'sindico';
  const [categoria, setCategoria] = useState('todas');
  const [prioridade, setPrioridade] = useState<'todas' | PrioridadeAviso>('todas');
  const [aberto, setAberto] = useState<number | null>(null);
  const [editando, setEditando] = useState<Aviso | 'novo' | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const avisos = usePaged(
    (page) => listarAvisos({ page, size: 10, categoria: categoria === 'todas' ? undefined : categoria, prioridade: prioridade === 'todas' ? undefined : prioridade }),
    [categoria, prioridade],
  );
  useRecarregarAoFocar(avisos.reload);

  useEffect(() => {
    if (params.aviso) setAberto(Number(params.aviso));
  }, [params.aviso]);

  const naoLidos = avisos.itens.filter((a) => !a.lidoPeloUsuario).length;
  const [destaque, ...demais] = avisos.itens;

  return (
    <Screen onRefresh={avisos.reload} refreshing={avisos.loading && avisos.itens.length > 0}>
      <TopBar
        eyebrow={`Mural · ${nomeCondominio}`}
        title="Avisos"
        action={
          ehSindico ? (
            <Button label="Novo aviso" icon={Plus} small onPress={() => setEditando('novo')} />
          ) : (
            <View style={[styles.unread, { backgroundColor: tema.primariaSoft }]}>
              <Bell size={16} color={tema.primaria} />
              <Text style={[styles.unreadText, { color: tema.primaria }]}>{naoLidos} não lido(s)</Text>
            </View>
          )
        }
      />
      {aviso ? <Feedback type="success" onClose={() => setAviso(null)}>{aviso}</Feedback> : null}

      <Section>
        <Chips scroll value={categoria} onChange={setCategoria} options={[{ value: 'todas', label: 'Todas' }, ...CATEGORIAS.map((c) => ({ value: c, label: rotuloCategoria(c) }))]} />
        <View style={{ height: 8 }} />
        <Chips value={prioridade} onChange={setPrioridade} options={[{ value: 'todas', label: 'Qualquer prioridade' }, { value: 'urgente', label: 'Urgentes' }, { value: 'normal', label: 'Normais' }]} />
      </Section>

      <Section title="Comunicados vigentes">
        <QueryState loading={avisos.loading} error={avisos.error} empty={!avisos.itens.length} onRetry={avisos.reload} emptyTitle="Nenhum aviso" emptyDescription="Não há comunicados vigentes com esses filtros." />
        {destaque ? (
          <Card style={[styles.featured, { backgroundColor: tema.primariaEscura }]} onPress={() => setAberto(destaque.id)}>
            <View style={[styles.featuredIcon, { backgroundColor: tema.primaria }]}>
              <Megaphone size={21} color={colors.white} />
            </View>
            <View style={comumStyles.itemCopy}>
              <View style={comumStyles.rowBetween}>
                <StatusPill label={destaque.prioridade === 'urgente' ? 'Urgente' : rotuloCategoria(destaque.categoria)} tone={destaque.prioridade === 'urgente' ? 'orange' : 'teal'} />
                <Text style={styles.featuredDate}>{dataHora(destaque.publicadoEm)}</Text>
              </View>
              <Text style={styles.featuredTitle}>{destaque.titulo}</Text>
              <Text style={styles.featuredText} numberOfLines={2}>{destaque.conteudo}</Text>
              <View style={styles.readRow}>
                <Text style={styles.readText}>{destaque.lidoPeloUsuario ? 'Lido' : 'Ler comunicado'}</Text>
                <ChevronRight size={15} color="#C9E5E1" />
              </View>
            </View>
          </Card>
        ) : null}
        {demais.map((a) => (
          <Card key={a.id} style={styles.notice} onPress={() => setAberto(a.id)}>
            <View style={[comumStyles.itemIcon, { backgroundColor: a.prioridade === 'urgente' ? colors.orangeSoft : tema.primariaSoft }]}>
              {a.prioridade === 'urgente' ? <Megaphone size={18} color={colors.orange} /> : <CalendarDays size={18} color={tema.primaria} />}
            </View>
            <View style={comumStyles.itemCopy}>
              <View style={comumStyles.rowBetween}>
                <Text style={[styles.noticeCategory, { color: tema.primaria }]}>{rotuloCategoria(a.categoria)}{a.publicoAlvo.tipo !== 'condominio' ? ` · ${a.publicoAlvo.tipo === 'bloco' ? 'seu bloco' : 'sua unidade'}` : ''}</Text>
                <Text style={styles.noticeDate}>{dataHora(a.publicadoEm)}</Text>
              </View>
              <Text style={comumStyles.itemTitle}>{a.titulo}</Text>
              <Text style={comumStyles.itemDetail} numberOfLines={2}>{a.conteudo}</Text>
            </View>
            {!a.lidoPeloUsuario ? <View style={[styles.dot, { backgroundColor: tema.destaque }]} /> : null}
          </Card>
        ))}
        <LoadMore hasMore={avisos.hasMore} loading={avisos.loading} onPress={avisos.loadMore} />
      </Section>

      <DetalheAviso
        avisoId={aberto}
        ehSindico={ehSindico}
        onClose={() => {
          setAberto(null);
          avisos.reload();
        }}
        onEditar={(a) => {
          setAberto(null);
          setEditando(a);
        }}
        onRemovido={() => {
          setAberto(null);
          setAviso('Aviso removido: ele deixou de ser exibido aos moradores.');
          avisos.reload();
        }}
      />
      <FormAviso
        alvo={editando}
        onClose={() => setEditando(null)}
        onSalvo={(texto) => {
          setEditando(null);
          setAviso(texto);
          avisos.reload();
        }}
      />
    </Screen>
  );
}

// GET /avisos/{id} — marca como lido. 410 quando o aviso saiu de vigência.
function DetalheAviso({ avisoId, ehSindico, onClose, onEditar, onRemovido }: { avisoId: number | null; ehSindico: boolean; onClose: () => void; onEditar: (a: Aviso) => void; onRemovido: () => void }) {
  const [erro410, setErro410] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const { mensagem, executando, executar } = useAcao();
  const detalhe = useApi(async () => {
    setErro410(false);
    if (!avisoId) return null;
    try {
      return await getAviso(avisoId);
    } catch (erro) {
      if (erro instanceof ApiError && erro.status === 410) {
        setErro410(true);
        return null;
      }
      throw erro;
    }
  }, [avisoId]);
  const a = detalhe.data;

  const remover = async () => {
    if (!a) return;
    const r = await executar(() => removerAviso(a.id));
    setConfirmar(false);
    if (r.ok) onRemovido();
  };

  return (
    <Sheet visible={avisoId !== null} title={a?.titulo ?? 'Aviso'} onClose={onClose}>
      {erro410 ? (
        <Feedback type="warning">Este aviso não está mais em vigência.</Feedback>
      ) : (
        <QueryState loading={detalhe.loading} error={detalhe.error} empty={!a} onRetry={detalhe.reload} />
      )}
      {a ? (
        <>
          <View style={[comumStyles.row, { marginBottom: 12 }]}>
            {a.prioridade === 'urgente' ? <StatusPill label="Urgente" tone="orange" /> : null}
            <StatusPill label={rotuloCategoria(a.categoria)} />
          </View>
          <Text style={styles.conteudo}>{a.conteudo}</Text>
          <DetailRow label="Publicado" value={`${dataHora(a.publicadoEm)} por ${a.autor.nome}`} />
          <DetailRow label="Público" value={a.publicoAlvo.tipo === 'condominio' ? 'Todo o condomínio' : a.publicoAlvo.tipo === 'bloco' ? `Bloco ${a.publicoAlvo.blocoId}` : `Unidade ${a.publicoAlvo.unidadeId}`} />
          {a.expiraEm ? <DetailRow label="Vigente até" value={dataHora(a.expiraEm)} /> : null}
          {ehSindico ? (
            <View style={comumStyles.actions}>
              <Button label="Editar" icon={Pencil} variant="outline" onPress={() => onEditar(a)} />
              <Button label="Remover" icon={Trash2} variant="danger" onPress={() => setConfirmar(true)} />
            </View>
          ) : null}
          {mensagem ? <Feedback type={mensagem.tipo}>{mensagem.texto}</Feedback> : null}
        </>
      ) : null}
      <View style={{ height: 12 }} />
      <Confirm visible={confirmar} title="Remover aviso?" message="O aviso não é apagado: ele expira agora e deixa de aparecer no mural." confirmLabel="Remover" danger loading={executando} onCancel={() => setConfirmar(false)} onConfirm={remover} />
    </Sheet>
  );
}

/** "AAAA-MM-DD" → fim do dia local em ISO, para `expiraEm`. */
function fimDoDia(texto: string) {
  const [a, m, d] = texto.split('-').map(Number);
  return new Date(a, m - 1, d, 23, 59, 59).toISOString();
}

// POST /avisos (novo) ou PATCH /avisos/{id} (só os campos alterados)
function FormAviso({ alvo, onClose, onSalvo }: { alvo: Aviso | 'novo' | null; onClose: () => void; onSalvo: (texto: string) => void }) {
  const { mensagem, setMensagem, executando, executar } = useAcao();
  const original = alvo && alvo !== 'novo' ? alvo : null;
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [categoria, setCategoria] = useState('geral');
  const [prioridade, setPrioridade] = useState<PrioridadeAviso>('normal');
  const [publico, setPublico] = useState<TipoPublicoAlvo>('condominio');
  const [alvoId, setAlvoId] = useState('');
  const [expira, setExpira] = useState('');

  useEffect(() => {
    if (!alvo) return;
    setMensagem(null);
    setTitulo(original?.titulo ?? '');
    setConteudo(original?.conteudo ?? '');
    setCategoria(original?.categoria ?? 'geral');
    setPrioridade(original?.prioridade ?? 'normal');
    setPublico(original?.publicoAlvo.tipo ?? 'condominio');
    setAlvoId(String(original?.publicoAlvo.blocoId ?? original?.publicoAlvo.unidadeId ?? ''));
    setExpira(original?.expiraEm ? original.expiraEm.slice(0, 10) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvo]);

  const salvar = async () => {
    if (expira && !/^\d{4}-\d{2}-\d{2}$/.test(expira)) {
      setMensagem({ tipo: 'warning', texto: 'Data de expiração no formato AAAA-MM-DD.' });
      return;
    }
    const expiraEm = expira ? fimDoDia(expira) : undefined;
    if (original) {
      // PATCH parcial: envia só o que mudou.
      const mudancas = {
        titulo: titulo !== original.titulo ? titulo.trim() : undefined,
        conteudo: conteudo !== original.conteudo ? conteudo.trim() : undefined,
        categoria: categoria !== original.categoria ? categoria : undefined,
        prioridade: prioridade !== original.prioridade ? prioridade : undefined,
        expiraEm: expira && expira !== original.expiraEm?.slice(0, 10) ? expiraEm : undefined,
      };
      const r = await executar(() => atualizarAviso(original.id, mudancas));
      if (r.ok) onSalvo('Aviso atualizado.');
      return;
    }
    const id = Number(alvoId);
    const r = await executar(() =>
      criarAviso({
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
        categoria,
        prioridade,
        publicoAlvo: publico === 'condominio' ? { tipo: 'condominio' } : publico === 'bloco' ? { tipo: 'bloco', blocoId: id } : { tipo: 'unidade', unidadeId: id },
        expiraEm,
      }),
    );
    if (r.ok) onSalvo('Aviso publicado. O público-alvo foi notificado.');
  };

  return (
    <Sheet visible={!!alvo} title={original ? 'Editar aviso' : 'Novo aviso'} onClose={onClose}>
      <Input label="Título" value={titulo} onChangeText={setTitulo} placeholder="Ex.: Manutenção da piscina" />
      <Input label="Conteúdo" value={conteudo} onChangeText={setConteudo} multiline placeholder="Escreva o comunicado" />
      <Text style={comumStyles.label}>Categoria</Text>
      <View style={{ marginBottom: 14 }}>
        <Chips value={categoria} onChange={setCategoria} options={CATEGORIAS.map((c) => ({ value: c, label: rotuloCategoria(c) }))} />
      </View>
      <Text style={comumStyles.label}>Prioridade</Text>
      <View style={{ marginBottom: 14 }}>
        <Chips value={prioridade} onChange={setPrioridade} options={[{ value: 'normal', label: 'Normal' }, { value: 'urgente', label: 'Urgente (fixa no topo)' }]} />
      </View>
      {!original ? (
        <>
          <Text style={comumStyles.label}>Público-alvo</Text>
          <View style={{ marginBottom: 14 }}>
            <Chips value={publico} onChange={setPublico} options={[{ value: 'condominio', label: 'Condomínio' }, { value: 'bloco', label: 'Bloco' }, { value: 'unidade', label: 'Unidade' }]} />
          </View>
          {publico !== 'condominio' ? <Input label={publico === 'bloco' ? 'Id do bloco' : 'Id da unidade'} value={alvoId} onChangeText={setAlvoId} keyboardType="number-pad" /> : null}
        </>
      ) : (
        <Text style={[comumStyles.paragraph, { marginBottom: 14 }]}>O público-alvo não pode ser alterado (o contrato não permite no PATCH).</Text>
      )}
      <Input label="Vigente até (opcional)" value={expira} onChangeText={setExpira} placeholder="AAAA-MM-DD" autoCapitalize="none" />
      <Button label={original ? 'Salvar alterações' : 'Publicar aviso'} icon={original ? Save : Megaphone} loading={executando} onPress={salvar} />
      {mensagem ? <Feedback type={mensagem.tipo}>{mensagem.texto}</Feedback> : null}
      <View style={{ height: 12 }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  unread: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 },
  unreadText: { fontSize: 12, fontWeight: '700' },
  featured: { flexDirection: 'row', gap: 16, borderRadius: 19, padding: 19, marginBottom: 12, borderWidth: 0 },
  featuredIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  featuredDate: { color: '#C9DDE0', fontSize: 12 },
  featuredTitle: { color: colors.white, fontSize: 17, fontWeight: '700', marginTop: 10 },
  featuredText: { color: '#D2DFE0', fontSize: 13, lineHeight: 19, marginTop: 6 },
  readRow: { flexDirection: 'row', gap: 7, alignItems: 'center', marginTop: 15 },
  readText: { color: '#C9E5E1', fontSize: 12, fontWeight: '700' },
  notice: { flexDirection: 'row', gap: 13, marginBottom: 10, alignItems: 'center' },
  noticeCategory: { fontSize: 11, fontWeight: '700' },
  noticeDate: { color: colors.muted, fontSize: 11 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  conteudo: { color: colors.ink, fontSize: 14, lineHeight: 22, marginBottom: 14 },
});
