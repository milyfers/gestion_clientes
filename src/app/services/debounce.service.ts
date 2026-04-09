import { Injectable, NgZone } from '@angular/core';
import { MetricsService } from './metrics';

@Injectable({ providedIn: 'root' })
export class DebounceService {

  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private throttleTimestamps = new Map<string, number>();

  constructor(private ngZone: NgZone, private metricsService: MetricsService) {}

  // Debounce por ID — ideal para buscadores
  debounce(id: string, fn: (...args: any[]) => void, delay = 400): void {
    if (this.timers.has(id)) clearTimeout(this.timers.get(id)!);
    const timer = setTimeout(() => {
      this.ngZone.run(() => { console.log('[Debounce] "' + id + '" ejecutado'); 
      this.metricsService.registrarDebounce(); 
      fn(); });
      this.timers.delete(id);
    }, delay);
    this.timers.set(id, timer);
  }

  cancelDebounce(id: string): void {
  if (this.timers.has(id)) {
    clearTimeout(this.timers.get(id)!);
    this.timers.delete(id);
  }
}
  // Throttle — limita frecuencia (scroll, mousemove)
  throttle(id: string, fn: (...args: any[]) => void, limit = 200): void {
    const ahora = Date.now();
    if (ahora - (this.throttleTimestamps.get(id) ?? 0) >= limit) {
      this.throttleTimestamps.set(id, ahora);
      this.ngZone.run(() => { console.log('[Throttle] "' + id + '" ejecutado'); fn(); });
    }
  }

  // Factory — equivalente EXACTO al código del enunciado
  createDebounced<T extends (...args: any[]) => void>(fn: T, delay = 400): T {
    let timeout: ReturnType<typeof setTimeout>;
    return ((...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => this.ngZone.run(() => fn(...args)), delay);
    }) as T;
  }

  createThrottled<T extends (...args: any[]) => void>(fn: T, limit = 200): T {
    let last = 0;
    return ((...args: any[]) => {
      const now = Date.now();
      if (now - last >= limit) { last = now; this.ngZone.run(() => fn(...args)); }
    }) as T;
  }

  cancelAll(): void {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    this.throttleTimestamps.clear();
  }
}