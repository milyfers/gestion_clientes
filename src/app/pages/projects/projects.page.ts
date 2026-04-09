import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { LoggerService } from 'src/app/core/services/logger.service';
import { DebounceService } from 'src/app/services/debounce.service';
import { addIcons } from 'ionicons';
import {
  chevronForwardOutline,
  homeOutline,
  addCircleOutline,
  eyeOutline,
  createOutline,
  trashOutline,
  downloadOutline,
  printOutline,
  searchOutline,
  filterOutline,
  closeOutline,
  refreshOutline,
  funnelOutline,
  swapVerticalOutline,
  arrowUpOutline,
  arrowDownOutline,
  briefcaseOutline,
  checkmarkCircleOutline,
  pauseCircleOutline,
  closeCircleOutline,
  documentTextOutline
} from 'ionicons/icons';

import { Proyecto, ProyectoFilters } from 'src/app/models/proyecto.model';
import { SearchService } from 'src/app/services/search.service';
import { NuevoProyectoModalComponent } from './nuevo-proyecto-modal/nuevo-proyecto-modal.component';


addIcons({
  chevronForwardOutline,
  homeOutline,
  addCircleOutline,
  eyeOutline,
  createOutline,
  trashOutline,
  downloadOutline,
  printOutline,
  searchOutline,
  filterOutline,
  closeOutline,
  refreshOutline,
  funnelOutline,
  swapVerticalOutline,
  arrowUpOutline,
  arrowDownOutline,
  briefcaseOutline,
  checkmarkCircleOutline,
  pauseCircleOutline,
  closeCircleOutline,
  documentTextOutline
});

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    RouterModule,
    DragDropModule
  ],
  templateUrl: './projects.page.html',
  styleUrls: ['./projects.page.scss'],
})
export class ProjectsPage implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // ── Búsqueda ───────────────────────────────────────────────────────
  searchText = '';
  filterStatus = 'Todos';
  loading = false;

  // ── Búsqueda avanzada ──────────────────────────────────────────────
  showAdvancedSearch = false;
  advancedSearchActive = false;
  advancedFilters: ProyectoFilters = {
    nombre: '',
    cliente: '',
    status: '',
    fechaInicio: '',
    fechaFin: ''
  };

  // ── Datos ──────────────────────────────────────────────────────────
  proyectos: Proyecto[] = [];
  todosLosProyectos: Proyecto[] = [];

  // ── Ordenamiento ───────────────────────────────────────────────────
  columnaOrden: string = '';
  direccionOrden: 'asc' | 'desc' = 'asc';

  // ── Estadísticas ───────────────────────────────────────────────────
  estadisticas = {
    total: 0,
    activos: 0,
    finalizados: 0,
    enPausa: 0,
    cancelados: 0
  };

  statusOptions = ['Activo', 'Finalizado', 'En Pausa', 'Cancelado'];


  statsCards = [
  { key: 'Todos', label: 'Total', value: () => this.estadisticas.total, class: '' },
  { key: 'Activo', label: 'Activos', value: () => this.estadisticas.activos, class: 'activo' },
  { key: 'Finalizado', label: 'Completados', value: () => this.estadisticas.finalizados, class: 'finalizado' },
  { key: 'En Pausa', label: 'En Pausa', value: () => this.estadisticas.enPausa, class: 'pausa' },
  { key: 'Cancelado', label: 'Cancelados', value: () => this.estadisticas.cancelados, class: 'cancelado' }
];

  constructor(
    private router: Router,
    private searchService: SearchService,
    private modalCtrl: ModalController, 
    private logger: LoggerService,
    private debounceService: DebounceService
  ) {}

  ngOnInit() {
    this.cargarProyectos();
  }

  ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
  this.debounceService.cancelAll();
}

  
  drop(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.statsCards, event.previousIndex, event.currentIndex);
  }
  // ═══════════════════════════════════════════════════════════════════════
  //  CARGA DE DATOS
  // ═══════════════════════════════════════════════════════════════════════

  cargarProyectos() {
    this.logger.startOperation();
    const start = performance.now();

    this.logger.info('carga_proyectos_inicio', {
      method: 'GET',
      path: '/projects'
    });
    this.loading = true;
    this.searchService.searchProyectos('')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (proyectos) => {
          const end = performance.now();
          this.todosLosProyectos = proyectos;
          this.proyectos = [...proyectos];
          this.calcularEstadisticas();
          this.loading = false;

          this.logger.info('carga_proyectos_exitosa', {
          status: 200,
          responseTimeMs: end - start,
          context: {
            totalResultados: proyectos.length
          }
        });

        this.logger.endOperation();
      
        },
       error: (error) => {

        const end = performance.now();

        this.loading = false;

        this.logger.error('carga_proyectos_error', {
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
  //  ESTADÍSTICAS
  // ═══════════════════════════════════════════════════════════════════════

  calcularEstadisticas() {
    this.estadisticas = {
      total: this.todosLosProyectos.length,
      activos: this.todosLosProyectos.filter(p => p.status === 'Activo').length,
      finalizados: this.todosLosProyectos.filter(p => p.status === 'Finalizado').length,
      enPausa: this.todosLosProyectos.filter(p => p.status === 'En Pausa').length,
      cancelados: this.todosLosProyectos.filter(p => p.status === 'Cancelado').length
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ORDENAMIENTO
  // ═══════════════════════════════════════════════════════════════════════

  ordenarPor(columna: string) {
    if (this.columnaOrden === columna) {
      this.direccionOrden = this.direccionOrden === 'asc' ? 'desc' : 'asc';
    } else {
      this.columnaOrden = columna;
      this.direccionOrden = 'asc';
    }
  }

  getIconoOrden(columna: string): string {
    if (this.columnaOrden !== columna) return 'swap-vertical-outline';
    return this.direccionOrden === 'asc' ? 'arrow-up-outline' : 'arrow-down-outline';
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  GETTER: Filtrado + Ordenamiento
  // ═══════════════════════════════════════════════════════════════════════

  get proyectosFiltrados(): Proyecto[] {
    let resultado = [...this.proyectos];

    if (!this.advancedSearchActive) {
      if (this.filterStatus !== 'Todos') {
        resultado = resultado.filter(p => p.status === this.filterStatus);
      }
      if (this.searchText.trim()) {
        const busqueda = this.searchText.toLowerCase();
        resultado = resultado.filter(p =>
          p.nombre.toLowerCase().includes(busqueda) ||
          p.cliente.toLowerCase().includes(busqueda) ||
          (p.descripcion?.toLowerCase().includes(busqueda) ?? false)
        );
      }
    }

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
  //  BÚSQUEDA
  // ═══════════════════════════════════════════════════════════════════════

  onSearchChange(event: any) {
  const query = event.target.value ?? '';
  this.searchText = query;

  // Si está vacío, recargar todo inmediatamente sin debounce
  if (!query.trim()) {
    this.debounceService.cancelDebounce('busqueda-proyectos');
    this.cargarProyectos();
    return;
  }

  // Debounce de 400ms — espera que el usuario deje de escribir
  this.debounceService.debounce('busqueda-proyectos', () => {

    this.logger.startOperation();
    const start = performance.now();

    this.logger.info('busqueda_proyectos_inicio', {
      method: 'GET',
      path: '/projects/search',
      context: { longitudBusqueda: query.length }
    });

    this.loading = true;

    // Usa caché — si ya buscó este query, no llama de nuevo
    this.searchService.searchProyectosConCache(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (proyectos) => {
          const end = performance.now();
          this.proyectos = proyectos;
          this.loading = false;

          this.logger.info('busqueda_proyectos_exitosa', {
            status: 200,
            responseTimeMs: end - start,
            context: { totalResultados: proyectos.length }
          });

          this.logger.endOperation();
        },
        error: (error) => {
          const end = performance.now();
          this.loading = false;

          this.logger.error('busqueda_proyectos_error', {
            status: 500,
            responseTimeMs: end - start,
            context: { mensaje: error?.message }
          });

          this.logger.endOperation();
        }
      });

  }, 400);
}
  onStatusChange() {}

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
    path: '/projects/search-avanzado'
  });

    this.loading = true;
    this.searchService.searchProyectosAvanzado(this.advancedFilters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resultado) => {
          const end = performance.now();
          this.proyectos = resultado.proyectos;
          this.advancedSearchActive = resultado.filtrosAplicados;
          this.loading = false;
        this.logger.info('busqueda_avanzada_exitosa', {
          status: 200,
          responseTimeMs: end - start,
          context: {
            totalResultados: resultado.proyectos.length
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
    this.advancedFilters = { nombre: '', cliente: '', status: '', fechaInicio: '', fechaFin: '' };
    this.advancedSearchActive = false;
    this.columnaOrden = '';
    this.cargarProyectos();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CRUD
  // ═══════════════════════════════════════════════════════════════════════

  async abrirModalNuevoProyecto() {
  const modal = await this.modalCtrl.create({
    component: NuevoProyectoModalComponent,
    cssClass: 'modal-nuevo-proyecto'
  });

  await modal.present();

  const { data, role } = await modal.onWillDismiss();

  if (role === 'confirm' && data) {
    this.searchService.agregarProyecto(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cargarProyectos();
          alert('Proyecto agregado correctamente');
        },
        error: () => {
          alert('Error al guardar el proyecto');
        }
      });
  }
}

  verDetalleProyecto(proyecto: Proyecto) {
    this.router.navigate(['/detalle-proyecto', proyecto.id]);
  }

  editarProyecto(proyecto: Proyecto, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/detalle-proyecto', proyecto.id]);
  }

  eliminarProyecto(proyecto: Proyecto, event: Event) {
    event.stopPropagation();
    if (confirm(`¿Está seguro de eliminar el proyecto "${proyecto.nombre}"? Esta acción no se puede deshacer.`)) {
      this.searchService.eliminarProyecto(proyecto.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.cargarProyectos();
            alert('Proyecto eliminado correctamente');
          },
          error: () => {
            alert('Error al eliminar el proyecto');
          }
        });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  EXPORTAR
  // ═══════════════════════════════════════════════════════════════════════

  exportarDatos() {
    const json = JSON.stringify(this.todosLosProyectos, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `proyectos_${new Date().getTime()}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  UTILIDADES
  // ═══════════════════════════════════════════════════════════════════════

  getEstadoColor(status: string): string {
    const colores: { [key: string]: string } = {
      'Activo': 'success',
      'Finalizado': 'medium',
      'En Pausa': 'warning',
      'Cancelado': 'danger'
    };
    return colores[status] || 'medium';
  }

  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatearPresupuesto(presupuesto: number | undefined): string {
    if (!presupuesto) return 'N/A';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(presupuesto);
  }
}