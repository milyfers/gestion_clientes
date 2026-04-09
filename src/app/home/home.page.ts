import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderService } from '../services/header';
import { Router } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonInput,
  IonIcon,
  IonSpinner,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  eyeOutline,
  eyeOffOutline,
  refreshOutline,
  imageOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  informationCircleOutline
} from 'ionicons/icons';

import { LoggerService } from '../core/services/logger.service';
import { AuthService } from '../services/auth.service';

// ─── CAPTCHA ─────────────────────────────────────────
const OPS_CAPTCHA = [
  { a: 5,  b: 3,  op: '+', resultado: 8  },
  { a: 9,  b: 4,  op: '-', resultado: 5  },
  { a: 6,  b: 7,  op: '×', resultado: 42 },
  { a: 8,  b: 2,  op: '+', resultado: 10 },
  { a: 12, b: 5,  op: '-', resultado: 7  }
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonInput,
    IonIcon,
    IonSpinner
  ],
  templateUrl: './home.page.html',
  styleUrls:  ['./home.page.scss']
})
export class HomePage {

  // ── FORMULARIO ─────────────────────────
  email      = '';
  contrasena = '';
  mostrarContrasena = false;

  // ── ERRORES ─────────────────────────
  errEmail      = '';
  errContrasena = '';

  // ── CAPTCHA ─────────────────────────
  captchaActual      = OPS_CAPTCHA[0];
  respuestaCaptcha   = '';
  captchaValido: boolean | null = null;
  captchaResuelto    = false;

  // ── ESTADO ─────────────────────────
  cargandoLogin = false;
  bloqueado     = false;

  // ── MENSAJES ─────────────────────────
  mensajeBackend = '';
  tipoMensaje    = '';

  // ── MFA ─────────────────────────────
  mostrarMFA  = false;
  usuarioIdMFA = 0;
  emailMFA    = '';
  codigoMFA   = '';
  codigoDevMFA = '';
  cargandoMFA = false;
  errMFA      = '';

  constructor(
    private toastCtrl:     ToastController,
    private router:        Router,
    private headerService: HeaderService,
    private logger:        LoggerService,
    private authService:   AuthService
  ) {
    addIcons({
      eyeOutline,
      eyeOffOutline,
      refreshOutline,
      imageOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      informationCircleOutline
    });
  }

  ionViewWillEnter(): void {
  this.headerService.ocultarHeader();
  this.generarCaptcha();
  this.mostrarMFA   = false;
  this.usuarioIdMFA = 0;
  this.emailMFA     = '';
  this.codigoMFA    = '';
  this.errMFA       = '';
  this.email        = '';
  this.contrasena   = '';
  this.bloqueado    = false;
}

  // ═══════════════════════════════════════
  // VALIDACIONES FRONTEND
  // ═══════════════════════════════════════

  private readonly EMAIL_REGEX      = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  private readonly CONTRASENA_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

  validarEmail(): void {
    if (!this.email.trim()) {
      this.errEmail = 'El email es obligatorio';
    } else if (!this.EMAIL_REGEX.test(this.email)) {
      this.errEmail = 'Formato de email inválido';
    } else {
      this.errEmail = '';
    }
  }

  validarContrasena(): void {
    if (!this.contrasena.trim()) {
      this.errContrasena = 'La contraseña es obligatoria';
    } else if (!this.CONTRASENA_REGEX.test(this.contrasena)) {
      this.errContrasena = 'Mínimo 8 caracteres con letras y números';
    } else {
      this.errContrasena = '';
    }
  }

  get hayErroresFrontend(): boolean {
    return !!(this.errEmail || this.errContrasena);
  }

  // ═══════════════════════════════════════
  // CAPTCHA
  // ═══════════════════════════════════════

  generarCaptcha(): void {
    const index = Math.floor(Math.random() * OPS_CAPTCHA.length);
    this.captchaActual    = OPS_CAPTCHA[index];
    this.respuestaCaptcha = '';
    this.captchaValido    = null;
    this.captchaResuelto  = false;
  }

  verificarCaptcha(): void {
    if (this.captchaResuelto) return;
    this.captchaValido = parseInt(this.respuestaCaptcha, 10) === this.captchaActual.resultado;
    if (this.captchaValido) {
      this.captchaResuelto = true;
    }
  }

