// Tipos espelhando os schemas de `docs/morah-openapi.yaml` (Morah API v2.0.0).
// Os nomes de tipos e campos são idênticos aos do contrato.

// ------------------------------------------------ Comuns
export type ErroCampo = { campo?: string; mensagem?: string };

export type Problem = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  erros?: ErroCampo[];
};

export type PageMetadata = { page: number; size: number; totalElements: number; totalPages: number };

export type Paged<T> = { content: T[]; page: PageMetadata };

export type PageParams = { page?: number; size?: number };

export type PessoaResumo = { id: number; nome: string; telefone?: string };

// ------------------------------------------------ Login
export type Perfil = 'morador' | 'proprietario' | 'sindico' | 'portaria';

export type LoginRequest = { email: string; senha: string };

export type ContextoAtivo = {
  perfil: Perfil;
  condominioId: number;
  condominioNome?: string;
  unidadeId?: number;
};

export type PerfilDisponivel = ContextoAtivo;

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  contexto: ContextoAtivo;
  perfisDisponiveis: PerfilDisponivel[];
};

export type ContextoRequest = { condominioId: number; perfil: Perfil };

export type RefreshRequest = { refreshToken: string };

export type ContextoAtivoResponse = Omit<LoginResponse, 'perfisDisponiveis'>;

export type PessoaAutenticada = { id: number; nome: string; cpf?: string; email: string };

export type MeResponse = {
  pessoa: PessoaAutenticada;
  perfisDisponiveis: PerfilDisponivel[];
  contextoAtivo: ContextoAtivo;
};

// ------------------------------------------------ Minha Unidade
export type Unidade = {
  id: number;
  blocoId?: number;
  blocoNome?: string;
  identificacao: string;
  tipo?: string;
  areaM2?: number;
  fracaoIdeal?: number;
  status?: string;
};

export type TipoVinculo = 'proprietario' | 'inquilino' | 'dependente';

export type VinculoUnidade = {
  id: number;
  unidadeId: number;
  pessoa: PessoaResumo;
  tipoVinculo: TipoVinculo;
  principal?: boolean;
  inicio?: string;
  fim?: string;
};

export type SolicitacaoVinculoCreateRequest = {
  tipoVinculo: TipoVinculo;
  nome: string;
  cpf?: string;
  observacao?: string;
};

export type StatusSolicitacaoVinculo = 'pendente' | 'aprovada' | 'rejeitada';

export type SolicitacaoVinculo = {
  id: number;
  unidadeId: number;
  tipoVinculo: TipoVinculo;
  nomeSolicitado: string;
  status: StatusSolicitacaoVinculo;
  solicitadoEm: string;
};

export type DecisaoSolicitacaoVinculo = 'aprovada' | 'rejeitada';

export type DecisaoSolicitacaoVinculoRequest = { decisao: DecisaoSolicitacaoVinculo; justificativa?: string };

export type InquilinoCreateRequest = {
  nome: string;
  cpf: string;
  email?: string;
  telefone?: string;
  contratoInicio: string;
  contratoFim?: string;
};

// ------------------------------------------------ Financeiro
export type StatusCobranca = 'pendente' | 'pago' | 'atrasado' | 'cancelado';

export type Cobranca = {
  id: number;
  unidadeId: number;
  taxaDescricao: string;
  competencia: string;
  vencimento: string;
  valorOriginal: number;
  multa: number;
  juros: number;
  valorTotal: number;
  status: StatusCobranca;
};

export type CobrancaPage = Paged<Cobranca>;

export type PixResponse = { codigoPix: string; expiraEm: string };

export type BaixaManualRequest = { meio: string; valor: number; pagoEm: string; observacao?: string };

export type StatusPagamentoWebhook = 'confirmado' | 'falhou';

export type PagamentoWebhookPayload = {
  transacaoId: string;
  cobrancaId: number;
  valor?: number;
  status: StatusPagamentoWebhook;
  pagoEm?: string;
};

export type DocumentoFinanceiro = {
  id: number;
  tipo: string;
  titulo: string;
  arquivoUrl: string;
  competencia?: string;
  publicadoEm: string;
};

