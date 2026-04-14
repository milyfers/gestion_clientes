import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import {
  IonContent, IonButton, IonInput,
  IonIcon, IonSpinner, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  lockOpenOutline, mailOutline, mailOpenOutline, keyOutline,
  checkmarkCircleOutline, alertCircleOutline, closeCircleOutline,
  arrowBackOutline, refreshOutline, timeOutline, eyeOutline,
  eyeOffOutline, imageOutline, informationCircleOutline,
  warningOutline, flashOutline, phonePortraitOutline, callOutline,
  helpCircleOutline
} from 'ionicons/icons';

import { DebounceService } from 'src/app/services/debounce.service';
import { CacheService }    from 'src/app/services/cache.service';
import { LoggerService }   from 'src/app/core/services/logger.service';
import { HttpClient }      from '@angular/common/http';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonInput, IonIcon, IonSpinner],
  templateUrl: './forgot-password.page.html',
  styleUrls:  ['./forgot-password.page.scss']
})
export class ForgotPasswordPage implements OnInit, OnDestroy {

  paso = 1;

  // ── Paso 1 ─────────────────────────────────────
  email             = '';
  errEmail          = '';
  emailVerificado:  boolean | null = null;
  verificandoEmail  = false;
  desdecache        = false;
  peticionCancelada = false;
  errorParcial      = '';
  cargando          = false;
  promiseValidar: 'ok' | 'err' | null = null;
  promiseEnviar:  'ok' | 'err' | null = null;

  // ── Método de recuperación ─────────────────────
  metodo: 'email' | 'sms' | 'llamada' | 'pregunta' = 'email';
  telefonoMask = '';

  // Variables nuevas — agrégalas junto a las demás del paso 2
preguntaTexto    = '';
respuestaSecreta = '';
errRespuesta     = '';
  // ── Paso 2 ─────────────────────────────────────
  codigoGenerado  = '';
  codigoIngresado = '';
  codigoValido:   boolean | null = null;
  errCodigo       = '';
  tiempoRestante  = 120;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // ── Paso 3 ─────────────────────────────────────
  nuevaContrasena    = '';
  confirmar          = '';
  errNuevaContrasena = '';
  errConfirmar       = '';
  mostrarContrasena  = false;
  fuerzaContrasena   = 0;
  fuerzaLabel        = '';

  private readonly EMAIL_REGEX      = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  private readonly CONTRASENA_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

  private apiUrl = environment.apiUrl;
  usuarioId = 0;

  constructor(
    private router:          Router,
    private toastCtrl:       ToastController,
    private debounceService: DebounceService,
    private cacheService:    CacheService,
    private logger:          LoggerService,
    private http:            HttpClient
  ) {
    addIcons({
      lockOpenOutline, mailOutline, mailOpenOutline, keyOutline,
      checkmarkCircleOutline, alertCircleOutline, closeCircleOutline,
      arrowBackOutline, refreshOutline, timeOutline, eyeOutline,
      eyeOffOutline, imageOutline, informationCircleOutline,
      warningOutline, flashOutline, phonePortraitOutline, callOutline, helpCircleOutline
    });
  }

  ngOnInit(): void {}
  ngOnDestroy(): void { this.limpiarTimer(); }

  // ═══════════════════════════════════════════════════════════════════════
  //  PASO 1 — VERIFICAR EMAIL CON DEBOUNCE + CACHÉ
  // ═══════════════════════════════════════════════════════════════════════

