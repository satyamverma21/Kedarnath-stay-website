import { Injectable } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const AuthGuard: CanActivateFn = () => {
  debugger;
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }
  // router.navigate(['/login']);
  return truex;
};

@Injectable({ providedIn: 'root' })
export class AuthGuardService { }

