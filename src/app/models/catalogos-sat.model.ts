// ═══════════════════════════════════════════════════════════════════════
//  CATÁLOGOS SAT
//  Archivo: src/app/models/catalogos-sat.model.ts
// ═══════════════════════════════════════════════════════════════════════

/**
 * Catálogo de Formas de Pago (SAT)
 * Conforme al Anexo 20 de la Resolución Miscelánea Fiscal
 */
export interface FormaPago {
  codigo: string;
  descripcion: string;
}

/**
 * Catálogo completo de Formas de Pago
 */
export const FORMAS_PAGO: FormaPago[] = [
  { codigo: '01', descripcion: 'Efectivo' },
  { codigo: '02', descripcion: 'Cheque nominativo' },
  { codigo: '03', descripcion: 'Transferencia electrónica de fondos' },
  { codigo: '04', descripcion: 'Tarjeta de crédito' },
  { codigo: '05', descripcion: 'Monedero electrónico' },
  { codigo: '06', descripcion: 'Dinero electrónico' },
  { codigo: '08', descripcion: 'Vales de despensa' },
  { codigo: '12', descripcion: 'Dación en pago' },
  { codigo: '13', descripcion: 'Pago por subrogación' },
  { codigo: '14', descripcion: 'Pago por consignación' },
  { codigo: '15', descripcion: 'Condonación' },
  { codigo: '17', descripcion: 'Compensación' },
  { codigo: '23', descripcion: 'Novación' },
  { codigo: '24', descripcion: 'Confusión' },
  { codigo: '25', descripcion: 'Remisión de deuda' },
  { codigo: '26', descripcion: 'Prescripción o caducidad' },
  { codigo: '27', descripcion: 'A satisfacción del acreedor' },
  { codigo: '28', descripcion: 'Tarjeta de débito' },
  { codigo: '29', descripcion: 'Tarjeta de servicios' },
  { codigo: '30', descripcion: 'Aplicación de anticipos' },
  { codigo: '31', descripcion: 'Intermediario pagos' },
  { codigo: '99', descripcion: 'Por definir' }
];

/**
 * Catálogo de Uso de CFDI (SAT)
 * Conforme al Anexo 20 de la Resolución Miscelánea Fiscal
 */
export interface UsoCFDI {
  codigo: string;
  descripcion: string;
  personaFisica: boolean;
  personaMoral: boolean;
}

/**
 * Catálogo completo de Uso de CFDI
 */
export const USOS_CFDI: UsoCFDI[] = [
  // Adquisiciones
  { codigo: 'G01', descripcion: 'Adquisición de mercancías', personaFisica: true, personaMoral: true },
  { codigo: 'G02', descripcion: 'Devoluciones, descuentos o bonificaciones', personaFisica: true, personaMoral: true },
  { codigo: 'G03', descripcion: 'Gastos en general', personaFisica: true, personaMoral: true },
  
  // Inversiones
  { codigo: 'I01', descripcion: 'Construcciones', personaFisica: true, personaMoral: true },
  { codigo: 'I02', descripcion: 'Mobiliario y equipo de oficina por inversiones', personaFisica: true, personaMoral: true },
  { codigo: 'I03', descripcion: 'Equipo de transporte', personaFisica: true, personaMoral: true },
  { codigo: 'I04', descripcion: 'Equipo de cómputo y accesorios', personaFisica: true, personaMoral: true },
  { codigo: 'I05', descripcion: 'Dados, troqueles, moldes, matrices y herramental', personaFisica: true, personaMoral: true },
  { codigo: 'I06', descripcion: 'Comunicaciones telefónicas', personaFisica: true, personaMoral: true },
  { codigo: 'I07', descripcion: 'Comunicaciones satelitales', personaFisica: true, personaMoral: true },
  { codigo: 'I08', descripcion: 'Otra maquinaria y equipo', personaFisica: true, personaMoral: true },
  
  // Deducciones Personas Físicas
  { codigo: 'D01', descripcion: 'Honorarios médicos, dentales y gastos hospitalarios', personaFisica: true, personaMoral: false },
  { codigo: 'D02', descripcion: 'Gastos médicos por incapacidad o discapacidad', personaFisica: true, personaMoral: false },
  { codigo: 'D03', descripcion: 'Gastos funerales', personaFisica: true, personaMoral: false },
  { codigo: 'D04', descripcion: 'Donativos', personaFisica: true, personaMoral: false },
  { codigo: 'D05', descripcion: 'Intereses reales efectivamente pagados por créditos hipotecarios', personaFisica: true, personaMoral: false },
  { codigo: 'D06', descripcion: 'Aportaciones voluntarias al SAR', personaFisica: true, personaMoral: false },
  { codigo: 'D07', descripcion: 'Primas por seguros de gastos médicos', personaFisica: true, personaMoral: false },
  { codigo: 'D08', descripcion: 'Gastos de transportación escolar obligatoria', personaFisica: true, personaMoral: false },
  { codigo: 'D09', descripcion: 'Depósitos en cuentas para el ahorro', personaFisica: true, personaMoral: false },
  { codigo: 'D10', descripcion: 'Pagos por servicios educativos (colegiaturas)', personaFisica: true, personaMoral: false },
  
  // Sin efectos fiscales
  { codigo: 'S01', descripcion: 'Sin efectos fiscales', personaFisica: true, personaMoral: true },
  
  // Por definir
  { codigo: 'P01', descripcion: 'Por definir', personaFisica: true, personaMoral: true }
];

/**
 * Obtiene la descripción de una forma de pago por su código
 */
export function getFormaPagoDescripcion(codigo: string): string {
  const formaPago = FORMAS_PAGO.find(fp => fp.codigo === codigo);
  return formaPago ? formaPago.descripcion : codigo;
}

/**
 * Obtiene la descripción de un uso de CFDI por su código
 */
export function getUsoCFDIDescripcion(codigo: string): string {
  const usoCFDI = USOS_CFDI.find(uc => uc.codigo === codigo);
  return usoCFDI ? usoCFDI.descripcion : codigo;
}

/**
 * Filtra usos de CFDI según el tipo de persona
 */
export function getUsosCFDIPorTipo(esPersonaFisica: boolean): UsoCFDI[] {
  return USOS_CFDI.filter(uc => 
    esPersonaFisica ? uc.personaFisica : uc.personaMoral
  );
}

/**
 * Valida si un código de forma de pago es válido
 */
export function esFormaPagoValida(codigo: string): boolean {
  return FORMAS_PAGO.some(fp => fp.codigo === codigo);
}

/**
 * Valida si un código de uso de CFDI es válido
 */
export function esUsoCFDIValido(codigo: string): boolean {
  return USOS_CFDI.some(uc => uc.codigo === codigo);
}