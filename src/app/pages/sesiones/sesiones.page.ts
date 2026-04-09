import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  laptopOutline,
  phonePortraitOutline,
  tabletPortraitOutline,
  closeCircleOutline,
  shieldCheckmarkOutline,
  timeOutline,
  locationOutline,
  logOutOutline,
  homeOutline,
  chevronForwardOutline
} from 'ionicons/icons';

import { SessionService, Session } from 'src/app/services/session.service';

addIcons({
  laptopOutline,
  phonePortraitOutline,
  tabletPortraitOutline,
  closeCircleOutline,
  shieldCheckmarkOutline,
  timeOutline,
  locationOutline,
  logOutOutline,
  homeOutline,
  chevronForwardOutline
});

@Component({
  selector: 'app-sesiones',
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule],
  templateUrl: './sesiones.page.html',
  styleUrls: ['./sesiones.page.scss']
})
export class SesionesPage implements OnInit, OnDestroy {

  sesiones: Session[] = [];
  cargando = false;
  private destroy$ = new Subject<void>();

  constructor(
    private sessionService: SessionService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarSesiones();
  }

  ionViewWillEnter(): void {
    this.cargarSesiones();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CARGA
  // ═══════════════════════════════════════════════════════════════════

  cargarSesiones(): void {
    this.cargando = true;
    this.sessionService.getSesiones()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sesiones) => {
          this.sesiones = sesiones;
          this.cargando = false;
        },
        error: () => {
          this.mostrarToast('Error al cargar sesiones', 'danger');
          this.cargando = false;
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CERRAR SESIÓN ESPECÍFICA
  // ═══════════════════════════════════════════════════════════════════

  async cerrarSesion(sesion: Session): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar sesión',
      message: '¿Deseas cerrar esta sesión remota?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cerrar',
          role: 'destructive',
          handler: () => {
            this.sessionService.cerrarSesion(sesion.id)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => {
                  this.mostrarToast('Sesión cerrada', 'success');
                  this.cargarSesiones();
                },
                error: () => this.mostrarToast('Error al cerrar sesión', 'danger')
              });
          }
        }
      ]
    });
    await alert.present();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CERRAR TODAS
  // ═══════════════════════════════════════════════════════════════════

  async cerrarTodas(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar todas las sesiones',
      message: '¿Deseas cerrar todas las sesiones activas? Tendrás que iniciar sesión de nuevo.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cerrar todas',
          role: 'destructive',
          handler: () => {
            this.sessionService.cerrarTodasLasSesiones()
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => {
                  this.mostrarToast('Todas las sesiones cerradas', 'success');
                  localStorage.clear();
                  setTimeout(() => this.router.navigate(['/home']), 1000);
                },
                error: () => this.mostrarToast('Error al cerrar sesiones', 'danger')
              });
          }
        }
      ]
    });
    await alert.present();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UTILIDADES
  // ═══════════════════════════════════════════════════════════════════

  getDeviceIcon(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'phone-portrait-outline';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet-portrait-outline';
    }
    return 'laptop-outline';
  }

  getDeviceName(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    let browser = 'Navegador desconocido';
    let os = '';

    if (ua.includes('chrome'))       browser = 'Chrome';
    else if (ua.includes('firefox'))  browser = 'Firefox';
    else if (ua.includes('safari'))   browser = 'Safari';
    else if (ua.includes('edge'))     browser = 'Edge';

    if (ua.includes('windows'))      os = 'Windows';
    else if (ua.includes('mac'))     os = 'Mac';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone'))  os = 'iPhone';
    else if (ua.includes('linux'))   os = 'Linux';

    return os ? `${browser} — ${os}` : browser;
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  async mostrarToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message, duration: 2500, color, position: 'bottom'
    });
    toast.present();
  }
}