export type DocumentoFinanceiroPage = Paged<DocumentoFinanceiro>;

export type DocumentoFinanceiroCreateRequest = {
  tipo: string;
  titulo: string;
  arquivoUrl: string;
  competencia?: string;
};

export type TipoRateio = 'igualitario' | 'fracao_ideal';

export type TaxaCreateRequest = {
  descricao: string;
  competencia: string;
  valor: number;
  tipoRateio: TipoRateio;
  vencimentoDia: number;
};

export type Taxa = TaxaCreateRequest & { id: number };

export type FalhaGeracaoCobranca = { unidadeId: number; motivo: string };

export type GerarCobrancasResponse = { taxaId: number; totalGeradas: number; falhas: FalhaGeracaoCobranca[] };

export type InadimplenciaResumo = {
  totalUnidades: number;
  unidadesInadimplentes: number;
  percentualInadimplencia: number;
  valorTotalEmAberto: number;
};

// ------------------------------------------------ Reservas
export type AreaComum = {
  id: number;
  nome: string;
  descricao?: string;
  capacidade?: number;
  taxa?: number;
  requerReserva?: boolean;
  status?: string;
};

export type HorarioDisponivel = { inicio: string; fim: string; disponivel: boolean };

export type Disponibilidade = { data: string; horarios: HorarioDisponivel[] };

export type ReservaCreateRequest = { areaComumId: number; inicio: string; fim: string };

export type StatusReserva = 'confirmada' | 'cancelada' | 'concluida' | 'nao_compareceu';

export type Reserva = {
  id: number;
  areaComumId: number;
  areaComumNome: string;
  unidadeId: number;
  solicitante: PessoaResumo;
  inicio: string;
  fim: string;
  status: StatusReserva;
  valor?: number;
};

export type ReservaPage = Paged<Reserva>;

export type MomentoVistoria = 'entrada' | 'saida';

export type VistoriaRequest = {
  momento: MomentoVistoria;
  observacao?: string;
  dano?: boolean;
  fotosUrl?: string[];
};

// ------------------------------------------------ Portaria
export type VisitanteInput = { nome: string; documento?: string; telefone?: string };

export type Visitante = { id: number; nome: string; documento?: string; telefone?: string; observacao?: string };

export type StatusAutorizacaoVisita = 'pendente' | 'autorizada' | 'recusada' | 'expirada';

export type AutorizacaoVisitaCreateRequest = {
  unidadeId: number;
  visitante: VisitanteInput;
  motivo: string;
  fotoUrl?: string;
};

export type AutorizacaoVisita = {
  id: number;
  visitante: Visitante;
  unidadeId: number;
  motivo: string;
  solicitadoEm: string;
  respondidoEm?: string;
  status: StatusAutorizacaoVisita;
};

export type AutorizacaoVisitaPage = Paged<AutorizacaoVisita>;

export type DecisaoAutorizacao = 'autorizado' | 'recusado';

export type DecisaoAutorizacaoRequest = { decisao: DecisaoAutorizacao; justificativa?: string };

export type TipoAcesso = 'entrada' | 'saida';

export type StatusAcesso = 'no_condominio' | 'saiu';

export type AcessoCreateRequest = {
  autorizacaoId?: number;
  visitanteId: number;
  tipo: TipoAcesso;
  fotoUrl?: string;
};

export type Acesso = {
  id: number;
  autorizacaoId?: number;
  visitante: Visitante;
  entrada: string;
  saida?: string;
  tipo: TipoAcesso;
  status: StatusAcesso;
};

export type AcessoPage = Paged<Acesso>;

// ------------------------------------------------ Avisos
export type PrioridadeAviso = 'normal' | 'urgente';

export type TipoPublicoAlvo = 'condominio' | 'bloco' | 'unidade';

export type PublicoAlvo = { tipo: TipoPublicoAlvo; blocoId?: number; unidadeId?: number };

export type AvisoCreateRequest = {
  titulo: string;
  conteudo: string;
  categoria?: string;
  prioridade?: PrioridadeAviso;
  publicoAlvo: PublicoAlvo;
  expiraEm?: string;
};

