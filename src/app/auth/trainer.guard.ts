import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from '@angular/router';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { NavService } from '../services/nav.service';
import { SubscriptionsService } from '../services/subscriptions.service';

@Injectable({
  providedIn: 'root',
})

export class TrainerGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private nav: NavService,
    private subscriptionsService: SubscriptionsService
  ) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.subscriptionsService.hasActive('trainer').pipe(
      map((isTrainer) => isTrainer),
      tap((isTrainer) => {
        if (!isTrainer) {
          this.nav.go('not-authorized');
        }
      })
    );
  }
}