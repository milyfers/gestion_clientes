import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline, closeCircleOutline,
  personOutline, shieldCheckmarkOutline,
  homeOutline, chevronForwardOutline
} from 'ionicons/icons';

addIcons({
  checkmarkCircleOutline, closeCircleOutline,
  personOutline, shieldCheckmarkOutline,
  homeOutline, chevronForwardOutline
});

@Component({
  selector: 'app-app-b',
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule],
  templateUrl: './app-b.page.html',
  styleUrls: ['./app-b.page.scss']
})
export class AppBPage implements OnInit {

  cargando       = true;
  ssoValido      = false;
  usuario: any   = null;
  errorMensaje   = '';

  private apiUrl = environment.apiUrl;

  constructor(
    private http:   HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.validarSSO();
  }

  validarSSO(): void {
  this.cargando = true;
  const token = localStorage.getItem('accessToken');

  this.http.post<any>(
    `${this.apiUrl}/sso_validar.php`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  ).subscribe({
    next: (response) => {
      this.cargando  = false;
      this.ssoValido = response.valido;
      this.usuario   = response.usuario;
    },
    error: () => {
      this.cargando     = false;
      this.ssoValido    = false;
      this.errorMensaje = 'No tienes una sesión activa. Inicia sesión en App A primero.';
    }
  });
}

  irALogin(): void {
    this.router.navigate(['/home']);
  }

  irAAppA(): void {
    this.router.navigate(['/dashboard']);
  }
}