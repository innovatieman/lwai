import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from '@angular/router';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { filter, map, switchMap, tap } from 'rxjs/operators';
import { NavService } from '../services/nav.service';

@Injectable({
  providedIn: 'root',
})

export class TrainerGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private nav: NavService,
  ) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.auth.areSubscriptionsLoaded().pipe(
      tap((loaded) => {
        if (!loaded) {
          // console.log('Wachten op geladen subscriptions...');
        }
      }),
      filter((loaded) => loaded), // Ga pas verder als subscriptions geladen zijn
      switchMap(() => this.auth.hasActive('trainer')),
      tap((isTrainer) => {
        if (!isTrainer) {
          this.nav.go('not-authorized');
        }
      })
    );
  }
}