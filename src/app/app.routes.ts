import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot-password/forgot-password.page').then(m => m.ForgotPasswordPage)
  },

  // ── Protegidas solo con login ────────────────────────────────
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage)
  },
  {
    path: 'sesiones',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/sesiones/sesiones.page').then(m => m.SesionesPage)
  },
  {
    path: 'clients',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/clients/clients.page').then(m => m.ClientsPage)
  },
  {
    path: 'detalle-cliente/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/clients/detalle-cliente/detalle-cliente.page').then(m => m.DetalleClientePage)
  },
  {
    path: 'projects',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/projects/projects.page').then(m => m.ProjectsPage)
  },
  {
    path: 'detalle-proyecto/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/projects/detalle-proyecto/detalle-proyecto.page').then(m => m.DetalleProyectoPage)
  },
  {
    path: 'compras',
    canActivate: [authGuard, roleGuard(['Superusuario', 'Dirección', 'Administración', 'Supervisión', 'Ingeniería'])],
    loadComponent: () => import('./pages/compras/compras.page').then(m => m.ComprasPage)
  },
  {
    path: 'reportes',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/reportes/reportes.page').then(m => m.ReportesPage)
  },
  {
    path: 'app-b',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/app-b/app-b.page').then(m => m.AppBPage)
  },

  // ── Protegidas por ROL ───────────────────────────────────────
  {
    path: 'gestion-usuarios',
    canActivate: [authGuard, roleGuard(['Superusuario', 'Dirección'])],
    loadComponent: () => import('./pages/admnistrador/gestion-usuarios/gestion-usuarios.page').then(m => m.GestionUsuariosPage)
  },
  {
    path: 'nuevo-usuario',
    canActivate: [authGuard, roleGuard(['Superusuario', 'Dirección'])],
    loadComponent: () => import('./pages/admnistrador/nuevo-usuario/nuevo-usuario.page').then(m => m.NuevoUsuarioPage)
  },

  // ── Errores ──────────────────────────────────────────────────
  {
    path: 'error-404',
    loadComponent: () => import('./pages/errors/error-404/error-404.page').then(m => m.Error404Page)
  },
  {
    path: 'error-500',
    loadComponent: () => import('./pages/errors/error-500/error-500.page').then(m => m.Error500Page)
  },
  {
    path: '**',
    redirectTo: 'error-404',
  },
];