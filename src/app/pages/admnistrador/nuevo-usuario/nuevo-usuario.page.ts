import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UsuarioService, Rol } from 'src/app/services/usuario.service';
import {
  IonContent,
  IonButton,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  eyeOutline,
  eyeOffOutline,
  refreshOutline,
  saveOutline,
  closeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  warningOutline
} from 'ionicons/icons';

// ─── Datos de operaciones para el CAPTCHA matemático ─────────────────────────
const OPS_CAPTCHA = [
  { a: 5,  b: 3, op: '+', resultado: 8  },
  { a: 9,  b: 4, op: '-', resultado: 5  },
  { a: 6,  b: 7, op: '×', resultado: 42 },
  { a: 8,  b: 2, op: '+', resultado: 10 },
  { a: 12, b: 5, op: '-', resultado: 7  },
  { a: 3,  b: 9, op: '×', resultado: 27 },
  { a: 7,  b: 6, op: '+', resultado: 13 },
  { a: 15, b: 8, op: '-', resultado: 7  },
  { a: 4,  b: 8, op: '×', resultado: 32 },
  { a: 11, b: 3, op: '+', resultado: 14 }
];

@Component({
  selector: 'app-nuevo-usuario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSpinner
  ],
  templateUrl: './nuevo-usuario.page.html',
  styleUrls: ['./nuevo-usuario.page.scss']
})
export class NuevoUsuarioPage implements OnInit {

  // ── Campos del formulario ──────────────────────────────────────────────
  nombre    = '';
  email     = '';
  contrasena = '';
  contrasenaConfirmacion = '';
  rol: number | null = null; // FK int → roles.id

  // ── Catálogo de roles desde BD ─────────────────────────────────────────
  roles: Rol[] = [];

  // ── Mensajes de error ──────────────────────────────────────────────────
  errNombre                = '';
  errEmail                 = '';
  errContrasena            = '';
  errContrasenaConfirmacion = '';
  errRol                   = '';
  mensajeBackend           = '';
  tipoMensaje              = '';

  // ── CAPTCHA ────────────────────────────────────────────────────────────
  captchaActual  = OPS_CAPTCHA[0];
  respuestaCaptcha = '';
  captchaValido: boolean | null = null;

  // ── Estado ─────────────────────────────────────────────────────────────
  guardando = false;

  private readonly NOMBRE_REGEX   = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{3,}$/;
  private readonly EMAIL_REGEX    = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  private readonly CONTRASENA_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

  constructor(
    private router: Router,
    private usuarioService: UsuarioService,
    private toastCtrl: ToastController
  ) {
    addIcons({
      eyeOutline,
      eyeOffOutline,
      refreshOutline,
      saveOutline,
      closeOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      warningOutline
    });
  }

  ngOnInit(): void {
    this.generarCaptcha();
    this.cargarRoles();
  }

  // ── Cargar roles desde BD ──────────────────────────────────────────────
  cargarRoles(): void {
    this.usuarioService.getRoles().subscribe({
      next: (roles) => {
        // Excluir Superusuario (es_sistema = true) del selector
        this.roles = roles.filter(r => !r.es_sistema);
      },
      error: () => {
        this.mostrarToast('Error al cargar roles', 'danger');
      }
    });
  }

  // ── Validaciones ───────────────────────────────────────────────────────

  validarNombre(): void {
    if (!this.nombre.trim()) {
      this.errNombre = 'El campo Nombre es obligatorio.';
    } else if (!this.NOMBRE_REGEX.test(this.nombre)) {
      this.errNombre = 'Nombre debe tener al menos 3 caracteres (solo letras y espacios).';
    } else {
      this.errNombre = '';
    }
  }

  validarEmail(): void {
    if (!this.email.trim()) {
      this.errEmail = 'El campo Email es obligatorio.';
    } else if (!this.EMAIL_REGEX.test(this.email)) {
      this.errEmail = 'Formato de email no válido.';
    } else {
      this.errEmail = '';
    }
  }

  validarContrasena(): void {
    if (!this.contrasena.trim()) {
      this.errContrasena = 'El campo Contraseña es obligatorio.';
    } else if (!this.CONTRASENA_REGEX.test(this.contrasena)) {
      this.errContrasena = 'Mínimo 8 caracteres, al menos 1 letra y 1 número.';
    } else {
      this.errContrasena = '';
    }
    if (this.contrasenaConfirmacion) {
      this.validarContrasenaConfirmacion();
    }
  }

  validarContrasenaConfirmacion(): void {
    if (!this.contrasenaConfirmacion.trim()) {
      this.errContrasenaConfirmacion = 'Debe confirmar la contraseña.';
    } else if (this.contrasena !== this.contrasenaConfirmacion) {
      this.errContrasenaConfirmacion = 'Las contraseñas no coinciden.';
    } else {
      this.errContrasenaConfirmacion = '';
    }
  }

  validarRol(): void {
    if (!this.rol) {
      this.errRol = 'Debe seleccionar un rol.';
    } else {
      this.errRol = '';
    }
  }

  get hayErroresFrontend(): boolean {
    return this.errNombre !== ''
        || this.errEmail !== ''
        || this.errContrasena !== ''
        || this.errContrasenaConfirmacion !== ''
        || this.errRol !== '';
  }

  // ── CAPTCHA ────────────────────────────────────────────────────────────

  generarCaptcha(): void {
    const idx = Math.floor(Math.random() * OPS_CAPTCHA.length);
    this.captchaActual   = OPS_CAPTCHA[idx];
    this.respuestaCaptcha = '';
    this.captchaValido   = null;
  }

  verificarCaptcha(): void {
    this.captchaValido = parseInt(this.respuestaCaptcha, 10) === this.captchaActual.resultado;
  }

  // ── Guardar ────────────────────────────────────────────────────────────

  guardarUsuario(): void {
    this.mensajeBackend = '';
    this.tipoMensaje    = '';

    // 1. Validaciones frontend
    this.validarNombre();
    this.validarEmail();
    this.validarContrasena();
    this.validarContrasenaConfirmacion();
    this.validarRol();

    if (this.hayErroresFrontend) {
      this.mostrarToast('Por favor, corrija los errores en el formulario.', 'warning');
      return;
    }

    // 2. CAPTCHA
    this.verificarCaptcha();
    if (!this.captchaValido) {
      this.mostrarToast('Respuesta del CAPTCHA incorrecta.', 'danger');
      return;
    }

    // 3. Llamada al backend
    this.guardando = true;

    this.usuarioService.crearUsuario({
      nombre:   this.nombre,
      email:    this.email,
      password: this.contrasena,
      role:     this.rol!  // number, validado arriba
    }).subscribe({
      next: () => {
        this.guardando = false;
        this.mostrarToast('¡Usuario creado correctamente!', 'success');
        setTimeout(() => this.router.navigate(['/gestion-usuarios']), 1500);
      },
      error: (err) => {
        this.guardando = false;
        this.mensajeBackend = err.error?.message || 'Error en el servidor';
        this.tipoMensaje    = 'danger';
        this.mostrarToast(this.mensajeBackend, 'danger');
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/gestion-usuarios']);
  }

  // ── Toast ──────────────────────────────────────────────────────────────

  async mostrarToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2800,
      color,
      position: 'bottom'
    });
    toast.present();
  }
}