  // ═══════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════

  iniciarSesion(): void {
    // Si está bloqueado no hacer nada
    if (this.bloqueado) return;

    this.mensajeBackend = '';
    this.tipoMensaje    = '';
    this.logger.startOperation();

    this.validarEmail();
    this.validarContrasena();

    if (this.hayErroresFrontend) {
      this.logger.warn('validacion_frontend_fallida', { status: 400 });
      this.logger.endOperation();
      return;
    }

    // Verificar captcha solo si no está resuelto
    if (!this.captchaResuelto) {
      this.verificarCaptcha();
      if (!this.captchaValido) {
        this.logger.warn('captcha_incorrecto', { status: 400 });
        this.logger.endOperation();
        this.mostrarToast('Captcha incorrecto', 'danger');
        this.generarCaptcha();
        return;
      }
    }

    this.cargandoLogin = true;

    this.authService.login(this.email, this.contrasena).subscribe({
      next: (response) => {
        this.cargandoLogin = false;

        if (response.mfaRequerido) {
          this.usuarioIdMFA = response.usuarioId;
          this.emailMFA     = response.email;
          this.codigoDevMFA = response.codigo_dev;
          this.mostrarMFA   = true;
          this.mostrarToast(`Código MFA: ${response.codigo_dev}`, 'warning');
          return;
        }

        this.headerService.guardarSesion(response.user, response.accessToken);
        this.mostrarToast('Bienvenido', 'success');
        setTimeout(() => this.router.navigate(['/dashboard']), 1000);
      },

      error: (error) => {
        this.cargandoLogin = false;

        if (error.status === 429) {
          // Cuenta bloqueada — deshabilitar formulario
          this.bloqueado      = true;
          this.mensajeBackend = 'Cuenta bloqueada temporalmente. Espera 15 minutos.';
          this.tipoMensaje    = 'danger';
          this.mostrarToast(this.mensajeBackend, 'danger');
          return;
        }

        // Error 401 — credenciales incorrectas
        const intentosRestantes = error.error?.intentosRestantes ?? null;
        this.mensajeBackend     = error.error?.message || 'Error en el servidor';

        if (intentosRestantes !== null && intentosRestantes > 0) {
          this.mensajeBackend += ` (${intentosRestantes} intentos restantes)`;
        } else if (intentosRestantes === 0) {
          this.mensajeBackend  = 'Cuenta bloqueada temporalmente. Espera 15 minutos.';
          this.bloqueado       = true;
        }

        this.tipoMensaje = 'danger';
        this.mostrarToast(this.mensajeBackend, 'danger');
      }
    });
  }

  // ═══════════════════════════════════════
  // MFA
  // ═══════════════════════════════════════

  verificarCodigoMFA(): void {
     if (this.cargandoMFA) return;
  const codigo = String(this.codigoMFA).trim();

  if (!codigo || codigo.length !== 6) {
    this.errMFA = 'Ingresa el código de 6 dígitos';
    return;
  }

  this.cargandoMFA = true;
  this.errMFA      = '';

  this.authService.verificarMFA(this.usuarioIdMFA, codigo).subscribe({
    next: (response) => {
      this.cargandoMFA = false;
      // ❌ Quita esta línea — el AuthService ya guardó todo en el tap()
      // this.headerService.guardarSesion(response.user, response.accessToken);
      
      // ✅ Solo llama al header para mostrar el menú
      this.headerService.guardarSesion(response.user, response.accessToken);
      this.mostrarToast('Bienvenido', 'success');
      setTimeout(() => this.router.navigate(['/dashboard']), 1000);
    },
    error: (error) => {
      this.cargandoMFA = false;
      this.errMFA = error.error?.message || 'Código inválido';
    }
  });
}

  // ═══════════════════════════════════════
  // NAVEGACIÓN
  // ═══════════════════════════════════════

  recuperarContrasena(): void {
    this.router.navigate(['/forgot-password']);
  }

  // ═══════════════════════════════════════
  // TOAST
  // ═══════════════════════════════════════

  async mostrarToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });
    toast.present();
  }
}