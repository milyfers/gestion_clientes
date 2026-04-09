import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NuevoClienteModalComponent } from './nuevo-cliente-modal/nuevo-cliente-modal.component';
import { LoggerService } from 'src/app/core/services/logger.service';
import { environment } from 'src/environments/environment';
import { DebounceService } from 'src/app/services/debounce.service';
import { addIcons } from 'ionicons';
import { 
  chevronForwardOutline,
  homeOutline,
  personAddOutline,
  eyeOutline,
  optionsOutline,
  downloadOutline,
  printOutline,
  searchOutline,
  filterOutline,
  closeOutline,
  refreshOutline,
  funnelOutline,
  createOutline,
  trashOutline,
  addCircleOutline,
  arrowUpOutline,
  arrowDownOutline,
  swapVerticalOutline
} from 'ionicons/icons';

import { Cliente, ClienteFilters } from 'src/app/models/cliente.model';
import { SearchService } from 'src/app/services/search.service';

addIcons({ 
  homeOutline, 
  chevronForwardOutline,
  personAddOutline,
  eyeOutline,
  optionsOutline,
  downloadOutline,
  printOutline,
  searchOutline,
  filterOutline,
  closeOutline,
  refreshOutline,
  funnelOutline,
  createOutline,
  trashOutline,
  addCircleOutline,
  arrowUpOutline,
  arrowDownOutline,
  swapVerticalOutline
});

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './clients.page.html',
  styleUrls: ['./clients.page.scss'],
})
export class ClientsPage implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // ── Búsqueda simple ────────────────────────────────────────────────
  searchText = '';
  filterStatus = 'Todos';
  loading = false;

  // ── Búsqueda avanzada ──────────────────────────────────────────────
  showAdvancedSearch = false;
  advancedSearchActive = false;
  advancedFilters: ClienteFilters = {
    nombre: '',
    rfc: '',
    contacto: '',
    email: '',
    status: '',
    ciudad: '',
    estado: '',
    fechaDesde: '',
    fechaHasta: ''
  };

  // ── Datos ──────────────────────────────────────────────────────────
  clientes: Cliente[] = [];
  todosLosClientes: Cliente[] = [];

  // ── Ordenamiento ───────────────────────────────────────────────────
  columnaOrden: string = '';
  direccionOrden: 'asc' | 'desc' = 'asc';

  // ── Estadísticas ───────────────────────────────────────────────────
  estadisticas = {
    total: 0,
    activos: 0,
    inactivos: 0,
    prospectos: 0
  };

  estadosCliente = ['Todos', 'Activo', 'Inactivo', 'Prospecto'];
  estadosMexico = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
    'Chiapas', 'Chihuahua', 'Coahuila', 'Colima', 'Ciudad de México',
    'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco',
    'México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León',
    'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
    'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala',
    'Veracruz', 'Yucatán', 'Zacatecas'
  ];

  constructor(
    private router: Router,
    private searchService: SearchService,
    private modalCtrl: ModalController,
    public logger: LoggerService,
    private debounceService: DebounceService
  ) {
    
  }

  ngOnInit() {
    this.cargarClientes();
  }

  ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
  this.debounceService.cancelAll();
}

  environment = environment;

  exportarLogsSeguridad() {
    this.logger.exportLogs();
  }
  // ═══════════════════════════════════════════════════════════════════════
  //  CARGA DE DATOS
  // ═══════════════════════════════════════════════════════════════════════

  cargarClientes() {

  this.logger.startOperation();
  const start = performance.now();

  this.logger.info('carga_clientes_inicio', {
    method: 'GET',
    path: '/clientes'
  });

  this.loading = true;

  this.searchService.searchClientesConCache('')  
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (clientes) => {

        const end = performance.now();

        this.todosLosClientes = clientes;
        this.clientes = [...clientes];
        this.calcularEstadisticas();
        this.loading = false;

        this.logger.info('carga_clientes_exitosa', {
          status: 200,
          responseTimeMs: end - start,
          context: {
            totalResultados: clientes.length
          }
        });

        this.logger.endOperation();
      },
      error: (error) => {

        const end = performance.now();

        this.loading = false;

        this.logger.error('carga_clientes_error', {
          status: 500,
          responseTimeMs: end - start,
          context: {
            mensaje: error?.message
          }
        });

        this.logger.endOperation();
      }
    });
}

  // ═══════════════════════════════════════════════════════════════════════
  //  ORDENAMIENTO
  // ═══════════════════════════════════════════════════════════════════════

  ordenarPor(columna: string) {
    if (this.columnaOrden === columna) {
      // Si ya está ordenado por esta columna, invertir dirección
      this.direccionOrden = this.direccionOrden === 'asc' ? 'desc' : 'asc';
    } else {
      // Nueva columna: ordenar ascendente
      this.columnaOrden = columna;
      this.direccionOrden = 'asc';
    }
  }

  getIconoOrden(columna: string): string {
    if (this.columnaOrden !== columna) return 'swap-vertical-outline';
    return this.direccionOrden === 'asc' ? 'arrow-up-outline' : 'arrow-down-outline';
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  GETTER: Filtrado + Ordenamiento combinados
  // ═══════════════════════════════════════════════════════════════════════

  get clientesFiltrados(): Cliente[] {
    let resultado = [...this.clientes];

    // Filtros simples (si no hay búsqueda avanzada activa)
    if (!this.advancedSearchActive) {
      if (this.filterStatus !== 'Todos') {
        resultado = resultado.filter(c => c.status === this.filterStatus);
      }

      if (this.searchText.trim()) {
        const busqueda = this.searchText.toLowerCase();
        resultado = resultado.filter(c =>
          c.nombre.toLowerCase().includes(busqueda) ||
          c.rfc.toLowerCase().includes(busqueda) ||
          c.email.toLowerCase().includes(busqueda) ||
          c.telefono.includes(busqueda)
        );
      }
    }

    // Ordenamiento
    if (this.columnaOrden) {
      resultado.sort((a, b) => {
        const valA = (a as any)[this.columnaOrden];
        const valB = (b as any)[this.columnaOrden];

        let comparacion = 0;

        if (typeof valA === 'number' && typeof valB === 'number') {
          comparacion = valA - valB;
        } else {
          comparacion = String(valA ?? '').toLowerCase()
            .localeCompare(String(valB ?? '').toLowerCase(), 'es');
        }

        return this.direccionOrden === 'asc' ? comparacion : -comparacion;
      });
    }

    return resultado;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ESTADÍSTICAS
  // ═══════════════════════════════════════════════════════════════════════

  calcularEstadisticas() {
    this.estadisticas = {
      total: this.todosLosClientes.length,
      activos: this.todosLosClientes.filter(c => c.status === 'Activo').length,
      inactivos: this.todosLosClientes.filter(c => c.status === 'Inactivo').length,
      prospectos: this.todosLosClientes.filter(c => c.status === 'Prospecto').length
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  BÚSQUEDA
  // ═══════════════════════════════════════════════════════════════════════

  onSearchChange(event: any) {
  const query = event.target.value ?? '';
  this.searchText = query;
    
  this.debounceService.debounce('busqueda-clientes', () => {
    if (!query.trim()) {
      this.cargarClientes();
      return;
    }
    this.loading = true;
    this.searchService.searchClientesConCache(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clientes) => { this.clientes = clientes; this.loading = false; },
        error: () => { this.loading = false; }
      });
  }, 400);
}


  onStatusChange() {}

  filtrarPorEstado(estado: string) {
    this.filterStatus = estado;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  BÚSQUEDA AVANZADA
  // ═══════════════════════════════════════════════════════════════════════

  toggleAdvancedSearch() {
    this.showAdvancedSearch = !this.showAdvancedSearch;
  }

  aplicarFiltrosAvanzados() {

  this.logger.startOperation();
  const start = performance.now();

  this.logger.info('busqueda_avanzada_inicio', {
    method: 'POST',
    path: '/clientes/search-avanzado'
  });

  this.loading = true;

  this.searchService.searchClientesAvanzado(this.advancedFilters)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (resultado) => {

        const end = performance.now();

        this.clientes = resultado.clientes;
        this.advancedSearchActive = resultado.filtrosAplicados;
        this.loading = false;

        this.logger.info('busqueda_avanzada_exitosa', {
          status: 200,
          responseTimeMs: end - start,
          context: {
            totalResultados: resultado.clientes.length
          }
        });

        this.logger.endOperation();
      },
      error: (error) => {

        const end = performance.now();

        this.loading = false;

        this.logger.error('busqueda_avanzada_error', {
          status: 500,
          responseTimeMs: end - start,
          context: {
            mensaje: error?.message
          }
        });

        this.logger.endOperation();
      }
    });
}

  limpiarFiltrosAvanzados() {
    this.advancedFilters = {
      nombre: '', rfc: '', contacto: '', email: '',
      status: '', ciudad: '', estado: '', fechaDesde: '', fechaHasta: ''
    };
    this.advancedSearchActive = false;
    this.columnaOrden = '';
    this.cargarClientes();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ACCIONES
  // ═══════════════════════════════════════════════════════════════════════

  verDetalleCliente(cliente: Cliente) {
    this.router.navigate(['/detalle-cliente', cliente.id]);
  }

  async abrirModalNuevoCliente() {
    const modal = await this.modalCtrl.create({
      component: NuevoClienteModalComponent,
      cssClass: 'modal-nuevo-cliente'
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data) {
      this.searchService.agregarCliente(data as Cliente)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.cargarClientes();
            alert('Cliente agregado correctamente');
          },
          error: () => {
            alert('Error al guardar el cliente');
          }
        });
    }
  }

  editarCliente(cliente: Cliente, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/detalle-cliente', cliente.id]);
  }

  eliminarCliente(cliente: Cliente, event: Event) {
    event.stopPropagation();
    if (confirm(`¿Está seguro de eliminar al cliente ${cliente.nombre}?`)) {
      this.searchService.eliminarCliente(cliente.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.cargarClientes();
            alert('Cliente eliminado correctamente');
          },
          error: () => {
            alert('Error al eliminar el cliente');
          }
        });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  EXPORTAR
  // ═══════════════════════════════════════════════════════════════════════

  exportarDatos() {
    const json = JSON.stringify(this.todosLosClientes, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clientes_${new Date().getTime()}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
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

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}