import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
export interface User {
  id: number;
  nombre: string;
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = environment.apiUrl;

  // ✅ Estado reactivo del usuario — se propaga a toda la app al instante
  private usuarioSubject = new BehaviorSubject<User | null>(this.cargarUsuarioLocal());
  public usuario$ = this.usuarioSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  // ── Carga inicial desde localStorage (para sobrevivir F5) ──
  private cargarUsuarioLocal(): User | null {
    const raw = localStorage.getItem('user');
    try { return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login.php`, { email, password });
    // ⚠️ No guardes nada aquí — el login solo inicia MFA, aún no hay token
  }

  verificarMFA(usuarioId: number, codigo: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/mfa/mfa_verificar.php`, { usuarioId, codigo }).pipe(
      tap((response: any) => {
        localStorage.setItem('accessToken',  response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('user',         JSON.stringify(response.user));
        localStorage.setItem('token',        response.accessToken);

        // ✅ Notifica a toda la app que hay un nuevo usuario
        this.usuarioSubject.next(response.user);
      })
    );
  }

  refresh(): Observable<any> {
    const refreshToken = localStorage.getItem('refreshToken');
    return this.http.post(`${this.apiUrl}/refresh.php`, { refreshToken }).pipe(
      tap((response: any) => {
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('token',       response.accessToken);
      })
    );
  }

  logout(): void {
    // 1. Limpiar localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('userRol');

    // 2. ✅ Limpiar el estado en memoria — esto es lo que faltaba
    this.usuarioSubject.next(null);

    // 3. Redirigir al login
    this.router.navigate(['/home'], { replaceUrl: true });
  }

  // ── Helpers ───────────────────────────────────────────────
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getUsuario(): User | null {
    return this.usuarioSubject.getValue();
  }

  isLoggedIn(): boolean {
  const token = this.getAccessToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

  getRolDesdeToken(): string | null {
  const token = this.getAccessToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.role ?? null;
  } catch {
    return null;
  }
}
}