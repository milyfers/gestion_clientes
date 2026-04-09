// ═══════════════════════════════════════════════════════════════════════
//  MODELOS DE PROYECTO
//  Archivo: src/app/models/proyecto.model.ts
// ═══════════════════════════════════════════════════════════════════════

/**
 * Interfaz principal de Proyecto
 */
export interface Proyecto {
  id: number;
  nombre: string;
  cliente: string;
  status: 'Activo' | 'Finalizado' | 'En Pausa' | 'Cancelado';
  fechaInicio?: string;
  fechaFin?: string;
  descripcion?: string;
  presupuesto?: number;
}

/**
 * Filtros para búsqueda avanzada de proyectos
 */
export interface ProyectoFilters {
  nombre?: string;
  cliente?: string;
  status?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

/**
 * Resultado de búsqueda de proyectos
 */
export interface ProyectoSearchResult {
  proyectos: Proyecto[];
  total: number;
  filtrosAplicados: boolean;
}

/**
 * Estadísticas de proyectos
 */
export interface ProyectoStats {
  total: number;
  activos: number;
  finalizados: number;
  enPausa: number;
  cancelados: number;
}