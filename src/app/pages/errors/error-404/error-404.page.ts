import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { LoggerService } from 'src/app/core/services/logger.service';

@Component({
  selector: 'app-error-404',
  templateUrl: './error-404.page.html',
  styleUrls: ['./error-404.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonicModule
  ]
})
export class Error404Page implements OnInit {

  constructor(
    private router: Router,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {

    const start = performance.now();
    this.logger.startOperation();

    this.logger.warn('error_404_ruta_no_encontrada', {
      method: 'GET',
      path: window.location.pathname,
      status: 404,
      responseTimeMs: performance.now() - start,
      context: {
        mensaje: 'Ruta inexistente accedida por el usuario'
      }
    });

    this.logger.endOperation();
  }

  goHome() {
    this.router.navigate(['/']);
  }

  goBack() {
    window.history.back();
  }
}