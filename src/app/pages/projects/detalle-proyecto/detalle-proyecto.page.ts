import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  chevronForwardOutline,
  downloadOutline,
  printOutline,
  eyeOutline,
  createOutline,
  trashOutline,
  saveOutline,
  closeOutline,
  arrowBackOutline,
  calendarOutline,
  personOutline,
  cashOutline,
  documentTextOutline
} from 'ionicons/icons';

import { Proyecto } from 'src/app/models/proyecto.model';
import { SearchService } from 'src/app/services/search.service';

addIcons({
  homeOutline,
  chevronForwardOutline,
  downloadOutline,
  printOutline,
  eyeOutline,
  createOutline,
  trashOutline,
  saveOutline,
  closeOutline,
  arrowBackOutline,
  calendarOutline,
  personOutline,
  cashOutline,
  documentTextOutline
});

interface DocumentoProyecto {
  id: number;
  name: string;
  status: 'COMPLETADO' | 'EN PROCESO' | 'PENDIENTE';
}

@Component({
  selector: 'app-detalle-proyecto',
  templateUrl: './detalle-proyecto.page.html',
  styleUrls: ['./detalle-proyecto.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonicModule
  ]
})
export class DetalleProyectoPage implements OnInit, OnDestroy {

  proyecto?: Proyecto;
  proyectoEditado?: Proyecto;
  cargando = true;
  modoEdicion = false;
  guardando = false;

  private destroy$ = new Subject<void>();

  breadcrumbs = [
    { label: 'Inicio', url: '/dashboard', icon: 'home-outline' },
    { label: 'Proyectos', url: '/projects', icon: null },
    { label: '', url: null, icon: null, active: true }
  ];

  statusOptions = ['Activo', 'Finalizado', 'En Pausa', 'Cancelado'];

  documents: DocumentoProyecto[] = [
    { id: 1, name: 'REGISTRO DE CLIENTE', status: 'COMPLETADO' },
    { id: 2, name: 'CAMBIO DE DOMICILIO ACTUAL', status: 'COMPLETADO' },
    { id: 3, name: 'PROPUESTA TÉCNICA', status: 'COMPLETADO' },
    { id: 4, name: 'PRESUPUESTO', status: 'COMPLETADO' },
    { id: 5, name: 'CONTRATO', status: 'COMPLETADO' },
    { id: 6, name: 'DETALLE DE MATERIALES', status: 'EN PROCESO' },
    { id: 7, name: 'COMPRA', status: 'PENDIENTE' },
    { id: 8, name: 'INSTALACIÓN', status: 'PENDIENTE' },
    { id: 9, name: 'ENTREGA', status: 'PENDIENTE' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private searchService: SearchService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cargarProyecto(Number(id));
    } else {
      this.router.navigate(['/projects']);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CARGA DE DATOS
  // ═══════════════════════════════════════════════════════════════════════

  cargarProyecto(id: number) {
  this.cargando = true;
  this.searchService.getProyectoPorId(id)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (proyecto) => {
        this.proyecto = proyecto;
        this.breadcrumbs[2].label = proyecto.nombre;
        this.cargando = false;
      },
      error: () => {
        alert('Proyecto no encontrado');
        this.cargando = false;
        this.router.navigate(['/projects']);
      }
    });
}

  // ═══════════════════════════════════════════════════════════════════════
  //  MODO EDICIÓN INLINE
  // ═══════════════════════════════════════════════════════════════════════

  activarEdicion() {
    this.proyectoEditado = { ...this.proyecto! };
    this.modoEdicion = true;
  }

  cancelarEdicion() {
    this.proyectoEditado = undefined;
    this.modoEdicion = false;
  }

  guardarEdicion() {
    if (!this.proyectoEditado) return;

    if (!this.proyectoEditado.nombre?.trim()) {
      alert('El nombre es obligatorio');
      return;
    }
    if (!this.proyectoEditado.cliente?.trim()) {
      alert('El cliente es obligatorio');
      return;
    }

    this.guardando = true;
    this.searchService.actualizarProyecto(this.proyectoEditado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (actualizado) => {
          this.proyecto = actualizado;
          this.breadcrumbs[2].label = this.proyecto.nombre;
          this.modoEdicion = false;
          this.proyectoEditado = undefined;
          this.guardando = false;
          alert('Proyecto actualizado correctamente');
        },
        error: () => {
          alert('Error al guardar los cambios');
          this.guardando = false;
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ELIMINAR
  // ═══════════════════════════════════════════════════════════════════════

  eliminarProyecto() {
    if (!this.proyecto) return;
    if (confirm(`¿Está seguro de eliminar el proyecto "${this.proyecto.nombre}"? Esta acción no se puede deshacer.`)) {
      this.searchService.eliminarProyecto(this.proyecto.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            alert('Proyecto eliminado exitosamente');
            this.router.navigate(['/projects']);
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

  exportarProyecto() {
    if (!this.proyecto) return;
    const json = JSON.stringify(this.proyecto, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `proyecto_${this.proyecto.id}_${new Date().getTime()}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    alert('Proyecto exportado correctamente');
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  DOCUMENTOS
  // ═══════════════════════════════════════════════════════════════════════

  viewDocument(doc: DocumentoProyecto) {
    console.log('Ver documento:', doc);
  }

  editDocument(doc: DocumentoProyecto) {
    console.log('Editar documento:', doc);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  UTILIDADES
  // ═══════════════════════════════════════════════════════════════════════

  getStatusColor(status: string): string {
    const colores: { [key: string]: string } = {
      'COMPLETADO': 'success',
      'EN PROCESO': 'warning',
      'PENDIENTE': 'medium',
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
      month: 'long',
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

  volver() {
    this.router.navigate(['/projects']);
  }
}