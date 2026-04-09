import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ZippopotamResponse {
  'post code': string;
  country: string;
  places: {
    'place name': string;
    state: string;
    'state abbreviation': string;
  }[];
}

@Injectable({ providedIn: 'root' })
export class CpService {
  private apiUrl = 'https://api.zippopotam.us/mx';

  constructor(private http: HttpClient) {}

  buscarCP(cp: string): Observable<ZippopotamResponse> {
    return this.http.get<ZippopotamResponse>(`${this.apiUrl}/${cp}`);
  }
}

