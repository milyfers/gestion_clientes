import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  createOutline,
  trashOutline,
  downloadOutline,
  printOutline,
  callOutline,
  mailOutline,
  locationOutline,
  mapOutline,
  documentTextOutline,
  businessOutline,
  homeOutline,
  cardOutline,
  receiptOutline,
  calendarOutline,
  briefcaseOutline,
  chevronUpOutline,
  chevronDownOutline,
  chevronForwardOutline,
  saveOutline,
  closeOutline
} from 'ionicons/icons';

import { Cliente } from 'src/app/models/cliente.model';
import { SearchService } from 'src/app/services/search.service';

addIcons({
  arrowBackOutline,
  createOutline,
  trashOutline,
  downloadOutline,
  printOutline,
  callOutline,
  mailOutline,
  locationOutline,
  mapOutline,
  documentTextOutline,
  businessOutline,
  homeOutline,
  cardOutline,
  receiptOutline,
  calendarOutline,
  briefcaseOutline,
  chevronUpOutline,
  chevronDownOutline,
  chevronForwardOutline,
  saveOutline,
  closeOutline
});

@Component({
  selector: 'app-detalle-cliente',
  templateUrl: './detalle-cliente.page.html',
  styleUrls: ['./detalle-cliente.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    RouterModule,
    FormsModule
  ]
})
export class DetalleClientePage implements OnInit, OnDestroy {

  cliente?: Cliente;
  clienteEditado?: Cliente;
  cargando: boolean = true;
  modoEdicion: boolean = false;
  guardando: boolean = false;

  breadcrumbs = [
    { label: 'Inicio', url: '/dashboard', icon: 'home-outline' },
    { label: 'Clientes', url: '/clients', icon: null },
    { label: '', url: null, icon: null, active: true }
  ];

  seccionesAbiertas = {
    contacto: true,
    fiscales: true,
    proyectos: true
  };

  // Opciones para selects en modo edición
  statusOptions = ['Activo', 'Inactivo', 'Prospecto', 'Con proyecto'];

