// Banco em memória do servidor simulado. Espelha o seed do backend (docs/Pront doBack.txt,
// seção "Dados iniciais") com alguns registros a mais para as telas terem o que mostrar.

import type {
  Aviso,
  DocumentoFinanceiro,
  ModuloCodigo,
  Notificacao,
  Ocorrencia,
  Perfil,
  Personalizacao,
  PublicoAlvo,
  StatusAutorizacaoRetirada,
  StatusCobranca,
  StatusEncomenda,
  StatusReserva,
  StatusSolicitacaoVinculo,
  TipoAcesso,
  TipoRateio,
  TipoVinculo,
} from '../types';

export type PessoaDb = { id: number; nome: string; cpf: string; email: string; telefone?: string; senha: string };
export type PessoaPerfilDb = { id: number; pessoaId: number; perfil: Perfil; condominioId: number; unidadeId?: number };
export type SessaoDb = {
  id: string;
  pessoaId: number;
  perfil: Perfil;
  condominioId: number;
  unidadeId?: number;
  refreshToken: string;
  refreshExpiraEm: number;
};
export type UnidadeDb = {
  id: number;
  condominioId: number;
  blocoId: number;
  identificacao: string;
  tipo: string;
  areaM2: number;
  fracaoIdeal?: number;
  status: string;
};
export type VinculoDb = {
  id: number;
  unidadeId: number;
  pessoaId: number;
  tipoVinculo: TipoVinculo;
  principal: boolean;
  inicio: string;
  fim?: string;
};
export type SolicitacaoDb = {
  id: number;
  unidadeId: number;
  tipoVinculo: TipoVinculo;
  nomeSolicitado: string;
  cpf?: string;
  status: StatusSolicitacaoVinculo;
  solicitadoEm: string;
};
export type TaxaDb = {
  id: number;
  condominioId: number;
  descricao: string;
  competencia: string;
  valor: number;
  tipoRateio: TipoRateio;
  vencimentoDia: number;
};
export type CobrancaDb = {
  id: number;
  taxaId: number;
  unidadeId: number;
  taxaDescricao: string;
  competencia: string;
  vencimento: string;
  valorOriginal: number;
  multa: number;
  juros: number;
  /** Persistido sem o "atrasado", que é calculado na leitura. */
  status: Exclude<StatusCobranca, 'atrasado'>;
};
export type VisitanteDb = { id: number; nome: string; documento?: string; telefone?: string; observacao?: string };
export type AutorizacaoVisitaDb = {
  id: number;
  condominioId: number;
  visitanteId: number;
  unidadeId: number;
  motivo: string;
  fotoUrl?: string;
  solicitadoEm: string;
  respondidoEm?: string;
  /** Persistido sem o "expirada", que é calculado na leitura. */
  status: 'pendente' | 'autorizada' | 'recusada';
};
export type AcessoDb = {
  id: number;
  condominioId: number;
  autorizacaoId?: number;
  visitanteId: number;
  entrada: string;
  saida?: string;
  tipo: TipoAcesso;
};
export type AvisoDb = Omit<Aviso, 'autor' | 'lidoPeloUsuario' | 'publicoAlvo'> & {
  condominioId: number;
  autorId: number;
  publicoAlvo: PublicoAlvo;
};
export type AreaComumDb = {
  id: number;
  condominioId: number;
  nome: string;
  descricao: string;
  capacidade: number;
  taxa: number;
  requerReserva: boolean;
  status: string;
};
export type ReservaDb = {
  id: number;
  areaComumId: number;
  unidadeId: number;
  solicitanteId: number;
  inicio: string;
  fim: string;
  status: StatusReserva;
  valor: number;
};
export type EncomendaDb = {
  id: number;
  condominioId: number;
  unidadeId: number;
  remetente?: string;
  transportadora: string;
  codigoRastreio?: string;
  codigoRetirada: string;
  fotoUrl?: string;
  recebidaEm: string;
  retiradaEm?: string;
  status: StatusEncomenda;
};
export type AutorizacaoRetiradaDb = {
  id: number;
  encomendaId: number;
  nomeTerceiro: string;
  documento: string;
  codigo: string;
  validade: string;
  status: StatusAutorizacaoRetirada;
};
export type OcorrenciaDb = Ocorrencia & { condominioId: number; reservaId?: number; encomendaId?: number };
export type NotificacaoDb = Notificacao & { pessoaId: number };
export type ModuloDb = { condominioId: number; modulo: ModuloCodigo; ativo: boolean; atualizadoEm: string };

