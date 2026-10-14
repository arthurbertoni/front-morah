import { api } from '../client';
import type {
  BaixaManualRequest,
  Cobranca,
  CobrancaPage,
  DocumentoFinanceiro,
  DocumentoFinanceiroCreateRequest,
  DocumentoFinanceiroPage,
  GerarCobrancasResponse,
  InadimplenciaResumo,
  PagamentoWebhookPayload,
  PageParams,
  PixResponse,
  StatusCobranca,
  Taxa,
  TaxaCreateRequest,
} from '../types';

// Tag "Financeiro" do contrato.

export type FiltroCobrancas = PageParams & { status?: StatusCobranca; competencia?: string; unidadeId?: number };

/** GET /financeiro/cobrancas (operationId: listarCobrancas) */
export const listarCobrancas = (filtro: FiltroCobrancas = {}) =>
  api.get<CobrancaPage>('/financeiro/cobrancas', filtro);

/** GET /financeiro/cobrancas/{cobrancaId} (operationId: getCobranca) */
export const getCobranca = (cobrancaId: number) => api.get<Cobranca>(`/financeiro/cobrancas/${cobrancaId}`);

/** GET /financeiro/cobrancas/{cobrancaId}/pix (operationId: getPixCobranca) */
export const getPixCobranca = (cobrancaId: number) =>
  api.get<PixResponse>(`/financeiro/cobrancas/${cobrancaId}/pix`);

/** POST /financeiro/cobrancas/{cobrancaId}/baixa-manual (operationId: baixarCobrancaManualmente) */
export const baixarCobrancaManualmente = (cobrancaId: number, dados: BaixaManualRequest) =>
  api.post<Cobranca>(`/financeiro/cobrancas/${cobrancaId}/baixa-manual`, dados);

/**
 * POST /financeiro/webhooks/pagamentos (operationId: receberWebhookPagamento)
 * Chamado pelo gateway, não pelo app. Usado só no modo simulado para demonstrar a confirmação do PIX.
 */
export const simularWebhookPagamento = (dados: PagamentoWebhookPayload) =>
  api.post<void>('/financeiro/webhooks/pagamentos', dados, {
    auth: false,
    headers: { 'X-Webhook-Signature': 'assinatura-simulada' },
  });

/** GET /financeiro/documentos (operationId: listarDocumentosFinanceiros) */
export const listarDocumentosFinanceiros = (params: PageParams = {}) =>
  api.get<DocumentoFinanceiroPage>('/financeiro/documentos', params);

/** POST /financeiro/documentos (operationId: publicarDocumentoFinanceiro) */
export const publicarDocumentoFinanceiro = (dados: DocumentoFinanceiroCreateRequest) =>
  api.post<DocumentoFinanceiro>('/financeiro/documentos', dados);

/** POST /financeiro/taxas (operationId: criarTaxa) */
export const criarTaxa = (dados: TaxaCreateRequest) => api.post<Taxa>('/financeiro/taxas', dados);

/** POST /financeiro/taxas/{taxaId}/gerar-cobrancas (operationId: gerarCobrancasEmLote) */
export const gerarCobrancasEmLote = (taxaId: number) =>
  api.post<GerarCobrancasResponse>(`/financeiro/taxas/${taxaId}/gerar-cobrancas`);

/** GET /financeiro/inadimplencia (operationId: getResumoInadimplencia) */
export const getResumoInadimplencia = () => api.get<InadimplenciaResumo>('/financeiro/inadimplencia');
