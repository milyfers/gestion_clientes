import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, ViewChildren, QueryList, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonSpinner} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  briefcaseOutline, logOutOutline, personCircleOutline,
  timeOutline, peopleOutline, folderOpenOutline,
  statsChartOutline, settingsOutline, chevronUpOutline,
  chevronDownOutline, checkmarkCircleOutline, informationCircleOutline,
  calendarOutline, shieldCheckmarkOutline, notificationsOutline, closeOutline, alertCircleOutline, searchOutline
} from 'ionicons/icons';

import { PerformanceService } from 'src/app/services/performance.service';
import { PollingService, Notificacion } from 'src/app/services/polling.service';
import { SearchService } from 'src/app/services/search.service';
import { MetricsPanelComponent } from '../metrics-panel/metrics-panel.component';
import { DebounceService } from 'src/app/services/debounce.service';
import { FormsModule } from '@angular/forms';
import { MetricsService } from 'src/app/services/metrics';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon, IonSpinner, MetricsPanelComponent, FormsModule],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss']
})
export class DashboardPage implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('carouselTrack') carouselTrack!: ElementRef<HTMLElement>;
  @ViewChild('parallaxEl')   parallaxEl!: ElementRef<HTMLElement>;
  @ViewChild('panelInner')   panelInner!: ElementRef<HTMLElement>;
  @ViewChildren('ionContent', { read: ElementRef }) contentEl!: QueryList<ElementRef>;
  @ViewChild(MetricsPanelComponent) metricsPanel!: MetricsPanelComponent;

  // ── Fecha/hora ────────────────────────────────────────────────────
  fechaHora = '';
  private intervalo: ReturnType<typeof setInterval> | null = null;

  // ── Carrusel ──────────────────────────────────────────────────────
  currentSlide = 0;
  private autoplayInterval: ReturnType<typeof setInterval> | null = null;
  private touchStartX = 0;
  private isTransitioning = false;

  slides = [
    { titulo: 'Gestión de Clientes', descripcion: 'Administra tus clientes y prospectos fácilmente.', icon: 'people-outline', color: 'linear-gradient(135deg, #667eea, #764ba2)' },
    { titulo: 'Control de Proyectos', descripcion: 'Visualiza el estado de todos tus proyectos activos.', icon: 'folder-open-outline', color: 'linear-gradient(135deg, #f093fb, #f5576c)' },
    { titulo: 'Reportes y Estadísticas', descripcion: 'Analiza el rendimiento de tu negocio en tiempo real.', icon: 'stats-chart-outline', color: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
    { titulo: 'Configuración', descripcion: 'Personaliza el sistema según tus necesidades.', icon: 'settings-outline', color: 'linear-gradient(135deg, #43e97b, #38f9d7)' }
  ];

  // ── Panel colapsable ───────────────────────────────────────────────
  panelVisible = false;
  panelHeight = '0px';

  infoItems = [
    { icon: 'checkmark-circle-outline', label: 'Versión del sistema', valor: 'v2.0.0' },
    { icon: 'calendar-outline',         label: 'Última actualización', valor: 'Marzo 2026' },
    { icon: 'shield-checkmark-outline', label: 'Seguridad',            valor: 'Activa' },
    { icon: 'information-circle-outline', label: 'Soporte',            valor: 'admin@empresa.com' }
  ];

  // ── Accesos rápidos ───────────────────────────────────────────────
  quickCards = [
    { titulo: 'Clientes',   descripcion: 'Ver y gestionar clientes',   icon: 'people-outline',      action: () => this.router.navigate(['/clients']) },
    { titulo: 'Proyectos',  descripcion: 'Administrar proyectos',       icon: 'folder-open-outline', action: () => this.router.navigate(['/projects']) },
    { titulo: 'Reportes',   descripcion: 'Estadísticas del negocio',    icon: 'stats-chart-outline', action: () => {} },
    { titulo: 'Ajustes',    descripcion: 'Configuración del sistema',   icon: 'settings-outline',    action: () => {} },
    { titulo: 'App B — SSO', descripcion: 'Portal de Reportes', icon: 'shield-checkmark-outline', action: () => this.router.navigate(['/app-b']) 
}
  ];

  // ── Polling / Notificaciones (Parte 6) ────────────────────────────
  notificaciones: Notificacion[] = [];
  hayNotificacionesNuevas = false;
  mostrarNotificaciones = false;
  private pollingSubscription: any;

  // ── IntersectionObserver ──────────────────────────────────────────
  private scrollObserver!: IntersectionObserver;

  // ── MÉTRICAS — inputs para MetricsPanelComponent ─────────────────
  tiempoCarga = 0;
  cacheHits   = 0;

  textoBusqueda = '';
buscando      = false;
sinResultados = false;
resultadosBusqueda: { titulo: string; tipo: string; icon: string; action: () => void }[] = [];

usuarioActual: any = null;

  constructor(private router: Router, private ngZone: NgZone, private perfService: PerformanceService, private metricsService: MetricsService, private pollingService: PollingService, private searchService: SearchService, private debounceService: DebounceService ) {
    addIcons({
      briefcaseOutline, logOutOutline, personCircleOutline, timeOutline,
      peopleOutline, folderOpenOutline, statsChartOutline, settingsOutline,
      chevronUpOutline, chevronDownOutline, checkmarkCircleOutline,
      informationCircleOutline, calendarOutline, shieldCheckmarkOutline, notificationsOutline, closeOutline, alertCircleOutline, searchOutline
    });
  }

  ngOnInit(): void {
    this.usuarioActual = JSON.parse(localStorage.getItem('user') || '{}');
    this.actualizarFechaHora();
    this.intervalo = setInterval(() => this.actualizarFechaHora(), 1000);
    this.perfService.imprimirReporte();
    this.iniciarPolling();
    this.cargarDatosVisuales(); // ← reemplaza el console.log anterior
  }

  ngAfterViewInit(): void {
    this.iniciarCarrusel();
    this.iniciarScrollReveal();
  }

  ngOnDestroy(): void {
    if (this.intervalo)       clearInterval(this.intervalo);
    if (this.autoplayInterval) clearInterval(this.autoplayInterval);
    if (this.scrollObserver)  this.scrollObserver.disconnect();
    this.pollingService.detener();
    if (this.pollingSubscription) this.pollingSubscription.unsubscribe();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CARGA DE DATOS + MÉTRICAS (Parte 2 y 5)
  // ═══════════════════════════════════════════════════════════════════

  private async cargarDatosVisuales(): Promise<void> {
  const inicio = performance.now();
  const result = await this.searchService.cargarDashboard();

  this.metricsService.setTiempoCarga(Math.round(performance.now() - inicio)); // ← servicio

  this.searchService.cargarDashboard().then(() => {
    this.metricsService.registrarCacheHit(); // ← servicio
  });

  this.metricsPanel?.registrarEvento(
    `Dashboard cargado: ${result.clientes.length} clientes, ${result.proyectos.length} proyectos`,
    'success'
  );

  if (result.errores?.length) {
    result.errores.forEach(e => this.metricsPanel?.registrarError(e));
  }
}

  // ═══════════════════════════════════════════════════════════════════
  //  FECHA Y HORA
  // ═══════════════════════════════════════════════════════════════════

  private actualizarFechaHora(): void {
    this.fechaHora = new Date().toLocaleString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CARRUSEL AVANZADO — sin librerías (Parte 3.4)
  // ═══════════════════════════════════════════════════════════════════

  private iniciarCarrusel(): void {
    this.goToSlide(0);
    this.autoplayInterval = setInterval(() => {
      this.ngZone.run(() => this.nextSlide());
    }, 3500);
  }

  goToSlide(index: number): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const total = this.slides.length;
    this.currentSlide = ((index % total) + total) % total;

    const track = this.carouselTrack?.nativeElement;
    if (track) {
      track.style.transform = `translateX(-${this.currentSlide * 100}%)`;
    }

    requestAnimationFrame(() => {
      setTimeout(() => { this.isTransitioning = false; }, 500);
    });
  }

  nextSlide(): void { this.goToSlide(this.currentSlide + 1); }
  prevSlide(): void { this.goToSlide(this.currentSlide - 1); }

  onTouchStart(e: TouchEvent): void { this.touchStartX = e.touches[0].clientX; }
  onTouchEnd(e: TouchEvent): void {
    const diff = this.touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? this.nextSlide() : this.prevSlide();
  }

  pauseAutoplay(): void {
    if (this.autoplayInterval) clearInterval(this.autoplayInterval);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SCROLL REVEAL — IntersectionObserver
  // ═══════════════════════════════════════════════════════════════════

  private iniciarScrollReveal(): void {
    this.scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('revealed');
          }, i * 100);
          this.scrollObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    setTimeout(() => {
      document.querySelectorAll('.scroll-reveal').forEach(el => {
        this.scrollObserver.observe(el);
      });
    }, 100);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PARALLAX CON MOUSEMOVE
  // ═══════════════════════════════════════════════════════════════════

  onMouseMove(event: MouseEvent): void {
    requestAnimationFrame(() => {
      const el = this.parallaxEl?.nativeElement;
      if (!el) return;
      const { innerWidth: w, innerHeight: h } = window;
      const moveX = ((event.clientX / w) - 0.5) * 20;
      const moveY = ((event.clientY / h) - 0.5) * 10;
      el.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  EFECTO MAGNÉTICO EN BOTONES
  // ═══════════════════════════════════════════════════════════════════

  onMagneticMove(event: MouseEvent): void {
    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const moveX = (event.clientX - centerX) * 0.25;
    const moveY = (event.clientY - centerY) * 0.25;
    requestAnimationFrame(() => {
      btn.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.05)`;
    });
  }

  onMagneticLeave(event: MouseEvent): void {
    const btn = event.currentTarget as HTMLElement;
    requestAnimationFrame(() => {
      btn.style.transform = 'translate(0px, 0px) scale(1)';
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PANEL COLAPSABLE — sin display:none
  // ═══════════════════════════════════════════════════════════════════

  togglePanel(): void {
    this.panelVisible = !this.panelVisible;
    if (this.panelVisible) {
      const altura = this.panelInner?.nativeElement?.scrollHeight ?? 300;
      this.panelHeight = `${altura}px`;
    } else {
      this.panelHeight = '0px';
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  POLLING
  // ═══════════════════════════════════════════════════════════════════

  private iniciarPolling(): void {
    this.pollingSubscription = this.pollingService.notificaciones$
      .subscribe((notif: Notificacion) => {
        if (this.notificaciones.some(n => n.id === notif.id)) return;
        this.notificaciones.unshift(notif);
        if (this.notificaciones.length > 10) this.notificaciones.pop();
        this.hayNotificacionesNuevas = true;
        // Registrar en el panel de métricas
        this.metricsPanel?.registrarEvento(`Notificación: ${notif.mensaje}`, notif.tipo);
        if (this.mostrarNotificaciones) {
          setTimeout(() => { notif.nueva = false; }, 5000);
        }
      });
    this.pollingService.iniciar();
  }

  toggleNotificaciones(): void {
    this.mostrarNotificaciones = !this.mostrarNotificaciones;
    if (this.mostrarNotificaciones) {
      setTimeout(() => {
        this.notificaciones.forEach(n => n.nueva = false);
        this.hayNotificacionesNuevas = false;
      }, 1000);
    }
  }

  cerrarNotificacion(id: string): void {
    this.notificaciones = this.notificaciones.filter(n => n.id !== id);
    this.hayNotificacionesNuevas = this.notificaciones.some(n => n.nueva);
  }

  getColorNotificacion(tipo: string): string {
    const colores: Record<string, string> = {
      success: '#43e97b', warning: '#f5a623', info: '#4facfe'
    };
    return colores[tipo] ?? '#4facfe';
  }

  // ═══════════════════════════════════════════════════════════════════
//  BUSCADOR GLOBAL CON DEBOUNCE (Parte 2 y 5)
// ═══════════════════════════════════════════════════════════════════

onBusquedaChange(event: any): void {
  const query = event.target.value ?? '';
  this.textoBusqueda = query;
  this.sinResultados = false;

  if (!query.trim()) { this.limpiarBusqueda(); return; }

  this.buscando = true;

  // ← DEBOUNCE: espera 400ms antes de buscar
  this.debounceService.debounce('dashboard-busqueda', () => {
    Promise.allSettled([
      this.searchService.searchClientesConCache(query).toPromise(),
      this.searchService.searchProyectosConCache(query).toPromise()
    ]).then(([resClientes, resProyectos]) => {
      const resultados: any[] = [];

      if (resClientes.status === 'fulfilled') {
        resClientes.value?.slice(0, 3).forEach((c: any) => {
          resultados.push({
            titulo: c.nombre,
            tipo: 'Cliente · ' + c.status,
            icon: 'people-outline',
            action: () => this.router.navigate(['/clients'])
          });
        });
      }

      if (resProyectos.status === 'fulfilled') {
        resProyectos.value?.slice(0, 3).forEach((p: any) => {
          resultados.push({
            titulo: p.nombre,
            tipo: `Proyecto · ${p.status} · Cliente: ${p.cliente}`, 
            icon: 'folder-open-outline',
            action: () => this.router.navigate(['/projects'])
          });
        });
      }

      this.resultadosBusqueda = resultados;
      this.sinResultados      = resultados.length === 0;
      this.buscando           = false;

      // registrar en métricas
      this.metricsPanel?.registrarEvento(
        `Búsqueda "${query}": ${resultados.length} resultados`, 'info'
      );
    });
  }, 400);
}

limpiarBusqueda(): void {
  this.textoBusqueda      = '';
  this.resultadosBusqueda = [];
  this.sinResultados      = false;
  this.buscando           = false;
}
}