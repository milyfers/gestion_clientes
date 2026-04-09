import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { LoggerService } from 'src/app/core/services/logger.service';
import { addIcons } from 'ionicons';
import { 
  bugOutline,
  homeOutline,
  refreshOutline,
  checkmarkCircleOutline,
  alertCircleOutline
} from 'ionicons/icons';

addIcons({ 
  bugOutline,
  homeOutline,
  refreshOutline,
  checkmarkCircleOutline,
  alertCircleOutline
});
@Component({
  selector: 'app-error-500',
  templateUrl: './error-500.page.html',
  styleUrls: ['./error-500.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonicModule
  ]
})
export class Error500Page implements OnInit {

  constructor(
    private router: Router,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {

    const start = performance.now();
    this.logger.startOperation();

    this.logger.error('error_500_fallo_interno', {
      method: 'GET',
      path: window.location.pathname,
      status: 500,
      responseTimeMs: performance.now() - start,
      context: {
        mensaje: 'Fallo interno simulado',
        userAgent: navigator.userAgent
      }
    });

    this.logger.endOperation();
  }

  goHome() {
    this.router.navigate(['/']);
  }

  reloadPage() {
    window.location.reload();
  }

  reportError() {

    this.logger.info('usuario_reporta_error_500', {
      path: window.location.pathname,
      context: {
        accion: 'click_boton_reportar'
      }
    });

    alert('Gracias por reportar el error. Nuestro equipo ha sido notificado.');
  }
}