  onEmailChange(): void {
    this.emailVerificado   = null;
    this.desdecache        = false;
    this.peticionCancelada = false;
    this.errorParcial      = '';
    this.metodo            = 'email'; // reset método al cambiar email

    if (!this.EMAIL_REGEX.test(this.email)) {
      this.errEmail = 'Formato de email no válido.';
      return;
    }

    this.errEmail         = '';
    this.verificandoEmail = true;

    this.debounceService.debounce('verificar-email', () => {
      const cacheKey = 'email_check_' + this.email.toLowerCase().trim();
      const cached   = this.cacheService.get<boolean>(cacheKey);

      if (cached !== null) {
        this.emailVerificado  = cached;
        this.verificandoEmail = false;
        this.desdecache       = true;
        return;
      }

      this.http.post<any>(`${this.apiUrl}/forgot_password.php`, {
        email: this.email
      }).subscribe({
        next: (response) => {
          this.emailVerificado  = response.encontrado;
          this.verificandoEmail = false;
          this.cacheService.set(cacheKey, response.encontrado, 2 * 60 * 1000);
        },
        error: () => {
          this.emailVerificado  = null;
          this.verificandoEmail = false;
        }
      });
    }, 600);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PASO 1 — ENVIAR CÓDIGO
  // ═══════════════════════════════════════════════════════════════════════

  async enviarCodigo(): Promise<void> {
  if (!this.email) return;

  if (this.metodo === 'pregunta') {
    // ← Llama al backend primero para asegurar que usuarioId esté cargado
    this.cargando = true;
    this.http.post<any>(`${this.apiUrl}/pregunta_secreta.php`, {
      accion: 'obtener',
      email:  this.email
    }).subscribe({
      next: (res) => {
        this.cargando = false;
        if (res.encontrado) {
          this.preguntaTexto = res.pregunta;
          this.usuarioId     = res.usuarioId; // ← ahora sí se guarda
          this.paso          = 2;
        } else {
          this.mostrarToast('Este usuario no tiene pregunta secreta configurada', 'warning');
        }
      },
      error: () => {
        this.cargando = false;
        this.mostrarToast('Error al obtener la pregunta', 'danger');
      }
    });
    return;
  }

  this.cargando       = true;
  this.promiseValidar = null;
  this.promiseEnviar  = null;
  this.errorParcial   = '';

  this.http.post<any>(`${this.apiUrl}/forgot_password.php`, {
    email:  this.email,
    metodo: this.metodo
  }).subscribe({
    next: (response) => {
      this.cargando = false;

      if (!response.encontrado) {
        this.errorParcial = 'Email no registrado en el sistema';
        return;
      }

      this.promiseValidar = 'ok';
      this.promiseEnviar  = 'ok';
      this.usuarioId      = response.usuarioId;
      this.telefonoMask   = response.telefono_mask ?? '';
      this.paso           = 2;
      this.iniciarTimer();

      const mensajes: Record<string, string> = {
        email:   'Código enviado a ' + this.email,
        sms:     'SMS simulado enviado a ' + this.telefonoMask,
        llamada: 'Llamada simulada generada'
      };
      this.mostrarToast(mensajes[this.metodo], 'success');
    },
    error: () => {
      this.cargando     = false;
      this.errorParcial = 'Error al conectar con el servidor';
    }
  });
}

  // ═══════════════════════════════════════════════════════════════════════
  //  PASO 2 — VERIFICAR CÓDIGO
  // ═══════════════════════════════════════════════════════════════════════

  onCodigoChange(): void {
    this.errCodigo    = '';
    this.codigoValido = null;
    if (this.codigoIngresado.length === 6) {
      this.codigoValido = this.codigoIngresado === this.codigoGenerado;
      if (!this.codigoValido) this.errCodigo = 'Código incorrecto.';
    }
  }

  async verificarCodigo(): Promise<void> {
    if (this.codigoIngresado.length < 6) return;
    this.limpiarTimer();
    this.paso = 3;
  }

  async reenviarCodigo(): Promise<void> {
    this.cacheService.invalidate('email_check_' + this.email.toLowerCase().trim());
    this.tiempoRestante  = 120;
    this.codigoIngresado = '';
    this.codigoValido    = null;
    this.errCodigo       = '';
    await this.enviarCodigo();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PASO 3 — NUEVA CONTRASEÑA
  // ═══════════════════════════════════════════════════════════════════════

  validarNuevaContrasena(): void {
    if (!this.nuevaContrasena) {
      this.errNuevaContrasena = 'La contraseña es obligatoria.';
      this.fuerzaContrasena   = 0;
      return;
    }
    this.errNuevaContrasena = this.CONTRASENA_REGEX.test(this.nuevaContrasena)
      ? '' : 'Mínimo 8 caracteres, al menos 1 letra y 1 número.';
    this.calcularFuerza();
    if (this.confirmar) this.validarConfirmar();
  }

  validarConfirmar(): void {
    if (!this.confirmar) {
      this.errConfirmar = 'Confirma la contraseña.';
    } else if (this.confirmar !== this.nuevaContrasena) {
      this.errConfirmar = 'Las contraseñas no coinciden.';
    } else {
      this.errConfirmar = '';
    }
  }

  private calcularFuerza(): void {
    const p = this.nuevaContrasena;
    let score = 0;
    if (p.length >= 8)  score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p)) score++;
    this.fuerzaContrasena = Math.min(score, 3) || 1;
    this.fuerzaLabel = ['', 'Débil', 'Media', 'Fuerte'][this.fuerzaContrasena];
  }

