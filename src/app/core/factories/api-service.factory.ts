import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
/**
 * Factory Pattern — Parte 6
 *
 * Centraliza la creación de configuraciones de servicio API.
 * En lugar de hardcodear URLs en cada servicio, el Factory
 * las produce de forma consistente.
 */

export interface ApiConfig {
  baseUrl:  string;
  endpoint: string;
  fullUrl:  string;
}

export class ApiServiceFactory {

  private static readonly BASE_URL = environment.apiUrl;

  // ── Factory Method — crea configuración por microservicio ──
  static crear(microservicio: 'auth' | 'clientes' | 'proyectos' | 'usuarios'): ApiConfig {
    const endpoint = `${ApiServiceFactory.BASE_URL}/${microservicio}`;
    return {
      baseUrl:  ApiServiceFactory.BASE_URL,
      endpoint,
      fullUrl:  `${endpoint}/index.php`
    };
  }

  // ── Factories específicas ──────────────────────────────────
  static crearAuth():      ApiConfig { return ApiServiceFactory.crear('auth'); }
  static crearClientes():  ApiConfig { return ApiServiceFactory.crear('clientes'); }
  static crearProyectos(): ApiConfig { return ApiServiceFactory.crear('proyectos'); }
  static crearUsuarios():  ApiConfig { return ApiServiceFactory.crear('usuarios'); }
}