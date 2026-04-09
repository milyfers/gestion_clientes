// ═══════════════════════════════════════════════════════════════════════
//  MODELOS DE CLIENTE
//  Archivo: src/app/models/cliente.model.ts
// ═══════════════════════════════════════════════════════════════════════

/**
 * Interfaz principal de Cliente
 */
export interface Cliente {
  id: number;
  nombre: string;
  rfc: string;
  contacto: string;
  telefono: string;
  email: string;
  status: 'Activo' | 'Inactivo' | 'Prospecto' | 'Con proyecto';
  
  // Campos adicionales
  ciudad?: string;
  estado?: string;
  razonSocial?: string;
  direccionFiscal?: string;
  formaPago?: string;     
  usoCFDI?: string;        
  fechaRegistro?: string;
  proyectos?: number;
}

/**
 * Filtros para búsqueda avanzada de clientes
 */
export interface ClienteFilters {
  nombre?: string;
  rfc?: string;
  contacto?: string;
  email?: string;
  status?: string;
  ciudad?: string;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

/**
 * Resultado de búsqueda de clientes
 */
export interface ClienteSearchResult {
  clientes: Cliente[];
  total: number;
  filtrosAplicados: boolean;
}

/**
 * Estadísticas de clientes
 */
export interface ClienteStats {
  total: number;
  activos: number;
  inactivos: number;
  prospectos: number;
  conProyecto: number;
}