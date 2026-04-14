import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { IonicModule, MenuController, ToastController } from '@ionic/angular';
import { LoggerService } from './core/services/logger.service';
import { addIcons } from 'ionicons';
import { 
  personAddOutline, 
  eyeOutline, 
  personOutline, 
  settingsOutline, 
  logOutOutline,
  moonOutline,
  sunnyOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';
import { HeaderService } from './services/header';

addIcons({ 
  personAddOutline, 
  eyeOutline,
  personOutline,
  settingsOutline,
  logOutOutline,
  moonOutline,
  sunnyOutline,
  shieldCheckmarkOutline
});

interface Submenu {
  title: string;
  url: string;
}

interface MenuItem {
  title: string;
  url: string;
  active: boolean;
  submenu?: Submenu[];
}


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonicModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppComponent {
  usuarioActual: any = null;
  showUserMenu = false;
  darkMode = false;
  idioma   = localStorage.getItem('idioma') ?? 'es'; 
  mostrarHeader$ = this.headerService.mostrar$;
  menuItems$ = this.headerService.menuItems$;

  constructor(
    private menuCtrl: MenuController,
    private router: Router,
    private toastCtrl: ToastController,
    private headerService: HeaderService,
    private logger: LoggerService
  ) {
    // Detectar preferencia del sistema al iniciar
    //this.darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    //document.documentElement.classList.toggle('ion-palette-dark', this.darkMode);
    this.handleGlobalErrors(); 
    const user = localStorage.getItem('user');
    if (user && user !== 'undefined' && user !== 'null') {
      try {
        this.usuarioActual = JSON.parse(user);
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
  }

  private handleGlobalErrors() {

  // Captura errores no controlados
  window.onerror = (message, source, lineno, colno, error) => {

    this.logger.startOperation();

    this.logger.error('frontend_error_global', {
      path: window.location.pathname,
      status: 500,
      context: {
        message,
        source,
        lineno,
        colno,
        stack: error?.stack
      }
    });

    this.logger.endOperation();

    return false;
  };

  // Captura promesas rechazadas
  window.addEventListener('unhandledrejection', (event: any) => {

    this.logger.startOperation();

    this.logger.error('frontend_unhandled_promise', {
      path: window.location.pathname,
      status: 500,
      context: {
        reason: event.reason
      }
    });

    this.logger.endOperation();

  });
}

  // ── Modo oscuro ─────────────────────────────────────────────────────
  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    document.documentElement.classList.toggle('ion-palette-dark', this.darkMode);
  }

  setActive(item: MenuItem) {
    this.menuCtrl.close('main-menu');
  }

  closeMenu() {
    this.menuCtrl.close('main-menu');
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByUrl(index: number, item: MenuItem | Submenu): string {
    return item.url;
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu() {
    this.showUserMenu = false;
  }

  // ── Cerrar sesión ───────────────────────────────────────────────────
  cerrarSesion(): void {
  this.usuarioActual = null;        
  this.showUserMenu = false;        
  this.mostrarToast('Sesión cerrada.', 'primary');
  this.headerService.resetearMenu();
  localStorage.clear();
  sessionStorage.clear();
  setTimeout(() => {
    this.router.navigate(['/home'], { replaceUrl: true }); 
  }, 800);
}

  goToProfile() {
    this.router.navigate(['/profile']);
    this.closeUserMenu();
  }

  goToSettings() {
    this.router.navigate(['/settings']);
    this.closeUserMenu();
  }

  goToSesiones() {
  this.router.navigate(['/sesiones']);
  this.closeUserMenu();
}

toggleIdioma(): void {
  this.idioma = this.idioma === 'es' ? 'en' : 'es';
  localStorage.setItem('idioma', this.idioma);

  const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
  if (select) {
    select.value = this.idioma;
    select.dispatchEvent(new Event('change'));
  }
}

  // ── Toast ───────────────────────────────────────────────────────────
  async mostrarToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2200,
      color,
      position: 'bottom'
    });
    toast.present();
  }
}