export type MockDb = {
  seq: number;
  pessoas: PessoaDb[];
  perfis: PessoaPerfilDb[];
  sessoes: SessaoDb[];
  condominios: { id: number; nome: string }[];
  blocos: { id: number; condominioId: number; nome: string }[];
  unidades: UnidadeDb[];
  vinculos: VinculoDb[];
  solicitacoes: SolicitacaoDb[];
  taxas: TaxaDb[];
  cobrancas: CobrancaDb[];
  documentos: (DocumentoFinanceiro & { condominioId: number })[];
  visitantes: VisitanteDb[];
  autorizacoes: AutorizacaoVisitaDb[];
  acessos: AcessoDb[];
  avisos: AvisoDb[];
  leituras: { pessoaId: number; avisoId: number }[];
  areas: AreaComumDb[];
  reservas: ReservaDb[];
  vistorias: { reservaId: number; momento: string; dano: boolean; observacao?: string; fotosUrl?: string[] }[];
  encomendas: EncomendaDb[];
  autorizacoesRetirada: AutorizacaoRetiradaDb[];
  ocorrencias: OcorrenciaDb[];
  notificacoes: NotificacaoDb[];
  personalizacoes: Personalizacao[];
  modulos: ModuloDb[];
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Data local no formato AAAA-MM-DD. */
export function dataLocal(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function horaHoje(hora: number, deslocamentoDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + deslocamentoDias);
  d.setHours(hora, 0, 0, 0);
  return d.toISOString();
}

function competencia(deslocamentoMeses: number) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + deslocamentoMeses);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export const SENHA_DEMO = 'demo123';

