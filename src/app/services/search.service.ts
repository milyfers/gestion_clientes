import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Proyecto, ProyectoFilters, ProyectoSearchResult } from '../models/proyecto.model';
import { Cliente, ClienteFilters, ClienteSearchResult } from '../models/cliente.model';
import { CacheService } from './cache.service';
import { LoggerService } from '../core/services/logger.service';

@Injectable({
  providedIn: 'root'
})
export class SearchService {

  private apiUrl = 'http://localhost/gestion-clientes/src/api';

  constructor(
    private http: HttpClient,
    private logger: LoggerService,
    private cacheService: CacheService
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  //  CRUD CLIENTES — BACKEND REAL
  // ═══════════════════════════════════════════════════════════════════════

  searchClientes(query: string): Observable<Cliente[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<Cliente[]>(`${this.apiUrl}/clientes.php`, { params });
  }

  searchClientesConCache(query: string): Observable<Cliente[]> {
    const cacheKey = 'clientes_query_' + query.toLowerCase().trim();
    const cached = this.cacheService.get<Cliente[]>(cacheKey);
    if (cached) return of(cached);

    return new Observable(observer => {
      this.searchClientes(query).subscribe({
        next: (resultado) => {
          this.cacheService.set(cacheKey, resultado, 60 * 1000);
          observer.next(resultado);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  searchClientesAvanzado(filters: ClienteFilters): Observable<ClienteSearchResult> {
    return new Observable(observer => {
      this.searchClientes(filters.nombre ?? '').subscribe({
        next: (clientes) => {
          let filtered = clientes;

          if (filters.rfc)
            filtered = filtered.filter(c => c.rfc?.toLowerCase().includes(filters.rfc!.toLowerCase()));
          if (filters.contacto)
            filtered = filtered.filter(c => c.contacto?.toLowerCase().includes(filters.contacto!.toLowerCase()));
          if (filters.email)
            filtered = filtered.filter(c => c.email?.toLowerCase().includes(filters.email!.toLowerCase()));
          if (filters.status)
            filtered = filtered.filter(c => c.status === filters.status);
          if (filters.ciudad)
            filtered = filtered.filter(c => c.ciudad === filters.ciudad);
          if (filters.estado)
            filtered = filtered.filter(c => c.estado === filters.estado);
          if (filters.fechaDesde)
            filtered = filtered.filter(c => c.fechaRegistro && c.fechaRegistro >= filters.fechaDesde!);
          if (filters.fechaHasta)
            filtered = filtered.filter(c => c.fechaRegistro && c.fechaRegistro <= filters.fechaHasta!);

          observer.next({
            clientes: filtered,
            total: filtered.length,
            filtrosAplicados: Object.keys(filters).some(k => filters[k as keyof ClienteFilters])
          });
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  agregarCliente(cliente: Cliente): Observable<Cliente> {
    this.logger.startOperation();
    const start = performance.now();
    this.logger.info('cliente_creado_intento', { method: 'POST', path: '/clientes.php' });

    return new Observable(observer => {
      this.http.post<Cliente>(`${this.apiUrl}/clientes.php`, {
        nombre:        cliente.nombre,
        razonSocial:   cliente.razonSocial,
        rfc:           cliente.rfc,
        contacto:      cliente.contacto,
        telefono:      cliente.telefono,
        email:         cliente.email,
        ciudad:        cliente.ciudad,
        estado:        cliente.estado,
        status:        cliente.status,
        formaPago:     cliente.formaPago,
        usoCFDI:       cliente.usoCFDI,
        fechaRegistro: cliente.fechaRegistro
      }).subscribe({
        next: (res) => {
          this.logger.info('cliente_creado', { status: 201, responseTimeMs: performance.now() - start });
          this.logger.endOperation();
          this.invalidarCacheClientes();
          observer.next(res);
          observer.complete();
        },
        error: (err) => {
          this.logger.warn('cliente_error', { status: err.status });
          this.logger.endOperation();
          observer.error(err);
        }
      });
    });
  }

  actualizarCliente(cliente: Cliente): Observable<Cliente> {
    this.logger.startOperation();
    const start = performance.now();
    this.logger.info('cliente_actualizacion_intento', { method: 'PUT', path: `/clientes.php` });

    return new Observable(observer => {
      this.http.put<Cliente>(`${this.apiUrl}/clientes.php`, cliente).subscribe({
        next: (res) => {
          this.logger.info('cliente_actualizado', { status: 200, responseTimeMs: performance.now() - start });
          this.logger.endOperation();
          this.invalidarCacheClientes();
          observer.next(res);
          observer.complete();
        },
        error: (err) => {
          this.logger.warn('cliente_error', { status: err.status });
          this.logger.endOperation();
          observer.error(err);
        }
      });
    });
  }

  eliminarCliente(id: number): Observable<boolean> {
    this.logger.startOperation();
    const start = performance.now();
    this.logger.info('cliente_eliminacion_intento', { method: 'DELETE', path: `/clientes.php` });

    return new Observable(observer => {
      this.http.delete(`${this.apiUrl}/clientes.php`, {
        params: new HttpParams().set('id', id)
      }).subscribe({
        next: () => {
          this.logger.info('cliente_eliminado', { status: 200, responseTimeMs: performance.now() - start });
          this.logger.endOperation();
          this.invalidarCacheClientes();
          observer.next(true);
          observer.complete();
        },
        error: (err) => {
          this.logger.warn('cliente_error', { status: err.status });
          this.logger.endOperation();
          observer.error(err);
        }
      });
    });
  }

  getClientePorId(id: number): Observable<Cliente> {
  return this.http.get<Cliente>(`${this.apiUrl}/clientes.php`, {
    params: new HttpParams().set('id', id)
  });
}
  // ═══════════════════════════════════════════════════════════════════════
  //  CRUD PROYECTOS — BACKEND REAL
  // ═══════════════════════════════════════════════════════════════════════

  searchProyectos(query: string): Observable<Proyecto[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<Proyecto[]>(`${this.apiUrl}/proyectos.php`, { params });
  }

  searchProyectosConCache(query: string): Observable<Proyecto[]> {
    const cacheKey = 'proyectos_query_' + query.toLowerCase().trim();
    const cached = this.cacheService.get<Proyecto[]>(cacheKey);
    if (cached) return of(cached);

    return new Observable(observer => {
      this.searchProyectos(query).subscribe({
        next: (resultado) => {
          this.cacheService.set(cacheKey, resultado, 60 * 1000);
          observer.next(resultado);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  searchProyectosAvanzado(filters: ProyectoFilters): Observable<ProyectoSearchResult> {
    return new Observable(observer => {
      this.searchProyectos(filters.nombre ?? '').subscribe({
        next: (proyectos) => {
          let filtered = proyectos;

          if (filters.cliente)
            filtered = filtered.filter(p => p.cliente?.toLowerCase().includes(filters.cliente!.toLowerCase()));
          if (filters.status)
            filtered = filtered.filter(p => p.status === filters.status);
          if (filters.fechaInicio)
            filtered = filtered.filter(p => p.fechaInicio && p.fechaInicio >= filters.fechaInicio!);
          if (filters.fechaFin)
            filtered = filtered.filter(p => p.fechaFin && p.fechaFin <= filters.fechaFin!);

          observer.next({
            proyectos: filtered,
            total: filtered.length,
            filtrosAplicados: Object.keys(filters).some(k => filters[k as keyof ProyectoFilters])
          });
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  agregarProyecto(proyecto: Proyecto): Observable<Proyecto> {
    this.logger.startOperation();
    const start = performance.now();
    this.logger.info('proyecto_creado_intento', { method: 'POST', path: '/proyectos.php' });

    return new Observable(observer => {
      this.http.post<Proyecto>(`${this.apiUrl}/proyectos.php`, {
        nombre:      proyecto.nombre,
        descripcion: proyecto.descripcion,
        clienteId:   (proyecto as any).clienteId ?? (proyecto as any).cliente_id,
        status:      proyecto.status,
        presupuesto: proyecto.presupuesto,
        fechaInicio: proyecto.fechaInicio,
        fechaFin:    proyecto.fechaFin ?? null
      }).subscribe({
        next: (res) => {
          this.logger.info('proyecto_creado', { status: 201, responseTimeMs: performance.now() - start });
          this.logger.endOperation();
          this.invalidarCacheProyectos();
          observer.next(res);
          observer.complete();
        },
        error: (err) => {
          this.logger.warn('proyecto_error', { status: err.status });
          this.logger.endOperation();
          observer.error(err);
        }
      });
    });
  }

  actualizarProyecto(proyecto: Proyecto): Observable<Proyecto> {
    this.logger.startOperation();
    const start = performance.now();
    this.logger.info('proyecto_actualizacion_intento', { method: 'PUT', path: `/proyectos.php` });

    return new Observable(observer => {
      this.http.put<Proyecto>(`${this.apiUrl}/proyectos.php`, {
        ...proyecto,
        clienteId: (proyecto as any).clienteId ?? (proyecto as any).cliente_id
      }).subscribe({
        next: (res) => {
          this.logger.info('proyecto_actualizado', { status: 200, responseTimeMs: performance.now() - start });
          this.logger.endOperation();
          this.invalidarCacheProyectos();
          observer.next(res);
          observer.complete();
        },
        error: (err) => {
          this.logger.warn('proyecto_error', { status: err.status });
          this.logger.endOperation();
          observer.error(err);
        }
      });
    });
  }

  eliminarProyecto(id: number): Observable<boolean> {
    this.logger.startOperation();
    const start = performance.now();
    this.logger.info('proyecto_eliminacion_intento', { method: 'DELETE', path: `/proyectos.php` });

    return new Observable(observer => {
      this.http.delete(`${this.apiUrl}/proyectos.php`, {
        params: new HttpParams().set('id', id)
      }).subscribe({
        next: () => {
          this.logger.info('proyecto_eliminado', { status: 200, responseTimeMs: performance.now() - start });
          this.logger.endOperation();
          this.invalidarCacheProyectos();
          observer.next(true);
          observer.complete();
        },
        error: (err) => {
          this.logger.warn('proyecto_error', { status: err.status });
          this.logger.endOperation();
          observer.error(err);
        }
      });
    });
  }

  getProyectoPorId(id: number): Observable<Proyecto> {
  return this.http.get<Proyecto>(`${this.apiUrl}/proyectos.php`, {
    params: new HttpParams().set('id', id)
  });
}

  // ═══════════════════════════════════════════════════════════════════════
  //  DASHBOARD — Promise.all con backend real
  // ═══════════════════════════════════════════════════════════════════════

  async cargarDashboard(): Promise<{ clientes: Cliente[]; proyectos: Proyecto[]; errores: string[] }> {
    const CACHE_KEY = 'dashboard_data';
    const errores: string[] = [];

    const cached = this.cacheService.get<{ clientes: Cliente[]; proyectos: Proyecto[] }>(CACHE_KEY);
    if (cached) return { ...cached, errores: [] };

    const [resultClientes, resultProyectos] = await Promise.allSettled([
      this.searchClientes('').toPromise(),
      this.searchProyectos('').toPromise()
    ]);

    const clientes = resultClientes.status === 'fulfilled'
      ? resultClientes.value ?? []
      : (errores.push('Error al cargar clientes'), []);

    const proyectos = resultProyectos.status === 'fulfilled'
      ? resultProyectos.value ?? []
      : (errores.push('Error al cargar proyectos'), []);

    if (errores.length === 0) {
      this.cacheService.set(CACHE_KEY, { clientes, proyectos }, 2 * 60 * 1000);
    }

    return { clientes, proyectos, errores };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CACHÉ — invalidación
  // ═══════════════════════════════════════════════════════════════════════

  private invalidarCacheClientes(): void {
    this.cacheService.invalidateByPrefix('clientes_');
    this.cacheService.invalidate('dashboard_data');
  }

  private invalidarCacheProyectos(): void {
    this.cacheService.invalidateByPrefix('proyectos_');
    this.cacheService.invalidate('dashboard_data');
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  UTILIDADES
  // ═══════════════════════════════════════════════════════════════════════

  limpiarDatos(): void {
    this.logger.warn('cache_limpiada', { context: { accion: 'limpiarDatos' } });
    this.cacheService.invalidateByPrefix('clientes_');
    this.cacheService.invalidateByPrefix('proyectos_');
    this.cacheService.invalidate('dashboard_data');
  }
}