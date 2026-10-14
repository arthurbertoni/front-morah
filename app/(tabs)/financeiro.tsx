import { ModuloDesativado } from '@/components/morah-ui';
import { useAuth } from '@/contexts/AuthContext';
import { useCondominio } from '@/contexts/CondominioContext';
import FinanceiroMorador from '@/telas/financeiro/FinanceiroMorador';
import FinanceiroSindico from '@/telas/financeiro/FinanceiroSindico';

export default function FinanceiroScreen() {
  const { perfil } = useAuth();
  const { moduloAtivo } = useCondominio();
  if (!moduloAtivo('financeiro')) return <ModuloDesativado nome="Financeiro" />;
  return perfil === 'sindico' ? <FinanceiroSindico /> : <FinanceiroMorador />;
}
