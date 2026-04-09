// metrics.service.ts
import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface MetricasGlobales {
  debounceCount: number;
  cacheHits:     number;
  throttleCount: number;
  rafCount:      number;
  tiempoCarga:   number;
}

@Injectable({ providedIn: 'root' })
export class MetricsService {

  // ── Estado global de métricas ─────────────────────────────────────
  private metricas: MetricasGlobales = {
    debounceCount: 0,
    cacheHits:     0,
    throttleCount: 0,
    rafCount:      0,
    tiempoCarga:   0
  };

  // Stream que el panel escucha para actualizarse en tiempo real
  metricas$ = new BehaviorSubject<MetricasGlobales>({ ...this.metricas });

  constructor(private ngZone: NgZone) {}

  // ── Métodos para registrar desde cualquier página/servicio ────────

  registrarDebounce(): void {
    this.metricas.debounceCount++;
    this.emitir();
  }

  registrarCacheHit(): void {
    this.metricas.cacheHits++;
    this.emitir();
  }

  registrarThrottle(): void {
    this.metricas.throttleCount++;
    this.emitir();
  }

  registrarRAF(): void {
    this.metricas.rafCount++;
    this.emitir();
  }

  setTiempoCarga(ms: number): void {
    this.metricas.tiempoCarga = ms;
    this.emitir();
  }

  reset(): void {
    this.metricas = { debounceCount: 0, cacheHits: 0, throttleCount: 0, rafCount: 0, tiempoCarga: 0 };
    this.emitir();
  }

  private emitir(): void {
    this.ngZone.run(() => {
      this.metricas$.next({ ...this.metricas });
    });
  }
}