export function criarSeed(): MockDb {
  const agora = new Date();
  const minutosAtras = (min: number) => new Date(agora.getTime() - min * 60000).toISOString();
  const compAnterior = competencia(-1);
  const compRetrasada = competencia(-2);
  const compAtual = competencia(0);

  return {
    seq: 1000,
    condominios: [{ id: 1, nome: 'Condomínio Demo' }],
    blocos: [
      { id: 1, condominioId: 1, nome: 'Bloco A' },
      { id: 2, condominioId: 1, nome: 'Bloco B' },
    ],
    unidades: [
      { id: 1, condominioId: 1, blocoId: 1, identificacao: 'Apto 302', tipo: 'apartamento', areaM2: 78, fracaoIdeal: 0.5, status: 'ocupada' },
      { id: 2, condominioId: 1, blocoId: 2, identificacao: 'Apto 502', tipo: 'apartamento', areaM2: 78, fracaoIdeal: 0.5, status: 'ocupada' },
    ],
    pessoas: [
      { id: 1, nome: 'Helena Prado', cpf: '11122233344', email: 'helena.prado@demo.com.br', telefone: '(11) 90000-0001', senha: SENHA_DEMO },
      { id: 2, nome: 'Rafael Nunes', cpf: '22233344455', email: 'rafael.nunes@demo.com.br', telefone: '(11) 90000-0002', senha: SENHA_DEMO },
      { id: 3, nome: 'Camila Duarte', cpf: '33344455566', email: 'camila.duarte@demo.com.br', telefone: '(11) 90000-0003', senha: SENHA_DEMO },
      { id: 4, nome: 'Portaria Central', cpf: '44455566677', email: 'portaria@demo.com.br', senha: SENHA_DEMO },
    ],
    perfis: [
      { id: 1, pessoaId: 1, perfil: 'sindico', condominioId: 1 },
      { id: 2, pessoaId: 2, perfil: 'proprietario', condominioId: 1, unidadeId: 1 },
      { id: 3, pessoaId: 3, perfil: 'morador', condominioId: 1, unidadeId: 2 },
      { id: 4, pessoaId: 4, perfil: 'portaria', condominioId: 1 },
      // Helena também é proprietária do Apto 502 (alugado para a Camila): permite demonstrar a troca de contexto.
      { id: 5, pessoaId: 1, perfil: 'proprietario', condominioId: 1, unidadeId: 2 },
    ],
    sessoes: [],
    vinculos: [
      { id: 1, unidadeId: 1, pessoaId: 2, tipoVinculo: 'proprietario', principal: true, inicio: '2024-01-10' },
      { id: 2, unidadeId: 2, pessoaId: 3, tipoVinculo: 'inquilino', principal: false, inicio: '2025-03-01' },
      { id: 3, unidadeId: 2, pessoaId: 1, tipoVinculo: 'proprietario', principal: true, inicio: '2022-06-15' },
    ],
    solicitacoes: [],
    taxas: [
      { id: 1, condominioId: 1, descricao: 'Taxa condominial', competencia: compRetrasada, valor: 1600, tipoRateio: 'igualitario', vencimentoDia: 10 },
      { id: 2, condominioId: 1, descricao: 'Taxa condominial', competencia: compAnterior, valor: 1600, tipoRateio: 'igualitario', vencimentoDia: 10 },
      { id: 3, condominioId: 1, descricao: 'Taxa condominial', competencia: compAtual, valor: 1700, tipoRateio: 'fracao_ideal', vencimentoDia: 28 },
    ],
    cobrancas: [
      { id: 1, taxaId: 1, unidadeId: 1, taxaDescricao: 'Taxa condominial', competencia: compRetrasada, vencimento: `${compRetrasada}-10`, valorOriginal: 800, multa: 0, juros: 0, status: 'pago' },
      { id: 2, taxaId: 1, unidadeId: 2, taxaDescricao: 'Taxa condominial', competencia: compRetrasada, vencimento: `${compRetrasada}-10`, valorOriginal: 800, multa: 0, juros: 0, status: 'pago' },
      { id: 3, taxaId: 2, unidadeId: 1, taxaDescricao: 'Taxa condominial', competencia: compAnterior, vencimento: `${compAnterior}-10`, valorOriginal: 800, multa: 0, juros: 0, status: 'pago' },
      { id: 4, taxaId: 2, unidadeId: 2, taxaDescricao: 'Taxa condominial', competencia: compAnterior, vencimento: `${compAnterior}-10`, valorOriginal: 800, multa: 16, juros: 4.27, status: 'pendente' },
      { id: 5, taxaId: 3, unidadeId: 1, taxaDescricao: 'Taxa condominial', competencia: compAtual, vencimento: `${compAtual}-28`, valorOriginal: 850, multa: 0, juros: 0, status: 'pendente' },
      { id: 6, taxaId: 3, unidadeId: 2, taxaDescricao: 'Taxa condominial', competencia: compAtual, vencimento: `${compAtual}-28`, valorOriginal: 850, multa: 0, juros: 0, status: 'pendente' },
    ],
    documentos: [
      { id: 1, condominioId: 1, tipo: 'prestacao_contas', titulo: `Prestação de contas · ${compAnterior}`, arquivoUrl: 'https://example.com/morah/prestacao-contas.pdf', competencia: `${compAnterior}-01`, publicadoEm: minutosAtras(60 * 24 * 5) },
      { id: 2, condominioId: 1, tipo: 'nota_fiscal', titulo: 'Nota fiscal — manutenção de elevadores', arquivoUrl: 'https://example.com/morah/nf-elevadores.pdf', competencia: `${compAnterior}-01`, publicadoEm: minutosAtras(60 * 24 * 8) },
    ],
    visitantes: [{ id: 1, nome: 'Carlos Mendes', documento: '12.345.678-9', telefone: '(11) 98888-1111' }],
    autorizacoes: [
      { id: 1, condominioId: 1, visitanteId: 1, unidadeId: 1, motivo: 'Visita', solicitadoEm: minutosAtras(3), status: 'pendente' },
    ],
    acessos: [],
    avisos: [
      {
        id: 1,
        condominioId: 1,
        autorId: 1,
        titulo: 'Manutenção dos elevadores',
        conteudo: 'A manutenção preventiva dos elevadores será realizada amanhã, das 9h às 12h. Utilize as escadas nesse período.',
        categoria: 'manutencao',
        prioridade: 'urgente',
        publicoAlvo: { tipo: 'condominio' },
        publicadoEm: minutosAtras(90),
      },
      {
        id: 2,
        condominioId: 1,
        autorId: 1,
        titulo: 'Assembleia ordinária',
        conteudo: 'A próxima assembleia será realizada no salão de festas, às 19h30. Pauta: prestação de contas e obras.',
        categoria: 'assembleia',
        prioridade: 'normal',
        publicoAlvo: { tipo: 'condominio' },
        publicadoEm: minutosAtras(60 * 26),
      },
      {
        id: 3,
        condominioId: 1,
        autorId: 1,
        titulo: 'Limpeza da caixa d’água do Bloco B',
        conteudo: 'O abastecimento do Bloco B será interrompido no sábado, das 8h às 14h.',
        categoria: 'manutencao',
        prioridade: 'normal',
        publicoAlvo: { tipo: 'bloco', blocoId: 2 },
        publicadoEm: minutosAtras(60 * 50),
      },
    ],
    leituras: [],
    areas: [
      { id: 1, condominioId: 1, nome: 'Salão de festas', descricao: 'Salão com cozinha de apoio e mesas para 60 pessoas.', capacidade: 60, taxa: 150, requerReserva: true, status: 'disponivel' },
      { id: 2, condominioId: 1, nome: 'Churrasqueira', descricao: 'Área gourmet com churrasqueira e pia.', capacidade: 20, taxa: 80, requerReserva: true, status: 'disponivel' },
    ],
    reservas: [
      { id: 1, areaComumId: 1, unidadeId: 1, solicitanteId: 2, inicio: horaHoje(18), fim: horaHoje(20), status: 'confirmada', valor: 150 },
      { id: 2, areaComumId: 2, unidadeId: 2, solicitanteId: 3, inicio: horaHoje(12, 2), fim: horaHoje(15, 2), status: 'confirmada', valor: 80 },
    ],
    vistorias: [],
    encomendas: [
      { id: 1, condominioId: 1, unidadeId: 1, remetente: 'Loja Exemplo', transportadora: 'Correios', codigoRastreio: 'BR123456789BR', codigoRetirada: '482913', recebidaEm: minutosAtras(240), status: 'aguardando_retirada' },
      { id: 2, condominioId: 1, unidadeId: 2, remetente: 'Mercado Online', transportadora: 'Loggi', codigoRetirada: '730215', recebidaEm: minutosAtras(60 * 20), status: 'aguardando_retirada' },
    ],
    autorizacoesRetirada: [],
    ocorrencias: [],
    notificacoes: [
      { id: 1, pessoaId: 2, tipo: 'portaria', titulo: 'Visitante na portaria', mensagem: 'Carlos Mendes aguarda autorização para o Apto 302.', referenciaId: 1, enviadaEm: minutosAtras(3) },
      { id: 2, pessoaId: 2, tipo: 'encomenda', titulo: 'Encomenda recebida', mensagem: 'Correios entregou uma encomenda para o Apto 302.', referenciaId: 1, enviadaEm: minutosAtras(240) },
      { id: 3, pessoaId: 3, tipo: 'encomenda', titulo: 'Encomenda recebida', mensagem: 'Loggi entregou uma encomenda para o Apto 502.', referenciaId: 2, enviadaEm: minutosAtras(60 * 20) },
      { id: 4, pessoaId: 3, tipo: 'aviso', titulo: 'Novo aviso', mensagem: 'Manutenção dos elevadores', referenciaId: 1, enviadaEm: minutosAtras(90) },
    ],
    personalizacoes: [
      { condominioId: 1, nomeExibicao: 'Condomínio Demo', logoUrl: null, corPrimaria: '#1F4E79', corSecundaria: '#F2F4F7', corDestaque: '#F59E0B', atualizadoEm: minutosAtras(60 * 24 * 10) },
    ],
    modulos: (['financeiro', 'portaria', 'avisos', 'reservas', 'minha_unidade', 'encomendas'] as ModuloCodigo[]).map((modulo) => ({
      condominioId: 1,
      modulo,
      ativo: true,
      atualizadoEm: minutosAtras(60 * 24 * 10),
    })),
  };
}
