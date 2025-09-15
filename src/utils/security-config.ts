/**
 * Configuración de seguridad para la aplicación móvil
 */

interface SecurityLogger {
  error: (message: string, error?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
}

class SecurityLoggerImpl implements SecurityLogger {
  error(message: string, error?: unknown): void {
    // eslint-disable-next-line no-console
    console.error(`[SECURITY ERROR] ${message}`, error);
  }

  warn(message: string, data?: unknown): void {
    // eslint-disable-next-line no-console
    console.warn(`[SECURITY WARN] ${message}`, data);
  }

  info(message: string, data?: unknown): void {
    // eslint-disable-next-line no-console
    console.info(`[SECURITY INFO] ${message}`, data);
  }
}

export const securityLogger = new SecurityLoggerImpl();
