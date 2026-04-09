export type CompraStatus = 'pendiente' | 'aprobada' | 'recibida' | 'cancelada';
export type CompraCategoria = 'material' | 'servicio' | 'equipo' | 'otro';

export interface CompraItem {
  id?: number;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Compra {
  id?: number;
  folio?: string;
  proveedor: string;
  categoria: CompraCategoria;
  proyectoId?: number;
  proyecto?: string;
  items: CompraItem[];
  total: number;
  status: CompraStatus;
  fechaCompra: string;
  fechaEntrega?: string;
  notas?: string;
  factura?: string;
}

export interface CompraFilters {
  proveedor?: string;
  status?: CompraStatus;
  categoria?: CompraCategoria;
  proyectoId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
}