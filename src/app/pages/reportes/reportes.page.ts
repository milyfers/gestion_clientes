import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonBadge, IonItem, IonLabel, IonSelect, IonSelectOption,
  IonGrid, IonRow, IonCol, IonButton, IonIcon, IonChip,
  IonProgressBar, IonNote,
  IonList, IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  barChartOutline, peopleOutline, folderOutline, cartOutline,
  trendingUpOutline, trendingDownOutline, downloadOutline,
  calendarOutline, checkmarkCircleOutline, alertCircleOutline,
  timeOutline, statsChartOutline
} from 'ionicons/icons';

interface KPI {
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  color: string;
  icono: string;
  tendencia?: 'up' | 'down' | 'neutral';
  pct?: number;
}

interface ProyectoResumen {
  nombre: string;
  cliente: string;
  status: string;
  presupuesto: number;
  avance: number;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    CommonModule, FormsModule,RouterModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonBadge, IonItem, IonLabel, IonSelect, IonSelectOption,
    IonGrid, IonRow, IonCol, IonButton, IonIcon, IonChip,
    IonProgressBar, IonNote,
    IonList, IonSpinner
  ],
  templateUrl: './reportes.page.html',
  styleUrls: ['./reportes.page.scss']
})
export class ReportesPage implements OnInit {

  // ── Estado ──────────────────────────────────────────────────────────────
  periodo = signal<string>('mes');
  seccion = signal<string>('resumen');
  cargando = signal(false);

  // ── KPIs principales ────────────────────────────────────────────────────
  kpis = signal<KPI[]>([
    {
      titulo: 'Total Clientes',
      valor: 24,
      subtitulo: '+3 este mes',
      color: 'primary',
      icono: 'people-outline',
      tendencia: 'up',
      pct: 14
    },
    {
      titulo: 'Proyectos Activos',
      valor: 11,
      subtitulo: '4 por entregar',
      color: 'success',
      icono: 'folder-outline',
      tendencia: 'up',
      pct: 22
    },
    {
      titulo: 'Compras del Mes',
      valor: '$69,200',
      subtitulo: '6 órdenes',
      color: 'warning',
      icono: 'cart-outline',
      tendencia: 'down',
      pct: 8
    },
    {
      titulo: 'Proyectos Completados',
      valor: 38,
      subtitulo: 'acumulado año',
      color: 'tertiary',
      icono: 'checkmark-circle-outline',
      tendencia: 'up',
      pct: 5
    }
  ]);

  // ── Proyectos resumen ───────────────────────────────────────────────────
  proyectos = signal<ProyectoResumen[]>([
    { nombre: 'Remodelación Oficina',  cliente: 'Corporativo Norte',   status: 'en_progreso', presupuesto: 180000, avance: 75 },
    { nombre: 'Sistema ERP',           cliente: 'Tech Solutions MX',   status: 'en_progreso', presupuesto: 320000, avance: 40 },
    { nombre: 'Diseño Branding',       cliente: 'Moda Querétaro',      status: 'completado',  presupuesto: 45000,  avance: 100 },
    { nombre: 'App Móvil Ventas',      cliente: 'Distribuidora Pérez', status: 'en_progreso', presupuesto: 95000,  avance: 55 },
    { nombre: 'Consultoría Fiscal',    cliente: 'Grupo Empresarial',   status: 'pendiente',   presupuesto: 28000,  avance: 0 },
    { nombre: 'Infraestructura Cloud', cliente: 'DataCenter QRO',      status: 'completado',  presupuesto: 210000, avance: 100 },
  ]);

  // ── Distribución por status ────────────────────────────────────────────
  distribucionStatus = computed(() => {
    const all = this.proyectos();
    const total = all.length || 1;
    return [
      { label: 'En progreso', count: all.filter(p => p.status === 'en_progreso').length, color: 'primary',  pct: 0 },
      { label: 'Completados', count: all.filter(p => p.status === 'completado').length,  color: 'success',  pct: 0 },
      { label: 'Pendientes',  count: all.filter(p => p.status === 'pendiente').length,   color: 'warning',  pct: 0 },
      { label: 'Cancelados',  count: all.filter(p => p.status === 'cancelado').length,   color: 'danger',   pct: 0 },
    ].map(d => ({ ...d, pct: Math.round((d.count / total) * 100) }));
  });

  // ── Top clientes por proyectos ─────────────────────────────────────────
  topClientes = computed(() => {
    const map = new Map<string, number>();
    this.proyectos().forEach(p => {
      map.set(p.cliente, (map.get(p.cliente) ?? 0) + 1);
    });
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nombre, proyectos]) => ({ nombre, proyectos }));
  });

  // ── Presupuesto total ──────────────────────────────────────────────────
  presupuestoTotal = computed(() =>
    this.proyectos().reduce((acc, p) => acc + p.presupuesto, 0)
  );

  presupuestoCompletados = computed(() =>
    this.proyectos()
      .filter(p => p.status === 'completado')
      .reduce((acc, p) => acc + p.presupuesto, 0)
  );

  // ── Compras por categoría (mock) ────────────────────────────────────────
  comprasPorCategoria = signal([
    { label: 'Material',  total: 28500, pct: 41 },
    { label: 'Equipo',    total: 25200, pct: 36 },
    { label: 'Servicio',  total: 12000, pct: 17 },
    { label: 'Otro',      total:  3500, pct:  5 },
  ]);

  // ── Actividad reciente (mock) ───────────────────────────────────────────
  actividadReciente = signal([
    { tipo: 'cliente',  icono: 'people-outline',            color: 'primary',  desc: 'Nuevo cliente: Grupo Expansión',          fecha: 'Hace 2h'    },
    { tipo: 'proyecto', icono: 'folder-outline',            color: 'success',  desc: 'Proyecto completado: Diseño Branding',    fecha: 'Hace 5h'    },
    { tipo: 'compra',   icono: 'cart-outline',              color: 'warning',  desc: 'OC recibida: Materiales García $1,700',   fecha: 'Ayer'       },
    { tipo: 'proyecto', icono: 'alert-circle-outline',      color: 'danger',   desc: 'Proyecto retrasado: App Móvil Ventas',    fecha: 'Hace 2 días'},
    { tipo: 'compra',   icono: 'cart-outline',              color: 'warning',  desc: 'Nueva OC: Tech Solutions $55,500',        fecha: 'Hace 3 días'},
  ]);

  readonly periodos = [
    { valor: 'semana',    label: 'Semana'    },
    { valor: 'mes',       label: 'Mes'       },
    { valor: 'trimestre', label: 'Trimestre' },
    { valor: 'anio',      label: 'Año'       },
  ];

  constructor() {
    addIcons({
      barChartOutline, peopleOutline, folderOutline, cartOutline,
      trendingUpOutline, trendingDownOutline, downloadOutline,
      calendarOutline, checkmarkCircleOutline, alertCircleOutline,
      timeOutline, statsChartOutline
    });
  }

  ngOnInit() {}

  colorStatus(status: string): string {
    const map: Record<string, string> = {
      en_progreso: 'primary',
      completado:  'success',
      pendiente:   'warning',
      cancelado:   'danger'
    };
    return map[status] ?? 'medium';
  }

  etiquetaStatus(status: string): string {
    const map: Record<string, string> = {
      en_progreso: 'En progreso',
      completado:  'Completado',
      pendiente:   'Pendiente',
      cancelado:   'Cancelado'
    };
    return map[status] ?? status;
  }

  onPeriodo(valor: string) {
    this.cargando.set(true);
    this.periodo.set(valor);
    setTimeout(() => this.cargando.set(false), 600);
  }
}