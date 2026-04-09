import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';

export interface Notificacion {
  id: string;
  mensaje: string;
  tipo: 'info' | 'success' | 'warning';
  timestamp: Date;
  nueva: boolean;
}

@Injectable({ providedIn: 'root' })
export class PollingService {

  notificaciones$ = new Subject<Notificacion>();

  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private idsRecibidos    = new Set<string>();
  private frecuenciaMs    = 8000;
  private activo          = false;
  private ultimoId        = 0;

  private apiUrl = 'http://localhost/gestion-clientes/src/api';

  constructor(
    private ngZone: NgZone,
    private http:   HttpClient
  ) {}

  // ═══════════════════════════════════════════════════════════════════
  //  INICIAR / DETENER
  // ═══════════════════════════════════════════════════════════════════

  iniciar(): void {
    if (this.activo) return;
    this.activo = true;
    console.log(`[PollingService] Iniciado — frecuencia: ${this.frecuenciaMs / 1000}s`);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.ejecutarPolling();
  }

  detener(): void {
    this.activo = false;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    console.log('[PollingService] Detenido');
  }

  // ═══════════════════════════════════════════════════════════════════
  //  POLLING REAL AL BACKEND
  // ═══════════════════════════════════════════════════════════════════

  private ejecutarPolling(): void {
    this.pollingInterval = setInterval(() => {
      if (document.hidden) return;
      this.ngZone.run(() => this.consultarBackend());
    }, this.frecuenciaMs);
  }

  private consultarBackend(): void {
    console.time('[PollingService] consulta-servidor');

    this.http.get<any[]>(`${this.apiUrl}/notificaciones.php`, {
      params: { desde: this.ultimoId }
    }).subscribe({
      next: (datos) => {
        console.timeEnd('[PollingService] consulta-servidor');

        if (!datos || datos.length === 0) {
          console.log('[PollingService] Sin datos nuevos');
          return;
        }

        datos.forEach(dato => {
          const id = `notif_${dato.id}`;

          if (this.idsRecibidos.has(id)) return;
          this.idsRecibidos.add(id);

          if (dato.id > this.ultimoId) {
            this.ultimoId = dato.id;
          }

          const notificacion: Notificacion = {
            id,
            mensaje:   dato.mensaje,
            tipo:      dato.tipo,
            timestamp: new Date(dato.timestamp),
            nueva:     true
          };

          console.log('[PollingService] Nueva notificación:', notificacion.mensaje);
          this.notificaciones$.next(notificacion);
        });
      },
      error: (err) => {
        console.timeEnd('[PollingService] consulta-servidor');
        console.warn('[PollingService] Error al consultar backend:', err.status);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  MARCAR COMO LEÍDAS
  // ═══════════════════════════════════════════════════════════════════

  marcarTodasLeidas(): void {
    this.http.put(`${this.apiUrl}/notificaciones.php`, {}).subscribe();
  }

  marcarLeida(id: number): void {
    this.http.put(`${this.apiUrl}/notificaciones.php`, {}, {
      params: { id }
    }).subscribe();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UTILIDADES
  // ═══════════════════════════════════════════════════════════════════

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      console.log('[PollingService] Tab oculta — polling suspendido');
    } else {
      console.log('[PollingService] Tab visible — polling reanudado');
    }
  };

  cambiarFrecuencia(ms: number): void {
    this.frecuenciaMs = ms;
    if (this.activo) {
      this.detener();
      this.activo = true;
      this.ejecutarPolling();
    }
  }
}