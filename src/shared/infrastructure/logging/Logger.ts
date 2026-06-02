/**
 * Logger interface with structured logging support
 */
export interface Logger {
  info(message: string, context?: Record<string, any>): void;
  error(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  debug(message: string, context?: Record<string, any>): void;
}

/**
 * Console-based logger implementation for development
 */
export class ConsoleLogger implements Logger {
  info(message: string, context?: Record<string, any>): void {
    console.log(JSON.stringify({ level: 'INFO', message, ...context }));
  }

  error(message: string, context?: Record<string, any>): void {
    console.error(JSON.stringify({ level: 'ERROR', message, ...context }));
  }

  warn(message: string, context?: Record<string, any>): void {
    console.warn(JSON.stringify({ level: 'WARN', message, ...context }));
  }

  debug(message: string, context?: Record<string, any>): void {
    console.debug(JSON.stringify({ level: 'DEBUG', message, ...context }));
  }
}
