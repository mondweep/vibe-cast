/**
 * Simple logger utility
 */
export class Logger {
  private prefix: string;

  constructor(context: string) {
    this.prefix = `[${context}]`;
  }

  info(message: string, data?: unknown): void {
    console.log(`${this.prefix} ${message}`, data ?? '');
  }

  warn(message: string, data?: unknown): void {
    console.warn(`${this.prefix} ${message}`, data ?? '');
  }

  error(message: string, error?: unknown): void {
    console.error(`${this.prefix} ${message}`, error ?? '');
  }

  debug(message: string, data?: unknown): void {
    if (process.env.DEBUG) {
      console.debug(`${this.prefix} ${message}`, data ?? '');
    }
  }
}
