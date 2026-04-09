import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (rolesPermitidos: string[]): CanActivateFn => () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  const usuario = auth.getUsuario();
  if (!usuario) {
    router.navigate(['/home'], { replaceUrl: true });
    return false;
  }

  const rolReal = auth.getRolDesdeToken();
  if (rolReal && rolesPermitidos.includes(rolReal)) return true;

  router.navigate(['/error-404']);
  return false;
};