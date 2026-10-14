// Singleton (1/2 do frontend): um único logger para o app inteiro, com prefixo e nível padronizados.
// Evita espalhar console.* pelo código e permite trocar o destino dos logs num lugar só.

type Nivel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private static instancia: Logger | null = null;
  private habilitado = true;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instancia) {
      Logger.instancia = new Logger();
    }
    return Logger.instancia;
  }

  setHabilitado(valor: boolean) {
    this.habilitado = valor;
  }

  debug(mensagem: string, ...dados: unknown[]) {
    this.escrever('debug', mensagem, dados);
  }

  info(mensagem: string, ...dados: unknown[]) {
    this.escrever('info', mensagem, dados);
  }

  warn(mensagem: string, ...dados: unknown[]) {
    this.escrever('warn', mensagem, dados);
  }

  error(mensagem: string, ...dados: unknown[]) {
    this.escrever('error', mensagem, dados);
  }

  private escrever(nivel: Nivel, mensagem: string, dados: unknown[]) {
    if (!this.habilitado) return;
    const linha = `[Morah] ${new Date().toISOString()} ${nivel.toUpperCase()} ${mensagem}`;
    const saida = nivel === 'debug' ? console.log : console[nivel];
    saida(linha, ...dados);
  }
}

export const logger = Logger.getInstance();
