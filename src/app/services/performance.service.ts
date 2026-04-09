import { Injectable } from '@angular/core';
import { DebounceService } from './debounce.service';

/**
 * PerformanceService — Parte 5: Optimización y Rendimiento
 *
 * Centraliza y documenta todas las técnicas de optimización:
 *  1. Lazy Loading       — rutas con loadComponent() en app.routes.ts
 *  2. Debounce           — DebounceService (buscadores)
 *  3. Throttle           — DebounceService (scroll, mousemove)
 *  4. requestAnimationFrame — animaciones en dashboard
 *  5. console.time()     — medición de operaciones críticas
 *  6. Minimización de reflows — will-change, transform en lugar de top/left
 */
@Injectable({ providedIn: 'root' })
export class PerformanceService {

  private mediciones = new Map<string, number>();

  constructor(private debounceService: DebounceService) {}

  // ═══════════════════════════════════════════════════════════════════
  //  1. MEDICIÓN CON console.time (Parte 5)
  // ═══════════════════════════════════════════════════════════════════

  startMedicion(label: string): void {
    this.mediciones.set(label, performance.now());
    console.time(`[Perf] ${label}`);
  }

  endMedicion(label: string): number {
    console.timeEnd(`[Perf] ${label}`);
    const start = this.mediciones.get(label);
    if (!start) return 0;
    const duracion = performance.now() - start;
    this.mediciones.delete(label);
    console.log(`[PerformanceService] "${label}" tardó ${duracion.toFixed(2)}ms`);
    return duracion;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  2. LAZY LOADING — documentado (implementado en app.routes.ts)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Lazy Loading implementado en app.routes.ts mediante loadComponent().
   * Cada ruta carga su chunk JS solo cuando el usuario navega a ella.
   *
   * Ejemplo:
   *   { path: 'clients', loadComponent: () => import('./clients.page') }
   *
   * Beneficio: El bundle inicial es más pequeño, la app arranca más rápido.
   */
  documentarLazyLoading(): void {
    console.group('[PerformanceService] Lazy Loading');
    console.log('✅ Todas las rutas usan loadComponent() — carga bajo demanda');
    console.log('✅ Cada página es un chunk JS independiente');
    console.log('✅ Bundle inicial reducido — mejor tiempo de arranque');
    console.groupEnd();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  3. DEBOUNCE — evita llamadas excesivas (Parte 2 y 5)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Wrapper de debounce con medición de rendimiento integrada.
   * Úsalo en buscadores para evitar una llamada por cada tecla.
   */
  debounceConMedicion(id: string, fn: () => void, delay = 400): void {
    this.debounceService.debounce(id, () => {
      this.startMedicion(`debounce:${id}`);
      fn();
      this.endMedicion(`debounce:${id}`);
    }, delay);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  4. THROTTLE — limita frecuencia de eventos (Parte 5)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Throttle para eventos de alta frecuencia: scroll, resize, mousemove.
   * Garantiza que fn() se ejecute máximo una vez cada `limit` ms.
   */
  throttleEvento(id: string, fn: () => void, limit = 200): void {
    this.debounceService.throttle(id, fn, limit);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  5. requestAnimationFrame — animaciones optimizadas (Parte 5)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Ejecuta una función de animación sincronizada con el ciclo de repintado
   * del navegador (60fps). Evita reflows y jank visual.
   *
   * Úsalo en lugar de setTimeout para cualquier cambio visual.
   */
  animarConRAF(fn: (timestamp: number) => void): number {
    return requestAnimationFrame(fn);
  }

  /**
   * Loop de animación continua con requestAnimationFrame.
   * Retorna una función para detenerlo.
   */
  iniciarLoopAnimacion(fn: (timestamp: number) => void): () => void {
    let rafId: number;
    let activo = true;

    const loop = (timestamp: number) => {
      if (!activo) return;
      fn(timestamp);
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      activo = false;
      cancelAnimationFrame(rafId);
      console.log('[PerformanceService] Loop rAF detenido');
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  6. MINIMIZACIÓN DE REFLOWS (Parte 5)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Aplica transformaciones visuales sin causar reflow.
   *
   * REGLA: Usar transform y opacity en lugar de top/left/width/height.
   * Estas propiedades solo afectan la capa de composición (GPU),
   * no fuerzan recalcular el layout del DOM.
   */
  aplicarTransformSinReflow(el: HTMLElement, x: number, y: number, scale = 1): void {
    requestAnimationFrame(() => {
      el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    });
  }

  leerPropiedadesBatch(elementos: HTMLElement[]): DOMRect[] {
    console.time('[Perf] batch-read-DOM');
    const rects = elementos.map(el => el.getBoundingClientRect());
    console.timeEnd('[Perf] batch-read-DOM');
    return rects;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  REPORTE GENERAL (útil para el video demostrativo)
  // ═══════════════════════════════════════════════════════════════════

  imprimirReporte(): void {
    console.group('═══ REPORTE DE RENDIMIENTO — Parte 5 ═══');
    console.log('1. ✅ Lazy Loading     — loadComponent() en todas las rutas');
    console.log('2. ✅ Debounce         — buscadores clientes y proyectos (400ms)');
    console.log('3. ✅ Throttle         — eventos mousemove/scroll (200ms)');
    console.log('4. ✅ rAF              — parallax, magnético, carrusel');
    console.log('5. ✅ console.time()   — CacheService, PerformanceService');
    console.log('6. ✅ Anti-reflow      — transform/opacity en animaciones');
    console.groupEnd();
  }
}