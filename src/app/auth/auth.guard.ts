import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from '@angular/router';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import { Auth, User } from '@angular/fire/auth';

// @Injectable({
//   providedIn: 'root',
// })
// export class AuthGuard implements CanActivate {
//   constructor(private authService: AuthService, private router: Router) {}

//   canActivate(
//     next: ActivatedRouteSnapshot,
//     state: RouterStateSnapshot
//   ): Observable<boolean> {
//     return this.authService.isAuthenticated().pipe(
//       take(1),
//       map((isAuthenticated) => !!isAuthenticated),
//       tap((isAuthenticated) => {
//         if (!isAuthenticated) {
//           this.router.navigate(['/login']); // Redirect naar loginpagina
//         }
//       })
//     );
//   }
// }


@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
    // private auth: Auth
  ) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.isAuthenticated().pipe(
      take(1),
      map((user: User | null) => {
        if (!user) {
          return false; // Niet ingelogd
        }

        if (user.emailVerified) {
          return true; // Geverifieerd
        } else {
          this.router.navigate(['/wait-verify']); // Niet geverifieerd, redirect naar verificatiepagina
          return false;
        }
      }),
      tap((isAuthenticated) => {
        if (!isAuthenticated) {
          this.router.navigate(['/login']);
        }
      })
    );
  }
}