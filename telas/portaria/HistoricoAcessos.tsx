import { useState } from 'react';
import { Text, View } from 'react-native';
import { ChevronLeft, ChevronRight, DoorOpen, LogOut } from 'lucide-react-native';
import { Button, Card, colors, LoadMore, QueryState, Screen, Section, StatusPill, TopBar } from '@/components/morah-ui';
import { useTema } from '@/contexts/CondominioContext';
import { usePaged, useRecarregarAoFocar } from '@/hooks/useApi';
import { listarAcessos } from '@/lib/api/endpoints/portaria';
import type { Acesso } from '@/lib/api/types';
import { data as formatarData, dataLocal, hora } from '@/lib/format';
import { comumStyles, useNomeCondominio } from '@/telas/comum';

function deslocarDia(dia: string, dias: number) {
  const [a, m, d] = dia.split('-').map(Number);
  return dataLocal(new Date(a, m - 1, d + dias));
}

/** GET /portaria/acessos com filtro por dia. A portaria pode registrar a saída de quem está no condomínio. */
export function ListaAcessos({ onRegistrarSaida, versao = 0 }: { onRegistrarSaida?: (acesso: Acesso) => void; versao?: number }) {
  const tema = useTema();
  const [dia, setDia] = useState(dataLocal());
  const acessos = usePaged((page) => listarAcessos({ page, size: 10, data: dia }), [dia, versao]);
  useRecarregarAoFocar(acessos.reload);

  return (
    <>
      <View style={[comumStyles.rowBetween, { marginBottom: 12 }]}>
        <Button label="" icon={ChevronLeft} variant="outline" small onPress={() => setDia(deslocarDia(dia, -1))} />
        <Text style={comumStyles.itemTitle}>{dia === dataLocal() ? `Hoje · ${formatarData(dia)}` : formatarData(dia)}</Text>
        <Button label="" icon={ChevronRight} variant="outline" small disabled={dia >= dataLocal()} onPress={() => setDia(deslocarDia(dia, 1))} />
      </View>
      <QueryState loading={acessos.loading} error={acessos.error} empty={!acessos.itens.length} onRetry={acessos.reload} emptyTitle="Nenhum acesso" emptyDescription="Nenhuma entrada registrada neste dia." />
      {acessos.itens.map((a) => (
        <Card key={a.id} style={comumStyles.listItem}>
          <View style={[comumStyles.itemIcon, { backgroundColor: a.status === 'no_condominio' ? tema.primariaSoft : colors.soft }]}>
            <DoorOpen size={18} color={a.status === 'no_condominio' ? tema.primaria : colors.muted} />
          </View>
          <View style={comumStyles.itemCopy}>
            <Text style={comumStyles.itemTitle}>{a.visitante.nome}</Text>
            <Text style={comumStyles.itemDetail}>
              Entrada {hora(a.entrada)}
              {a.saida ? ` · saída ${hora(a.saida)}` : ''}
              {a.autorizacaoId ? ` · autorização #${a.autorizacaoId}` : ' · liberação manual'}
            </Text>
          </View>
          {a.status === 'no_condominio' && onRegistrarSaida ? (
            <Button label="Saída" icon={LogOut} variant="outline" small onPress={() => onRegistrarSaida(a)} />
          ) : (
            <StatusPill label={a.status === 'no_condominio' ? 'No condomínio' : 'Saiu'} tone={a.status === 'no_condominio' ? 'teal' : 'blue'} />
          )}
        </Card>
      ))}
      <LoadMore hasMore={acessos.hasMore} loading={acessos.loading} onPress={acessos.loadMore} />
    </>
  );
}

// Síndico: consulta somente leitura do histórico de acessos.
export default function HistoricoAcessos() {
  const nomeCondominio = useNomeCondominio();
  return (
    <Screen>
      <TopBar eyebrow={nomeCondominio} title="Acessos" />
      <Section title="Histórico de acessos">
        <ListaAcessos />
      </Section>
    </Screen>
  );
}