export type AvisoUpdateRequest = Partial<Omit<AvisoCreateRequest, 'publicoAlvo'>>;

export type Aviso = {
  id: number;
  titulo: string;
  conteudo: string;
  categoria?: string;
  prioridade: PrioridadeAviso;
  publicoAlvo: PublicoAlvo;
  autor: PessoaResumo;
  publicadoEm: string;
  expiraEm?: string;
  lidoPeloUsuario?: boolean;
};

export type AvisoPage = Paged<Aviso>;

// ------------------------------------------------ Encomendas
export type StatusEncomenda = 'aguardando_retirada' | 'retirada' | 'extraviada';

export type EncomendaCreateRequest = {
  unidadeId: number;
  remetente?: string;
  transportadora: string;
  codigoRastreio?: string;
  fotoUrl?: string;
};

export type Encomenda = {
  id: number;
  unidadeId: number;
  remetente?: string;
  transportadora: string;
  codigoRastreio?: string;
  codigoRetirada?: string;
  fotoUrl?: string;
  recebidaEm: string;
  retiradaEm?: string;
  status: StatusEncomenda;
};

export type EncomendaPage = Paged<Encomenda>;

export type AutorizacaoRetiradaCreateRequest = { nomeTerceiro: string; documento: string; validadeHoras?: number };

export type StatusAutorizacaoRetirada = 'ativa' | 'utilizada' | 'expirada';

export type AutorizacaoRetirada = {
  id: number;
  encomendaId: number;
  nomeTerceiro: string;
  documento: string;
  codigo: string;
  validade: string;
  status: StatusAutorizacaoRetirada;
};

export type RetiradaConfirmRequest = { codigo: string; retiradoPorNome?: string; retiradoPorDocumento?: string };

export type OcorrenciaCreateRequest = { titulo: string; descricao: string };

export type StatusOcorrencia = 'aberta' | 'em_andamento' | 'encerrada';

export type Ocorrencia = {
  id: number;
  titulo: string;
  descricao: string;
  status: StatusOcorrencia;
  abertaEm: string;
  encerradaEm?: string;
};

// ------------------------------------------------ Notificações
export type TipoNotificacao = 'portaria' | 'encomenda' | 'financeiro' | 'aviso' | 'reserva';

export type Notificacao = {
  id: number;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  referenciaId?: number;
  enviadaEm: string;
  lidaEm?: string;
};

// ------------------------------------------------ Personalização
export type Personalizacao = {
  condominioId: number;
  nomeExibicao: string;
  logoUrl: string | null;
  corPrimaria: string;
  corSecundaria: string;
  corDestaque: string;
  atualizadoEm?: string;
};

export type PersonalizacaoUpdateRequest = {
  nomeExibicao?: string;
  logoUrl?: string | null;
  corPrimaria?: string;
  corSecundaria?: string;
  corDestaque?: string;
};

export type ModuloCodigo = 'financeiro' | 'portaria' | 'avisos' | 'reservas' | 'minha_unidade' | 'encomendas';

export type ModuloCondominio = { modulo: ModuloCodigo; nome: string; ativo: boolean; atualizadoEm?: string };

export type ModuloUpdateRequest = { ativo: boolean };

// ------------------------------------------------ Tela Inicial
export type DashboardMorador = {
  perfil: 'morador' | 'proprietario';
  unidade?: Unidade;
  proximosBoletos: Cobranca[];
  avisosRecentes: Aviso[];
  encomendasPendentes: Encomenda[];
  autorizacoesPendentes: AutorizacaoVisita[];
  proximasReservas: Reserva[];
};

export type DashboardSindico = {
  perfil: 'sindico';
  inadimplencia?: InadimplenciaResumo;
  avisosPublicadosRecentes: Aviso[];
  solicitacoesVinculoPendentes: number;
  ocorrenciasAbertas: number;
};

export type DashboardPortaria = {
  perfil: 'portaria';
  autorizacoesPendentes: AutorizacaoVisita[];
  reservasDoDia: Reserva[];
  encomendasRecebidasHoje: number;
};

export type Dashboard = DashboardMorador | DashboardSindico | DashboardPortaria;
