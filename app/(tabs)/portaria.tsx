import { ModuloDesativado } from '@/components/morah-ui';
import { useAuth } from '@/contexts/AuthContext';
import { useCondominio } from '@/contexts/CondominioContext';
import PortariaMorador from '@/telas/portaria/PortariaMorador';
import PortariaOperacao from '@/telas/portaria/PortariaOperacao';
import HistoricoAcessos from '@/telas/portaria/HistoricoAcessos';

export default function PortariaScreen() {
  const { perfil } = useAuth();
  const { moduloAtivo } = useCondominio();
  if (!moduloAtivo('portaria')) return <ModuloDesativado nome="Portaria" />;
  if (perfil === 'portaria') return <PortariaOperacao />;
  if (perfil === 'sindico') return <HistoricoAcessos />;
  return <PortariaMorador />;
}
