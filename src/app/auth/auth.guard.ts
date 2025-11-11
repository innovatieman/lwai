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
import { NavService } from '../services/nav.service';


@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router,
    private nav: NavService
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
          console.log('Checking for stream case in localStorage...', localStorage.getItem('streamCase'));
          if(localStorage.getItem('streamCase')){
            this.nav.go('stream-case/finished');
            return;
          }

          let path = state.url;
          console.log(`Access denied to ${path}. Redirecting to login.`);
          this.nav.redirectUrl = path; // Sla de huidige URL op voor later gebruik
          this.router.navigate(['/login']);
        }
      })
    );
  }
}