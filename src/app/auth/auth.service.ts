import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Auth, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, OAuthProvider } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import firebase from 'firebase/compat/app';
import { NavService } from '../services/nav.service';
import { ToastService } from '../services/toast.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { SubscriptionsService } from '../services/subscriptions.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  user$: Observable<firebase.User | null>;
  userRoles$: Observable<{ isAdmin: boolean, isConfirmed:boolean } | null>;
  userInfo:any = {}
  conversations$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]); // Conversaties als Observable
  userInfo$: BehaviorSubject<any | null> = new BehaviorSubject<any | null>(null);

  constructor(
    private nav: NavService,
    private toast: ToastService,
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private subscriptionsService: SubscriptionsService
  ) {
    this.user$ = this.afAuth.authState;
    this.userRoles$ = this.user$.pipe(
      switchMap((user) => {
        if (!user) return of(null);
        return this.firestore
          .doc<{ isAdmin: boolean; isConfirmed: boolean }>(`users/${user.uid}`) // Verwerk beide velden
          .valueChanges()
          .pipe(
            map((roles) => {
              return {
                isAdmin: roles?.isAdmin ?? false,
                isConfirmed: roles?.isConfirmed ?? false,
              };
            })
          );
      })
    );
    this.user$.subscribe((user) => {
      if (user) {
        this.subscriptionsService.loadSubscriptions(user.uid);
        this.loadConversations(user.uid);
      } else {
        this.subscriptionsService.subscriptions$.next([]); // Leegmaken bij uitloggen
      }
    });
    
    this.getUserInfo()

  }

  // async getUserInfo(){
  //   this.user$.subscribe(user => {
  //     if(user){
  //       this.firestore.doc(`users/${user.uid}`).valueChanges().subscribe((data:any) => {
  //         this.userInfo = data
  //         if(this.userInfo){
  //           this.userInfo.uid = user.uid
  //         }
  //         // console.log(this.userInfo)
  //       })
  //     }
  //   })
  // }

  async getUserInfo() {
    this.user$.subscribe(user => {
      if (user) {
        this.firestore.doc(`users/${user.uid}`).valueChanges().subscribe((data: any) => {
          this.userInfo = data;
          if (this.userInfo) {
            this.userInfo.uid = user.uid;
          }
          this.userInfo$.next(this.userInfo); // Update de BehaviorSubject
        });
      }
    });
  }
  // Login met e-mail en wachtwoord
  async login(email: string, password: string): Promise<void> {
    try {
      await this.afAuth.signInWithEmailAndPassword(email, password);
      this.nav.go('start');
    } catch (error) {
      console.error('Login error:', error);
      this.toast.show('Login mislukt');
      throw error;
    }
  }

  async loginWithGoogle(): Promise<void> {
    try {
      const provider = new GoogleAuthProvider();
      await this.afAuth.signInWithPopup(provider);
      this.nav.go('start')
    } catch (error) {
      console.error('Google login failed:', error);
      this.toast.show('Login mislukt');
      throw error;
    }
  }

  async loginWithApple(): Promise<void> {
    try {
      const provider = new OAuthProvider('apple.com');
      await this.afAuth.signInWithPopup(provider);
      this.nav.go('start')
    } catch (error) {
      console.error('Apple login failed:', error);
      this.toast.show('Login mislukt');
      throw error;
    }
  }

  // Registreer een nieuwe gebruiker
  async register(email: string, password: string): Promise<void> {
    try {
      email = email.toLowerCase();
      password = 'ProbeerAlicia1'
      await this.afAuth.createUserWithEmailAndPassword(email, password);
      this.nav.go('start')
      } catch (error) {
        console.error('Register error:', error);
        this.toast.show('Registratie mislukt');
        throw error;
      }
  }

  async registerWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await this.afAuth.signInWithPopup(provider);
      console.log('Google Login Succes:', userCredential.user);
      this.nav.go('start')
    } catch (error) {
      console.error('Google Login Mislukt:', error);
      this.toast.show('Google Login Mislukt');
    }
  }

  async registerWithApple() {
    const provider = new OAuthProvider('apple.com');
    try {
      const userCredential = await this.afAuth.signInWithPopup(provider);
      console.log('Apple Login Succes:', userCredential.user);
      this.nav.go('start')
    } catch (error) {
      console.error('Apple Login Mislukt:', error);
      this.toast.show('Apple Login Mislukt');
    }
  }
  // Uitloggen
  async logout(): Promise<void> {
    try {
      await this.afAuth.signOut();
      this.userInfo = {}
      this.nav.go('/login');
    } catch (error) {
      console.error('Logout error:', error);
      this.toast.show('Uitloggen mislukt');
    }
  }

  async sendPasswordReset(email: string): Promise<void> {
    try {
      await this.afAuth.sendPasswordResetEmail(email)
      this.toast.show('If your email is registered, you will receive a password reset email.');
    } catch (error: any) {
      console.error('Password reset error:', error);
      this.toast.show(error.message);
    }
  }


  // Controleer of een gebruiker geauthenticeerd is
  isAuthenticated(): Observable<boolean> {
    return this.user$.pipe(
      map((user) => !!user) // Retourneer true als een gebruiker is ingelogd
    );
  }


  // Controleer of een gebruiker admin is
  isAdmin(): Observable<boolean> {
    return this.userRoles$.pipe(
      map((roles) => roles?.isAdmin ?? false) // Retourneer true als de gebruiker admin is
    );
  }

  isConfirmed(): Observable<boolean> {
    return this.userRoles$.pipe(
      map((roles) => roles?.isConfirmed ?? false) // Retourneer true als de gebruiker confirmed is
    );
  }

  // Maak een gebruiker admin
  async makeAdmin(uid: string): Promise<void> {
    await this.firestore.doc(`users/${uid}`).update({ isAdmin: true });
  }

  // Verwijder admin-rechten van een gebruiker
  async removeAdmin(uid: string): Promise<void> {
    await this.firestore.doc(`users/${uid}`).update({ isAdmin: false });
  }  

  private loadConversations(userId: string) {
    this.firestore
      .collection(`users/${userId}/conversations`)
      .valueChanges({ idField: 'conversationId' }) // Voeg het ID toe aan elk document
      .subscribe((conversations) => {
        this.conversations$.next(conversations); // Update de BehaviorSubject
      });
  }

  getConversations(): Observable<any[]> {
    return this.conversations$.asObservable();
  }
}