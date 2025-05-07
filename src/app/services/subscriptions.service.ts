import { Injectable } from '@angular/core';
// import { AngularFireAuth } from '@angular/fire/compat/auth';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
// import firebase from 'firebase/compat/app';
// import { NavService } from '../services/nav.service';
// import { ToastService } from '../services/toast.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ModalService } from './modal.service';
import { FirestoreService } from './firestore.service';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionsService {
  subscriptions$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]); // Abonnementen als Observable
  private subscriptionsLoaded = new BehaviorSubject<boolean>(false);
  activeCourses: any[] = [];

  constructor(
    // private nav: NavService,
    // private toast: ToastService,
    // private afAuth: AngularFireAuth,
    private firestoreService: FirestoreService,
    private functions: AngularFireFunctions,
    private modalService: ModalService,
    private firestore: AngularFirestore,
    private auth: AuthService
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

  getActiveCourses(userId: string) {
    this.activeCourses = [];
  
    this.subscriptions$.pipe(
      map((subscriptions) =>
        subscriptions
          .filter((sub) => sub.status === 'active' && sub.type === 'student')
          .map((sub) => sub.courseIds)
      ),
      map((courseIds) => courseIds.flat()), // Alle courseIds vlak maken
      map((courseIds) => 
        courseIds.map((courseId) => 
          this.firestoreService.getSubDoc('users', userId, 'courses', courseId)
        )
      ),
      switchMap((courseObservables) => combineLatest(courseObservables)) // Combineer live updates
    ).subscribe((courses) => {
      const uniqueCourses = new Map(); // Gebruik Map om duplicaten te vermijden
  
      courses.forEach((course: any) => {
        let item: any = course.payload.data();
        item.id = course.payload.id;
  
        if (item.status === 'active' && !uniqueCourses.has(item.id)) {
          uniqueCourses.set(item.id, item);
        }
      });
  
      // Converteer de unieke waarden naar een array
      this.activeCourses = Array.from(uniqueCourses.values());
    });
  }

  getActiveCourse(courseId:string){
    return this.activeCourses.find((course) => course.id === courseId)
  }

  publicCourses: any[] = [];
  // getPublicCourses(){
  //   return this.firestoreService.query('active_courses','public',true).subscribe((courses) => {
  //     this.publicCourses = courses.map((course:any) => {
  //       return { id: course.payload.doc.id, ...course.payload.doc.data() }
  //     })
  //     console.log(this.publicCourses)
  //   })
  // }

  getPublicCourse(courseId:string){
    return this.publicCourses.find((course) => course.id === courseId)
  }
}
