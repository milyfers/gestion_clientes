import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UsuarioService, Usuario } from 'src/app/services/usuario.service';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonCard,
  IonCardContent,
  IonBadge,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  ToastController,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  personOutline,
  createOutline,
  trashOutline,
  searchOutline,
  shieldCheckmarkOutline,
  lockClosedOutline,
  lockOpenOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-gestion-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonIcon,
    IonSearchbar,
    IonCard,
    IonCardContent,
    IonBadge,
    IonList,
    IonItem,
    IonLabel,
    IonAvatar
  ],
  templateUrl: './gestion-usuarios.page.html',
  styleUrls: ['./gestion-usuarios.page.scss']
})
export class GestionUsuariosPage implements OnInit {

  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  terminoBusqueda = '';
  

  constructor(
    private router: Router,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private usuarioService: UsuarioService
  ) {
    addIcons({
      addOutline,
      personOutline,
      createOutline,
      trashOutline,
      searchOutline,
      shieldCheckmarkOutline,
      lockClosedOutline,
      lockOpenOutline
    });
  }

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  ionViewWillEnter(): void {
  this.cargarUsuarios();
}

  // ═══════════════════════════════════════════════════════════════════════════
  //  CARGA DE DATOS
  // ═══════════════════════════════════════════════════════════════════════════

  cargarUsuarios(): void {
    this.usuarioService.getUsuarios().subscribe({
      next: (usuarios) => {
        this.usuarios = usuarios;
        this.usuariosFiltrados = [...usuarios];
      },
      error: () => {
        this.mostrarToast('Error al cargar usuarios', 'danger');
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  ESTADÍSTICAS
  // ═══════════════════════════════════════════════════════════════════════════

  get usuariosActivos(): number {
    return this.usuarios.filter(u => u.status === 'Activo').length;
  }

  get administradores(): number {
  return this.usuarios.filter(u => u.role === 1 || u.role === 2).length;
}

  // ═══════════════════════════════════════════════════════════════════════════
  //  BÚSQUEDA
  // ═══════════════════════════════════════════════════════════════════════════

  buscarUsuarios(event: any): void {
    const termino = event.target.value?.toLowerCase() || '';
    this.terminoBusqueda = termino;

    if (!termino.trim()) {
      this.cargarUsuarios();
      return;
    }

    this.usuarioService.getUsuarios(termino).subscribe({
      next: (usuarios) => {
        this.usuariosFiltrados = usuarios;
      },
      error: () => {
        this.mostrarToast('Error al buscar usuarios', 'danger');
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  NAVEGACIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  nuevoUsuario(): void {
    this.router.navigate(['/nuevo-usuario']);
  }

  editarUsuario(usuario: Usuario): void {
    this.router.navigate(['/editar-usuario', usuario.id]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  ELIMINAR
  // ═══════════════════════════════════════════════════════════════════════════

  async eliminarUsuario(usuario: Usuario): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar eliminación',
      message: `¿Está seguro de eliminar a <strong>${usuario.nombre}</strong>?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.usuarioService.eliminarUsuario(usuario.id).subscribe({
              next: () => {
                this.mostrarToast('Usuario eliminado correctamente', 'success');
                this.cargarUsuarios();
              },
              error: (err) => {
                this.mostrarToast(
                  err.error?.message || 'Error al eliminar usuario', 'danger'
                );
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  // Agrega este método junto a eliminarUsuario()
async toggleBloqueo(usuario: Usuario): Promise<void> {
  const accion = usuario.status === 'Activo' ? 'bloquear' : 'desbloquear';
  const nuevoStatus = usuario.status === 'Activo' ? 'Inactivo' : 'Activo';

  const alert = await this.alertCtrl.create({
    header: `Confirmar ${accion}`,
    message: `¿Desea ${accion} a <strong>${usuario.nombre}</strong>?`,
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: accion.charAt(0).toUpperCase() + accion.slice(1),
        handler: () => {
          this.usuarioService.cambiarStatusUsuario(usuario.id, nuevoStatus).subscribe({
            next: () => {
              this.mostrarToast(`Usuario ${accion === 'bloquear' ? 'bloqueado' : 'desbloqueado'} correctamente`, 'success');
              this.cargarUsuarios();
            },
            error: (err) => {
              this.mostrarToast(err.error?.message || `Error al ${accion} usuario`, 'danger');
            }
          });
        }
      }
    ]
  });
  await alert.present();
}
  // ═══════════════════════════════════════════════════════════════════════════
  //  UTILIDADES
  // ═══════════════════════════════════════════════════════════════════════════

  getRolColor(rol: string): string {
    const colores: { [key: string]: string } = {
      'Superusuario':   'dark',
      'Dirección':      'danger',
      'Administración': 'warning',
      'Supervisión':    'tertiary',
      'Ingeniería':     'primary',
      'Vendedor':       'success'
    };
    return colores[rol] || 'medium';
  }

  getStatusColor(status: string): string {
    return status === 'Activo' ? 'success' : 'medium';
  }

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