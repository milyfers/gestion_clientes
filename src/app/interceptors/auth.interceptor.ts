import { Injectable } from '@angular/core';
import {
  HttpRequest, HttpHandler, HttpEvent,
  HttpInterceptor, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  private refreshing = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getAccessToken();

    const authReq = token ? req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    }) : req;

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
            if (error.status === 403) {
        this.authService.logout();
        return throwError(() => error);
      }
        // Si el token expiró, intentar renovarlo
        if (error.status === 401 && !req.url.includes('login') && !req.url.includes('refresh') && !req.url.includes('pregunta_secreta')) {

          if (!this.refreshing) {
            this.refreshing = true;
            this.refreshSubject.next(null);

            return this.authService.refresh().pipe(
              switchMap((response: any) => {
                this.refreshing = false;
                this.refreshSubject.next(response.accessToken);

                return next.handle(req.clone({
                  setHeaders: { Authorization: `Bearer ${response.accessToken}` }
                }));
              }),
              catchError((err) => {
                this.refreshing = false;
                this.authService.logout();
                return throwError(() => err);
              })
            );
          }

          return this.refreshSubject.pipe(
            filter(token => token !== null),
            take(1),
            switchMap(token => next.handle(req.clone({
              setHeaders: { Authorization: `Bearer ${token}` }
            })))
          );
        }

        return throwError(() => error);
      })
    );
  }
}