  async cambiarContrasena(): Promise<void> {
    this.validarNuevaContrasena();
    this.validarConfirmar();
    if (this.errNuevaContrasena || this.errConfirmar) return;

    this.cargando = true;

    this.http.post<any>(`${this.apiUrl}/reset_password.php`, {
      usuarioId: this.usuarioId,
      codigo:    this.codigoIngresado,
      password:  this.nuevaContrasena
    }).subscribe({
      next: () => {
        this.cargando = false;
        this.paso     = 4;
        this.cacheService.invalidate('email_check_' + this.email.toLowerCase().trim());
        setTimeout(() => this.router.navigate(['/home']), 2500);
      },
      error: (err) => {
        this.cargando     = false;
        this.errorParcial = err.error?.message || 'Error al cambiar contraseña';
        this.mostrarToast(this.errorParcial, 'danger');
      }
    });
  }

// Método para cuando selecciona "pregunta" — carga la pregunta automáticamente
seleccionarPregunta(): void {
  this.metodo = 'pregunta';
  if (!this.emailVerificado || !this.email) return;

  this.http.post<any>(`${this.apiUrl}/pregunta_secreta.php`, {
    accion: 'obtener',
    email:  this.email
  }).subscribe({
    next: (res) => {
      if (res.encontrado) {
        this.preguntaTexto = res.pregunta;
        this.usuarioId     = res.usuarioId;
      } else {
        this.preguntaTexto = '';
      }
    },
    error: () => { this.preguntaTexto = ''; }
  });
}

verificarPreguntaSecreta(): void {
  console.log('usuarioId al verificar:', this.usuarioId); // ← agrega esto
  console.log('respuesta:', this.respuestaSecreta);
  
  if (!this.respuestaSecreta.trim()) {
    this.errRespuesta = 'Ingresa tu respuesta';
    return;
  }

  this.cargando = true;
  this.errRespuesta = '';

  this.http.post<any>(`${this.apiUrl}/pregunta_secreta.php`, {
    accion:    'verificar',
    usuarioId: this.usuarioId,
    respuesta: this.respuestaSecreta
  }).subscribe({
    next: () => {
      this.cargando = false;
      this.paso     = 3; // Salta directo a nueva contraseña
    },
    error: (err) => {
      this.cargando     = false;
      this.errRespuesta = err.error?.message || 'Respuesta incorrecta';
    }
  });
}
  // ═══════════════════════════════════════════════════════════════════════
  //  UTILIDADES
  // ═══════════════════════════════════════════════════════════════════════

  private iniciarTimer(): void {
    this.tiempoRestante = 120;
    this.timerInterval  = setInterval(() => {
      this.tiempoRestante > 0 ? this.tiempoRestante-- : this.limpiarTimer();
    }, 1000);
  }

  private limpiarTimer(): void {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
  }

  volver(): void { this.router.navigate(['/home']); }

  async mostrarToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 2800, color, position: 'bottom' });
    toast.present();
  }
}