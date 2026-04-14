import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Session {
  id: number;
  ip: string;
  user_agent: string;
  fechaInicio: string;
  ultimoUso: string;
  expira: string;
  activa: number;
  esActual?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SessionService {

  private apiUrl = 'http://localhost/gestion-clientes/src/api';

  constructor(private http: HttpClient) {}

  getSesiones(): Observable<Session[]> {
    return this.http.get<Session[]>(`${this.apiUrl}/auth/sessions.php`);
  }

  cerrarSesion(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/auth/sessions.php`, {
      params: new HttpParams().set('id', id)
    });
  }

  cerrarTodasLasSesiones(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/auth/sessions.php`);
  }
}