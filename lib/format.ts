import type {
  Perfil,
  StatusAutorizacaoVisita,
  StatusCobranca,
  StatusEncomenda,
  StatusReserva,
  TipoVinculo,
} from '@/lib/api/types';

// Formatação pt-BR e rótulos/cores dos enums do contrato.

export type Tom = 'teal' | 'orange' | 'red' | 'blue' | 'green';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const pad = (n: number) => String(n).padStart(2, '0');

export function moeda(valor?: number | null) {
  return (valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** "2026-09" → "Setembro 2026" */
export function competencia(valor?: string) {
  if (!valor) return '';
  const [ano, mes] = valor.split('-').map(Number);
  const nome = MESES[(mes ?? 1) - 1] ?? '';
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} ${ano}`;
}

/** Aceita "AAAA-MM-DD" (data local) ou ISO completo. */
function paraData(valor: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split('-').map(Number);
    return new Date(a, m - 1, d);
  }
  return new Date(valor);
}

export function data(valor?: string) {
  if (!valor) return '';
  const d = paraData(valor);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function dataCurta(valor?: string) {
  if (!valor) return '';
  const d = paraData(valor);
  return `${pad(d.getDate())} ${MESES[d.getMonth()].slice(0, 3)}`;
}

export function hora(valor?: string) {
  if (!valor) return '';
  const d = new Date(valor);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Hoje, 14:30", "Ontem, 09:10" ou "12/09, 18:00". */
export function dataHora(valor?: string) {
  if (!valor) return '';
  const d = new Date(valor);
  const hojeLocal = dataLocal();
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const dia = dataLocal(d);
  if (dia === hojeLocal) return `Hoje, ${hora(valor)}`;
  if (dia === dataLocal(ontem)) return `Ontem, ${hora(valor)}`;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}, ${hora(valor)}`;
}

/** Data local AAAA-MM-DD (formato `date` do contrato). */
export function dataLocal(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function competenciaAtual(deslocamentoMeses = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + deslocamentoMeses);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** "1.600,50" ou "1600.5" → 1600.5 (NaN se inválido). */
export function numero(texto: string) {
  const limpo = texto.trim().replace(/\s/g, '');
  if (!limpo) return NaN;
  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  return Number(normalizado);
}

export function iniciais(nome?: string) {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

export const ROTULO_PERFIL: Record<Perfil, string> = {
  morador: 'Morador(a)',
  proprietario: 'Proprietário(a)',
  sindico: 'Síndico(a)',
  portaria: 'Portaria',
};

export const STATUS_COBRANCA: Record<StatusCobranca, { rotulo: string; tom: Tom }> = {
  pendente: { rotulo: 'Pendente', tom: 'orange' },
  atrasado: { rotulo: 'Atrasado', tom: 'red' },
  pago: { rotulo: 'Pago', tom: 'green' },
  cancelado: { rotulo: 'Cancelado', tom: 'blue' },
};

export const STATUS_AUTORIZACAO: Record<StatusAutorizacaoVisita, { rotulo: string; tom: Tom }> = {
  pendente: { rotulo: 'Pendente', tom: 'orange' },
  autorizada: { rotulo: 'Autorizada', tom: 'green' },
  recusada: { rotulo: 'Recusada', tom: 'red' },
  expirada: { rotulo: 'Expirada', tom: 'blue' },
};

export const STATUS_ENCOMENDA: Record<StatusEncomenda, { rotulo: string; tom: Tom }> = {
  aguardando_retirada: { rotulo: 'Aguardando retirada', tom: 'orange' },
  retirada: { rotulo: 'Retirada', tom: 'green' },
  extraviada: { rotulo: 'Extraviada', tom: 'red' },
};

export const STATUS_RESERVA: Record<StatusReserva, { rotulo: string; tom: Tom }> = {
  confirmada: { rotulo: 'Confirmada', tom: 'teal' },
  cancelada: { rotulo: 'Cancelada', tom: 'red' },
  concluida: { rotulo: 'Concluída', tom: 'green' },
  nao_compareceu: { rotulo: 'Não compareceu', tom: 'orange' },
};

export const ROTULO_VINCULO: Record<TipoVinculo, string> = {
  proprietario: 'Proprietário',
  inquilino: 'Inquilino',
  dependente: 'Dependente',
};

/** "manutencao" → "Manutenção" para as categorias mais comuns; demais só capitalizadas. */
export function rotuloCategoria(categoria?: string) {
  if (!categoria) return 'Geral';
  const conhecidas: Record<string, string> = { manutencao: 'Manutenção', assembleia: 'Assembleia', seguranca: 'Segurança', geral: 'Geral', financeiro: 'Financeiro', obras: 'Obras' };
  return conhecidas[categoria] ?? categoria.charAt(0).toUpperCase() + categoria.slice(1).replace(/_/g, ' ');
}
