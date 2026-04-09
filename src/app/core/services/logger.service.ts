import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  env: string;
  message: string;
  correlationId: string;
  userId?: string;
  method?: string;
  path?: string;
  status?: number;
  responseTimeMs?: number;
  context?: any;
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {

  private logs: LogEntry[] = [];
  private serviceName = 'log';
  private currentCorrelationId: string | null = null;

  constructor() {
    // ==============================
    // TEMPORAL - Solo para generar errores de prueba
    // Borrar después de exportar logs
    // ==============================
    (window as any)['simularError500'] = () => {
      this.error('error_interno_servidor', {
        method: 'GET',
        path: '/error-500',
        status: 500,
        context: { mensaje: 'Fallo interno simulado', simulado: true }
      });
    };

    (window as any)['simularError404'] = () => {
      this.error('recurso_no_encontrado', {
        method: 'GET',
        path: '/clientes/999',
        status: 404,
        context: { mensaje: 'Cliente no existe', simulado: true }
      });
    };

    (window as any)['simularErrorValidacion'] = () => {
      this.error('error_validacion', {
        method: 'POST',
        path: '/clientes',
        status: 422,
        context: { mensaje: 'Datos de entrada inválidos', simulado: true }
      });
    };
    // ==============================
    // FIN TEMPORAL
    // ==============================
  }

  // ==============================
  // Correlation ID
  // ==============================

  startOperation(): string {
    this.currentCorrelationId = crypto.randomUUID();
    return this.currentCorrelationId;
  }

  endOperation() {
    this.currentCorrelationId = null;
  }

  private getCorrelationId(): string {
    if (!this.currentCorrelationId) {
      return this.startOperation();
    }
    return this.currentCorrelationId;
  }

  // ==============================
  // Métodos de log
  // ==============================

  debug(message: string, data?: Partial<LogEntry>) {
    this.log('debug', message, data);
  }

  info(message: string, data?: Partial<LogEntry>) {
    this.log('info', message, data);
  }

  warn(message: string, data?: Partial<LogEntry>) {
    this.log('warn', message, data);
  }

  error(message: string, data?: Partial<LogEntry>) {
    this.log('error', message, data);
  }

  private log(level: LogLevel, message: string, data?: Partial<LogEntry>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      env: environment.production ? 'production' : 'development',
      message,
      correlationId: this.getCorrelationId(),
      ...data
    };

    this.logs.push(entry);

    if (!environment.production) {
      console.log(JSON.stringify(entry));
    }
  }

  // ==============================
  // Exportación JSON (solo dev)
  // ==============================

  exportLogs() {
    if (environment.production) return;

    const blob = new Blob(
      [JSON.stringify(this.logs, null, 2)],
      { type: 'application/json' }
    );

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-frontend-${new Date().toISOString()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // ==============================
  // Exportación .log (formato texto plano, solo dev)
  // ==============================

  exportLogsAsText() {
    if (environment.production) return;

    const lines = this.logs.map(entry => {
      const ctx = entry.context ? ` | context=${JSON.stringify(entry.context)}` : '';
      const method = entry.method ? ` | method=${entry.method}` : '';
      const path = entry.path ? ` | path=${entry.path}` : '';
      const status = entry.status !== undefined ? ` | status=${entry.status}` : '';
      const rt = entry.responseTimeMs !== undefined ? ` | responseTimeMs=${entry.responseTimeMs}` : '';
      const user = entry.userId ? ` | userId=${entry.userId}` : '';

      return `[${entry.timestamp}] [${entry.level.toUpperCase().padEnd(5)}] [${entry.service}] [${entry.env}] ${entry.message} | correlationId=${entry.correlationId}${user}${method}${path}${status}${rt}${ctx}`;
    });

    const blob = new Blob(
      [lines.join('\n')],
      { type: 'text/plain' }
    );

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-frontend-${new Date().toISOString()}.log`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }
}