  estados = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
    'Chiapas', 'Chihuahua', 'Coahuila', 'Colima', 'Ciudad de México',
    'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco',
    'México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León',
    'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
    'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala',
    'Veracruz', 'Yucatán', 'Zacatecas'
  ];

  formasPago = [
    { codigo: '01', label: 'Efectivo' },
    { codigo: '02', label: 'Cheque nominativo' },
    { codigo: '03', label: 'Transferencia electrónica' },
    { codigo: '04', label: 'Tarjeta de crédito' },
    { codigo: '28', label: 'Tarjeta de débito' },
    { codigo: '99', label: 'Por definir' }
  ];

  usosCFDI = [
    { codigo: 'G01', label: 'Adquisición de mercancías' },
    { codigo: 'G02', label: 'Devoluciones, descuentos o bonificaciones' },
    { codigo: 'G03', label: 'Gastos en general' },
    { codigo: 'P01', label: 'Por definir' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private searchService: SearchService
  ) {}

  ngOnInit() {
    const clienteId = this.route.snapshot.paramMap.get('id');
    if (clienteId) {
      this.cargarCliente(Number(clienteId));
    } else {
      this.router.navigate(['/clients']);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CARGA DE DATOS
  // ═══════════════════════════════════════════════════════════════════════

  cargarCliente(id: number) {
  this.cargando = true;

  this.searchService.getClientePorId(id)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (cliente) => {
        if (!cliente) {
          this.mostrarMensaje('Cliente no encontrado', 'danger');
          this.router.navigate(['/clients']);
          return;
        }
        this.cliente = cliente;
        this.breadcrumbs[2].label = cliente.nombre;
        this.cargando = false;
      },
      error: () => {
        this.mostrarMensaje('Error al cargar el cliente', 'danger');
        this.cargando = false;
        this.router.navigate(['/clients']);
      }
    });
}

  // ═══════════════════════════════════════════════════════════════════════
  //  MODO EDICIÓN INLINE
  // ═══════════════════════════════════════════════════════════════════════

  activarEdicion() {
    // Clonar el cliente para no modificar el original hasta guardar
    this.clienteEditado = { ...this.cliente! };
    this.modoEdicion = true;
    // Abrir todas las secciones al editar
    this.seccionesAbiertas = { contacto: true, fiscales: true, proyectos: true };
  }

  cancelarEdicion() {
    this.clienteEditado = undefined;
    this.modoEdicion = false;
  }

  guardarEdicion() {
    if (!this.clienteEditado) return;

    // Validación básica
    if (!this.clienteEditado.nombre?.trim()) {
      this.mostrarMensaje('El nombre es obligatorio', 'warning');
      return;
    }
    if (!this.clienteEditado.rfc?.trim()) {
      this.mostrarMensaje('El RFC es obligatorio', 'warning');
      return;
    }
    if (!this.clienteEditado.contacto?.trim()) {
      this.mostrarMensaje('El contacto es obligatorio', 'warning');
      return;
    }
    if (!this.clienteEditado.email?.trim()) {
      this.mostrarMensaje('El email es obligatorio', 'warning');
      return;
    }
    if (!this.clienteEditado.telefono?.trim()) {
      this.mostrarMensaje('El teléfono es obligatorio', 'warning');
      return;
    }

    this.guardando = true;

    this.searchService.actualizarCliente(this.clienteEditado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clienteActualizado) => {
          this.cliente = clienteActualizado;
          this.breadcrumbs[2].label = this.cliente.nombre;
          this.modoEdicion = false;
          this.clienteEditado = undefined;
          this.guardando = false;
          this.mostrarMensaje('Cliente actualizado correctamente', 'success');
        },
        error: () => {
          this.mostrarMensaje('Error al guardar los cambios', 'danger');
          this.guardando = false;
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SECCIONES COLAPSABLES
  // ═══════════════════════════════════════════════════════════════════════

  toggleSeccion(seccion: keyof typeof this.seccionesAbiertas) {
    this.seccionesAbiertas[seccion] = !this.seccionesAbiertas[seccion];
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ELIMINAR
  // ═══════════════════════════════════════════════════════════════════════

  async eliminarCliente() {
    if (!this.cliente) return;

    const confirmacion = confirm(
      `¿Está seguro de eliminar al cliente ${this.cliente.nombre}? Esta acción no se puede deshacer.`
    );

    if (confirmacion) {
      this.searchService.eliminarCliente(this.cliente.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.mostrarMensaje('Cliente eliminado exitosamente', 'success');
            this.router.navigate(['/clients']);
          },
          error: () => {
            this.mostrarMensaje('Error al eliminar cliente', 'danger');
          }
        });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  EXPORTAR
  // ═══════════════════════════════════════════════════════════════════════

  exportarCliente() {
    if (!this.cliente) return;

    const json = JSON.stringify(this.cliente, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cliente_${this.cliente.id}_${new Date().getTime()}.json`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.mostrarMensaje('Datos exportados exitosamente', 'success');
  }

  volver() {
    this.router.navigate(['/clients']);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  UTILIDADES
  // ═══════════════════════════════════════════════════════════════════════

  getEstadoColor(estado: string): string {
    const colores: { [key: string]: string } = {
      'Activo': 'success',
      'Inactivo': 'danger',
      'Prospecto': 'warning'
    };
    return colores[estado] || 'medium';
  }

  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getFormaPagoLabel(codigo: string): string {
    const formas: { [key: string]: string } = {
      '01': 'Efectivo',
      '02': 'Cheque nominativo',
      '03': 'Transferencia electrónica',
      '04': 'Tarjeta de crédito',
      '28': 'Tarjeta de débito',
      '99': 'Por definir'
    };
    return formas[codigo] || codigo;
  }

  getUsoCFDILabel(codigo: string): string {
    const usos: { [key: string]: string } = {
      'G01': 'Adquisición de mercancías',
      'G03': 'Gastos en general',
      'P01': 'Por definir',
      'D01': 'Honorarios médicos',
      'D02': 'Gastos médicos',
      'D10': 'Pagos por servicios educativos'
    };
    return usos[codigo] || codigo;
  }

  async mostrarMensaje(mensaje: string, color: string) {
    console.log(`[${color.toUpperCase()}] ${mensaje}`);
  }
}