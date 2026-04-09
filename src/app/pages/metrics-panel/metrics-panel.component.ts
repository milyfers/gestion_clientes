import {
  Component, OnInit, OnDestroy, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  statsChartOutline, speedometerOutline, timeOutline, flashOutline,
  funnelOutline, pulseOutline, filmOutline, terminalOutline,
  refreshOutline, informationCircleOutline
} from 'ionicons/icons';
import { MetricsService, MetricasGlobales } from 'src/app/services/metrics';

export interface LogEvento {
  tiempo: string;
  mensaje: string;
  tipo: 'success' | 'info' | 'warning';
}

@Component({
  selector: 'app-metrics-panel',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './metrics-panel.component.html',
  styleUrls: ['./metrics-panel.component.scss']
})
export class MetricsPanelComponent implements OnInit, OnDestroy {

  // ── Métricas reactivas desde el servicio ──────────────────────────
  metricas: MetricasGlobales = {
    debounceCount: 0,
    cacheHits:     0,
    throttleCount: 0,
    rafCount:      0,
    tiempoCarga:   0
  };

  // ── Métricas en vivo (FPS y throttle se miden localmente) ─────────
  fps        = 0;
  rafCount   = 0;
  logEventos: LogEvento[] = [];

  Math = Math;

  private rafId: number | null = null;
  private lastTime = 0;
  private frameCount = 0;
  private fpsInterval: ReturnType<typeof setInterval> | null = null;
  private mouseMoveHandler!: () => void;
  private metricsSub: any;

  constructor(private ngZone: NgZone, private metricsService: MetricsService) {
    addIcons({
      statsChartOutline, speedometerOutline, timeOutline, flashOutline,
      funnelOutline, pulseOutline, filmOutline, terminalOutline,
      refreshOutline, informationCircleOutline
    });
  }

  ngOnInit(): void {
    // ← Suscripción al stream — se actualiza automáticamente
    this.metricsSub = this.metricsService.metricas$.subscribe(m => {
      this.ngZone.run(() => {
        const prevCacheHits    = this.metricas.cacheHits;
        const prevDebounce     = this.metricas.debounceCount;
        const prevTiempoCarga  = this.metricas.tiempoCarga;
        this.metricas = m;

        if (m.tiempoCarga > 0 && m.tiempoCarga !== prevTiempoCarga) {
          this.agregarLog(
            `Dashboard cargado en ${m.tiempoCarga}ms (Promise.allSettled)`, 'success'
          );
        }
        if (m.cacheHits > prevCacheHits) {
          this.agregarLog(`Caché hit #${m.cacheHits} — petición evitada`, 'info');
        }
        if (m.debounceCount > prevDebounce) {
          this.agregarLog(`Debounce ejecutado #${m.debounceCount}`, 'info');
        }
      });
    });

    this.iniciarFPSMeter();
    this.iniciarThrottleCounter();
  }

  ngOnDestroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.fpsInterval) clearInterval(this.fpsInterval);
    document.removeEventListener('mousemove', this.mouseMoveHandler);
    this.metricsSub?.unsubscribe();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FPS METER
  // ═══════════════════════════════════════════════════════════════════
  private iniciarFPSMeter(): void {
    const loop = (timestamp: number) => {
      if (this.lastTime) {
        this.frameCount++;
        this.rafCount++;
      }
      this.lastTime = timestamp;
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);

    this.fpsInterval = setInterval(() => {
    this.ngZone.run(() => {
      this.fps        = this.frameCount;
      this.frameCount = 0;

      // ← Ignorar los primeros 2 segundos de arranque
      const tiempoActivo = performance.now();
      if (tiempoActivo > 2000 && this.fps < 30) {
        this.agregarLog(`FPS bajo detectado: ${this.fps}fps`, 'warning');
      }
    });
  }, 1000);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  THROTTLE COUNTER
  // ═══════════════════════════════════════════════════════════════════

  private iniciarThrottleCounter(): void {
    let lastThrottle = 0;
    const limit = 200;

    this.mouseMoveHandler = () => {
      const ahora = Date.now();
      if (ahora - lastThrottle >= limit) {
        lastThrottle = ahora;
        this.ngZone.run(() => {
          this.metricsService.registrarThrottle(); // ← al servicio centralizado
        });
      }
    };

    document.addEventListener('mousemove', this.mouseMoveHandler);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  MÉTODOS PÚBLICOS
  // ═══════════════════════════════════════════════════════════════════

  registrarError(mensaje: string): void {
    this.agregarLog(mensaje, 'warning');
  }

  registrarEvento(mensaje: string, tipo: 'success' | 'info' | 'warning' = 'info'): void {
    this.agregarLog(mensaje, tipo);
  }

  private agregarLog(mensaje: string, tipo: 'success' | 'info' | 'warning'): void {
    const tiempo = new Date().toLocaleTimeString('es-MX', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    this.logEventos.unshift({ tiempo, mensaje, tipo });
    if (this.logEventos.length > 8) this.logEventos.pop();
  }

  resetMetricas(): void {
    this.metricsService.reset();
    this.rafCount  = 0;
    this.logEventos = [];
    this.agregarLog('Métricas reiniciadas', 'info');
  }
}