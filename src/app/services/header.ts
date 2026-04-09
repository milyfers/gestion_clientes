import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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

@Injectable({
  providedIn: 'root'
})
export class HeaderService {
  private mostrarSubject = new BehaviorSubject<boolean>(false);
  private menuItemsSubject = new BehaviorSubject<MenuItem[]>([]);

  mostrar$ = this.mostrarSubject.asObservable();
  menuItems$ = this.menuItemsSubject.asObservable();

  constructor() {
    this.restaurarSesion(); // ← Restaurar al iniciar
  }

  // ── Restaurar desde localStorage al recargar ──────────────────────
  private restaurarSesion() {
  const rol = localStorage.getItem('userRol');
  const user = localStorage.getItem('user');
  
  if (rol && user && user !== 'undefined') {
    this.configurarMenuPorRol(rol);
    this.mostrarSubject.next(true);
  }
}

  mostrarHeader() {
    this.mostrarSubject.next(true);
  }

  ocultarHeader() {
    this.mostrarSubject.next(false);
  }

  guardarSesion(user: any, token: string) {
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('token', token ?? ''); 
  localStorage.setItem('userRol', user.role);

  this.configurarMenuPorRol(user.role);
  this.mostrarHeader();
}

  configurarMenuPorRol(rol: string) {
  localStorage.setItem('userRol', rol);

  let items: MenuItem[] = [];

  const menuCompleto: MenuItem[] = [
    { title: 'Dashboard', url: '/dashboard', active: false },
    {
      title: 'Clientes',
      url: '/clients',
      active: false,
      submenu: [{ title: 'Nuevo Cliente', url: '/clients/new-client' }]
    },
    {
      title: 'Proyectos',
      url: '/projects',
      active: false,
      submenu: [{ title: 'Nuevo Proyecto', url: '/projects/new-project' }]
    },
    {
      title: 'Compras',
      url: '/compras',
      active: false,
      submenu: [{ title: 'Nueva Orden', url: '/compras/new-order' }]
    },
    { title: 'Reportes', url: '/reportes', active: false },
    {
      title: 'Herramientas',
      url: '/gestion-usuarios',
      active: false,
      submenu: [
        { title: 'Gestión de Usuarios', url: '/gestion-usuarios' },
        { title: 'Nuevo Usuario', url: '/nuevo-usuario' }
      ]
    }
  ];

  const menuSinHerramientas: MenuItem[] = menuCompleto.filter(
    item => item.title !== 'Herramientas'
  );

  const menuBasico: MenuItem[] = menuCompleto.filter(
    item => item.title !== 'Herramientas' && item.title !== 'Compras'
  );

  if (rol === 'Superusuario') {
    items = menuCompleto; // Todo + Herramientas
  } else if (rol === 'Dirección') {
    items = menuCompleto; // Todo + Herramientas
  } else if (rol === 'Administración') {
    items = menuSinHerramientas; // Todo + Herramientas
  } else if (rol === 'Supervisión') {
    items = menuSinHerramientas; // Sin Herramientas
  } else if (rol === 'Ingeniería') {
    items = menuSinHerramientas; // Sin Herramientas
  } else if (rol === 'Vendedor') {
    items = menuBasico; // Sin Herramientas
  } else {
    items = [{ title: 'Dashboard', url: '/dashboard', active: false }];
  }

  this.menuItemsSubject.next(items);
}

  resetearMenu() {
    localStorage.removeItem('userRol'); 
    this.menuItemsSubject.next([]);
    this.ocultarHeader();
  }
}