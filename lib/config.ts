// Configuração do app lida das variáveis EXPO_PUBLIC_* (definidas no .env ou na linha de comando).

/** URL base da API Morah (servidor local do contrato por padrão). */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/v1').replace(/\/$/, '');

/**
 * Enquanto o backend não estiver no ar, o app usa um servidor simulado em memória
 * que segue o contrato `docs/morah-openapi.yaml`. Use EXPO_PUBLIC_USE_MOCK=false para a API real.
 */
export const USE_MOCK = (process.env.EXPO_PUBLIC_USE_MOCK ?? 'true') !== 'false';

/** Intervalo de recarga de módulos/personalização (REQ018: refletir em no máximo 5 minutos). */
export const INTERVALO_RECARGA_CONDOMINIO_MS = 5 * 60 * 1000;
