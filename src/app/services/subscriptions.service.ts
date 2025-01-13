import { Injectable } from '@angular/core';
// import { AngularFireAuth } from '@angular/fire/compat/auth';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
// import firebase from 'firebase/compat/app';
// import { NavService } from '../services/nav.service';
// import { ToastService } from '../services/toast.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ModalService } from './modal.service';
import { FirestoreService } from './firestore.service';
import { AngularFireFunctions } from '@angular/fire/compat/functions';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionsService {
  subscriptions$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]); // Abonnementen als Observable
  private subscriptionsLoaded = new BehaviorSubject<boolean>(false);

  constructor(
    // private nav: NavService,
    // private toast: ToastService,
    // private afAuth: AngularFireAuth,
    private functions: AngularFireFunctions,
    private firestoreService: FirestoreService,
    private modalService: ModalService,
    private firestore: AngularFirestore
  ) { }

  public loadSubscriptions(userId: string) {
    // quesry subscriptions where status is active
    this.firestore
      .collection(`users/${userId}/subscriptions`, ref => ref.where('status', '==', 'active'))
      .valueChanges({ idField: 'id' }) // Voeg het ID toe aan elk document
      .subscribe((subscriptions) => {
        this.subscriptions$.next(subscriptions); // Update de BehaviorSubject
        this.subscriptionsLoaded.next(true);
      });
  }

  areSubscriptionsLoaded(): Observable<boolean> {
    return this.subscriptionsLoaded.asObservable();
  }
  // Geef een Observable terug van de abonnementen
  getSubscriptions(): Observable<any[]> {
    return this.subscriptions$.asObservable();
  }

  // Controleer of er een actief abonnement is
  hasActiveSubscription(): Observable<boolean> {
    return this.subscriptions$.pipe(
      map((subscriptions) =>
        subscriptions.some((sub:any) => {
          sub.status === 'active'
      })
      )
    );
  }

  hasActive(type:string): Observable<boolean> {
    return this.subscriptions$.pipe(
      map((subscriptions) =>
        subscriptions.some((sub) => sub.status === 'active' && sub.type === type)
      )
    );
  }

  async upgradeSubscription(type:string,paymentMethod:string,callback:Function){
    await this.modalService.showConfirmation('Are you sure you want to upgrade your subscription?').then(async (result) => {
      if(result){
        await this.functions.httpsCallable('addSubscription')({type:type,days:30,paymentMethod:paymentMethod}).subscribe(async (data:any) => {
          callback(data)
        })
      }
    })
  }


}
