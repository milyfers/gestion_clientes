import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface Usuario {
  id:            number;
  nombre:        string;
  email:         string;
  role:          number;  // FK int → roles.id
  roleNombre:    string;  // nombre del rol (viene del JOIN)
  es_sistema:    boolean; // true = Superusuario, no editable
  status:        'Activo' | 'Inactivo';
  fechaRegistro?: string;
  ultimoAcceso?:  string;
}

export interface Rol {
  id:          number;
  nombre:      string;
  es_sistema:  boolean;
  descripcion: string;
}

export interface CrearUsuarioDTO {
  nombre:   string;
  email:    string;
  password: string;
  role:     number;
}

export interface ActualizarUsuarioDTO {
  id:        number;
  nombre:    string;
  email:     string;
  role:      number;
  status:    'Activo' | 'Inactivo';
  password?: string;
}

// ── Servicio ──────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  private apiUrl = 'http://localhost/gestion-clientes/src/api';

  constructor(private http: HttpClient) {}

  // ── LISTAR / BUSCAR ───────────────────────────────────────
  getUsuarios(query: string = ''): Observable<Usuario[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<Usuario[]>(`${this.apiUrl}/usuarios.php`, { params });
  }

  // ── OBTENER UNO ───────────────────────────────────────────
  getUsuarioPorId(id: number): Observable<Usuario> {
    const params = new HttpParams().set('id', id);
    return this.http.get<Usuario>(`${this.apiUrl}/usuarios.php`, { params });
  }

  // ── CATÁLOGO DE ROLES ─────────────────────────────────────
  getRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${this.apiUrl}/roles.php`);
  }

  // ── CREAR ─────────────────────────────────────────────────
  crearUsuario(data: CrearUsuarioDTO): Observable<{ message: string; id: number }> {
    return this.http.post<{ message: string; id: number }>(
      `${this.apiUrl}/usuarios.php`, data
    );
  }

  // ── ACTUALIZAR ────────────────────────────────────────────
  actualizarUsuario(data: ActualizarUsuarioDTO): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.apiUrl}/usuarios.php`, data
    );
  }

  // ── ELIMINAR ──────────────────────────────────────────────
  eliminarUsuario(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/usuarios.php`, {
      params: new HttpParams().set('id', id)
    });
  }

  cambiarStatusUsuario(id: number, status: string): Observable<any> {
  const token = localStorage.getItem('accessToken');
  return this.http.post(
    `${this.apiUrl}/cambiar_status.php`,
    { id, status },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}
}