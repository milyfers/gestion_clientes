import { Injectable } from '@angular/core';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

@Injectable({ providedIn: 'root' })
export class CacheService {

  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos

  set<T>(key: string, data: T, ttl = this.DEFAULT_TTL): void {
    console.time('cache:set:' + key);
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
    console.timeEnd('cache:set:' + key);
    console.log('[CacheService] Guardado: "' + key + '" (TTL: ' + ttl/1000 + 's)');
  }

  get<T>(key: string): T | null {
    console.time('cache:get:' + key);
    const entry = this.cache.get(key);
    if (!entry) {
      console.timeEnd('cache:get:' + key);
      console.log('[CacheService] Miss: "' + key + '"');
      return null;
    }
    const expirado = Date.now() - entry.timestamp > entry.ttl;
    if (expirado) {
      this.cache.delete(key);
      console.timeEnd('cache:get:' + key);
      console.log('[CacheService] Expirado: "' + key + '"');
      return null;
    }
    const restante = Math.round((entry.ttl - (Date.now() - entry.timestamp)) / 1000);
    console.timeEnd('cache:get:' + key);
    console.log('[CacheService] Hit: "' + key + '" (expira en ' + restante + 's)');
    return entry.data as T;
  }

  has(key: string): boolean { return this.get(key) !== null; }

  invalidate(key: string): void {
    this.cache.delete(key);
    console.log('[CacheService] Invalidado: "' + key + '"');
  }

  invalidateByPrefix(prefix: string): void {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) { this.cache.delete(key); count++; }
    }
    console.log('[CacheService] Invalidadas ' + count + ' entradas con prefijo "' + prefix + '"');
  }

  clear(): void {
    const total = this.cache.size;
    this.cache.clear();
    console.log('[CacheService] Cache limpiada (' + total + ' entradas)');
  }

  getStats() {
    const ahora = Date.now();
    return {
      totalEntradas: this.cache.size,
      entradas: Array.from(this.cache.entries()).map(([key, e]) => ({
        key,
        expirado: ahora - e.timestamp > e.ttl,
        tiempoRestante: Math.max(0, Math.round((e.ttl - (ahora - e.timestamp)) / 1000))
      }))
    };
  }
}