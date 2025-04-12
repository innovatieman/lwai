import { EventEmitter, Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Auth, AuthProvider, getAuth, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, OAuthProvider, FacebookAuthProvider, sendEmailVerification, user, User } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import firebase from 'firebase/compat/app';
import { NavService } from '../services/nav.service';
import { ToastService } from '../services/toast.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FirestoreService } from '../services/firestore.service';
import { ModalService } from '../services/modal.service';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { environment } from 'src/environments/environment';
import { InfoService } from '../services/info.service';
import { TranslateService } from '@ngx-translate/core';
import { CountriesService } from '../services/countries.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  user$: Observable<firebase.User | null>;
  userRoles$: Observable<{ isAdmin: boolean, isConfirmed:boolean } | null>;
  customer:any = {}
  tutorials:any = {tutorials:{}}
  userInfo:any = {}
  conversations$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]); // Conversaties als Observable
  userInfo$: BehaviorSubject<any | null> = new BehaviorSubject<any | null>(null);
  courses$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]); // Cursussen als Observable
  subscriptions$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]); // Abonnementen als Observable
  private subscriptionsLoaded = new BehaviorSubject<boolean>(false);
  activeCourses: any[] = [];
  allCourses: any[] = [];
  profile:any = {}
  skills:any = {impact:{score:0,prevScore:0},flow:{score:0,prevScore:0},logic:{score:0,prevScore:0}}
  credits:any = {total:0}
  creditsChanged:EventEmitter<boolean> = new EventEmitter<boolean>();

  skillsLevels:any = [0,100,200,400,800]

  constructor(
    private nav: NavService,
    private toast: ToastService,
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private firestoreService: FirestoreService,
    private functions: AngularFireFunctions,
    private modalService: ModalService,
    private auth:Auth,
    private infoService:InfoService,
    private translate:TranslateService,
    private countries:CountriesService

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
      // console.log('user',user)
      if (user) {
        this.loadSubscriptions(user.uid);
        this.loadConversations(user.uid);
        // this.loadCourses(user.uid);
        // console.log('getting credits')
        this.getCredits(user.uid)
        this.getSkills(user.uid)
        this.getTutorials(user.uid)
        this.getCustomer(user.uid)
        this.getProfile(user.uid)
      } else {
        this.subscriptions$.next([]); // Leegmaken bij uitloggen
      }
    });
    
    this.getUserInfo()

    this.nav.changeLang.subscribe((lang) => {
      console.log(lang)
      if(this.userInfo.email && lang!=this.userInfo.language){
        this.functions.httpsCallable('editUserLang')({language:lang}).subscribe(response=>{
          console.log(response)
        })
      }
    })


  }

  async getCredits(uid:string){
    this.firestoreService.getSubDoc('users',uid,'credits','credits').subscribe((data:any)=>{
      if(data.payload.data()&&this.credits.total != data.payload.data().total){
        this.credits = data.payload.data()
        this.creditsChanged.emit(true)
      }
    })
  }

  async getSkills(uid:string){
    this.firestoreService.getSubDoc('users',uid,'skills','skills').subscribe((data:any)=>{
      this.skills = data.payload.data()
    })
  }

  async getTutorials(uid:string){
    this.firestoreService.getSubDoc('users',uid,'tutorials','tutorials').subscribe((data:any)=>{
      if(data.payload.data()){
        this.tutorials = data.payload.data()
      }
    })
  }

  async getProfile(uid:string){
    this.firestoreService.getSub('users',uid,'profile').subscribe((data:any)=>{
      data.map((profile:any) => {
        this.profile[profile.payload.doc.id] = profile.payload.doc.data()
      })
    })
  }

  async getCustomer(uid:string){
    this.firestoreService.getDoc('customers',uid).subscribe((data:any)=>{
      if(data?.payload?.data()){
        this.customer = data.payload.data()
      }
      else{
        this.customer = {}
      }
      // console.log(this.customer)
    })
  }

  skillsLevel(score:number){
    for(let i=4;i>=0;i--){
      if(score>=this.skillsLevels[i]){
        return i+1
      }
    }
    return 1
  }
  
  get userLevel(){
    return this.skillsLevel((this.skills.impact.score + this.skills.flow.score + this.skills.logic.score) / 3)
  }
  
  getUserLevelScorePercentage(score:number){
    let level = this.skillsLevel(score)
    let nextLevel = this.skillsLevels[level]
    let prevLevel = this.skillsLevels[level-1]
    return (score-prevLevel)/(nextLevel-prevLevel)*100

  }

  async refreshFirebaseUser(): Promise<firebase.User | null> {
    const auth = getAuth();
    const user = auth.currentUser;
  
    if (user) {
      await user.reload();
      this.getUserInfo();
      return null;
    }
  
    return null;
  }

  async getUserInfo() {
    this.user$.subscribe(user => {
      if (user) {
        this.firestore.doc(`users/${user.uid}`).valueChanges().subscribe((data: any) => {
          this.userInfo = data;
          if (this.userInfo) {
            this.userInfo.uid = user.uid;
            this.setStartCountry()
            this.userInfo$.next(this.userInfo); // Update de BehaviorSubject
          }
          if(this.userInfo?.filter){
            let countCheck = 0
            let checkFilter = setInterval(() => {
              countCheck++
              if(countCheck>30){
                clearInterval(checkFilter)
              }
              if(this.infoService.conversation_types.length){
                clearInterval(checkFilter)
                this.infoService.fillConversationTypes(this.userInfo.filter)
              }
            }, 500);
          }
        });

      }
    });
  }
  // Login met e-mail en wachtwoord
  // async login(email: string, password: string): Promise<void> {
  //   // this.logout()
  //   try {
  //     console.log(email,password)
  //     await this.afAuth.signInWithEmailAndPassword(email, password);
  //     this.nav.go('start');
  //   } catch (error) {
  //     console.error('Login error:', error);
  //     this.toast.show('Login mislukt');
  //     throw error;
  //   }
  // }

  async login(email: string, password: string): Promise<void> {
    this.toast.showLoader('Inloggen...')
    try {
      const userCredential = await this.afAuth.signInWithEmailAndPassword(email, password);
      await userCredential.user?.reload();
      this.toast.hideLoader();
      if (userCredential.user?.emailVerified) {
        if(this.nav.redirectUrl){
          this.nav.go(this.nav.redirectUrl)
          this.nav.redirectUrl = null
        }else{
          this.nav.go('start')
        }
        if(this.userInfo.language && this.userInfo.language!=this.translate.currentLang){
          this.nav.setLang(this.userInfo.language)
        }
      } else {
        // console.log('User is not verified');
        this.nav.go('wait-verify');
        this.nav.redirectUrl = null
      }
    } catch (error) {
      this.toast.hideLoader();
      console.error('Login error:', error);
      this.toast.show('Login mislukt');
      throw error;
    }
  }

  // async loginWithGoogle(): Promise<void> {
  //   try {
  //     const provider = new GoogleAuthProvider();
  //     await this.afAuth.signInWithPopup(provider);
  //     this.nav.go('start')
  //   } catch (error) {
  //     console.error('Google login failed:', error);
  //     this.toast.show('Login mislukt');
  //     throw error;
  //   }
  // }

  async signInWithProvider(provider: AuthProvider | OAuthProvider, providerName: string) {
    try {
      const useRedirect = providerName === 'apple';
      let userCredential;
  
      if (useRedirect) {
        await this.afAuth.signInWithRedirect(provider);
        return;
      } else {
        userCredential = await this.afAuth.signInWithPopup(provider);
      }
  
      const isNew = userCredential.additionalUserInfo?.isNewUser;
      const email = userCredential.user?.email;
  
      if (isNew) {
        await this.firestoreService.create('user_languages', {
          language: this.translate.currentLang,
          email: email
        });
        this.nav.go('start/welcome');
        this.nav.redirectUrl = null
      } else {
        if(this.nav.redirectUrl){
          this.nav.go(this.nav.redirectUrl)
          this.nav.redirectUrl = null
        }else{
          this.nav.go('start')
        }

      }
  
    } catch (error) {
      console.error(`${providerName} login mislukt:`, error);
      this.toast.show(`${providerName.charAt(0).toUpperCase() + providerName.slice(1)} login mislukt`);
    }
  }
  
  // 👇 Deze 3 functies koppel je aan je buttons
  signInWithGoogle() {
    this.signInWithProvider(new GoogleAuthProvider(), 'google');
  }
  
  signInWithFacebook() {
    this.signInWithProvider(new FacebookAuthProvider(), 'facebook');
  }
  
  signInWithApple() {
    this.signInWithProvider(new OAuthProvider('apple.com'), 'apple');
  }



  // async signInWithGoogle() {
  //   const provider = new GoogleAuthProvider();
  //   try {
  //     const userCredential = await this.afAuth.signInWithPopup(provider);
  //     const isNew = userCredential.additionalUserInfo?.isNewUser;
  //     const email = userCredential.user?.email;
  
  //     if (isNew) {
  //       console.log('Nieuwe gebruiker via Google:', email);
  //       await this.firestoreService.create('user_languages', {
  //         language: this.translate.currentLang,
  //         email: email
  //       });
  //       this.nav.go('start/welcome');
  //     } else {
  //       console.log('Bestaande gebruiker via Google:', email);
  //       this.nav.go('start');
  //     }
  
  //   } catch (error) {
  //     console.error('Google Login Mislukt:', error);
  //     this.toast.show('Google Login Mislukt');
  //   }
  // }

  async loginWithApple(): Promise<void> {
    try {
      const provider = new OAuthProvider('apple.com');
      // await this.afAuth.signInWithPopup(provider);
      await this.afAuth.signInWithRedirect(provider);
      this.nav.go('start')
    } catch (error) {
      console.error('Apple login failed:', error);
      this.toast.show('Login mislukt');
      throw error;
    }
  }

  async loginWithFacebook(): Promise<void> {
    try {
      const provider = new FacebookAuthProvider();
      await this.afAuth.signInWithPopup(provider);
      this.nav.go('start')
    } catch (error) {
      console.error('Facebook login failed:', error);
      this.toast.show('Login mislukt');
      throw error;
    }
  }

  reloadCredentials(){
    this.afAuth.currentUser.then((user) => {
      user?.reload()
    })
  }


  // Registreer een nieuwe gebruiker
  async register(email: string, password: string): Promise<void> {
    try {
      this.toast.showLoader('Registreren...');
      email = email.toLowerCase();
      await this.afAuth.createUserWithEmailAndPassword(email, password);
      console.log('registered')
      // this.modalService.showText('Je ontvangt een e-mail om je account te verifiëren.','Registratie gelukt');
      setTimeout(() => {
        this.firestoreService.create('user_languages',{language:this.translate.currentLang,email:email})
      }, 2000);
      // this.functions.httpsCallable('editUserLang')({language:this.translate.currentLang})
      console.log('Register success');
      this.toast.hideLoader();
      this.toast.showLoader('Gegevens laden voor de eerste keer');
      setTimeout(() => {
        this.toast.hideLoader();
        this.nav.go('wait-verify'); 
      }, 3000);
      } catch (error:any) {
        this.toast.hideLoader();
        console.error('Register error:', error);
        if(error.toString().includes('email-already-in-use')){
          this.login(email,password)
        }
        else{
          this.toast.show('Registratie mislukt');
          throw error;
        }
      }
  }

  resendEmailVerification(callback?:Function){
    // this.toast.showLoader()
    console.log({email:this.userInfo.email,displayName:this.userInfo.displayName})
    this.functions.httpsCallable('reSendVerificationEmail')({email:this.userInfo.email,displayName:this.userInfo.displayName}).subscribe((response:any)=>{
      this.toast.hideLoader()
      if(callback){
        callback(response)
      }
      else{
        if(response.status==200){
          this.toast.show('Email verstuurd')
        }
        else{
          this.toast.show('Er is iets misgegaan')
        }
      }
    })
  }

  // async registerWithGoogle() {
  //   const provider = new GoogleAuthProvider();
  //   try {
  //     const userCredential = await this.afAuth.signInWithPopup(provider);
  //     console.log('Google Login Succes:', userCredential.user);
  //     this.firestoreService.create('user_languages',{language:this.translate.currentLang,email:userCredential.user?.email})
  //     this.nav.go('start/welcome')
  //   } catch (error) {
  //     console.error('Google Login Mislukt:', error);
  //     this.toast.show('Google Login Mislukt');
  //   }
  // }

  // async registerWithApple() {
  //   const provider = new OAuthProvider('apple.com');
  //   try {
  //     const userCredential = await this.afAuth.signInWithPopup(provider);
  //     console.log('Apple Login Succes:', userCredential.user);
  //     this.firestoreService.create('user_languages',{language:this.translate.currentLang,email:userCredential.user?.email})
  //     this.nav.go('start/welcome')
  //   } catch (error) {
  //     console.error('Apple Login Mislukt:', error);
  //     this.toast.show('Apple Login Mislukt');
  //   }
  // }

  // async registerWithFacebook() {
  //   const provider = new FacebookAuthProvider();
  //   try {
  //     const userCredential = await this.afAuth.signInWithPopup(provider);
  //     console.log('Facebook Login Succes:', userCredential.user);
  //     this.firestoreService.create('user_languages',{language:this.translate.currentLang,email:userCredential.user?.email})
  //     this.nav.go('start/welcome')
  //   } catch (error) {
  //     console.error('Facebook Login Mislukt:', error);
  //     this.toast.show('Facebook Login Mislukt');
  //   }
  // }


  // Uitloggen
  async logout(): Promise<void> {
    try {
      await this.afAuth.signOut();
      this.userInfo = {}
      this.nav.go('/login');
      setTimeout(() => {
        window.location.reload();
      }, 100);
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
  // isAuthenticated(): Observable<boolean> {
  //   return this.user$.pipe(
  //     map((user) => !!user) // Retourneer true als een gebruiker is ingelogd
  //   );
  // }

  isAuthenticated(): Observable<User | null> {
    return user(this.auth); // Haalt de huidige gebruiker op uit Firebase
  }

  isVerified(): Observable<boolean> {
    return this.user$.pipe(
      map((user) => user?.emailVerified ?? false) // Retourneer true als de gebruiker geverifieerd is
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

  private loadCourses(userId: string) {
    this.firestore
      .collection(`users/${userId}/courses`)
      .valueChanges({ idField: 'courseId' }) // Voeg het ID toe aan elk document
      .subscribe((courses) => {
        this.courses$.next(courses); // Update de BehaviorSubject
      });
  }

  getConversations(): Observable<any[]> {
    return this.conversations$.asObservable();
  }

  getCourses(): Observable<any[]> {
    return this.courses$.asObservable();
  }


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
  
    getAllMyCourses(userId: string){
      this.allCourses = [];
      this.firestoreService.getSub('users', userId, 'courses').subscribe((courses) => {
        this.allCourses = courses.map((course: any) => {
          return { id: course.payload.doc.id, ...course.payload.doc.data() }
        })
      });
    }

    getActiveCourses(userId: string) {
      this.activeCourses = [];
      this.firestoreService.querySub('users', userId, 'courses','status','active').subscribe((courses) => {
        this.activeCourses = courses.map((course: any) => {
          return { id: course.payload.doc.id, ...course.payload.doc.data() }
        })
      // Haal de activeCourseIds direct op uit this.userInfo
      // const courseObservables = this.userInfo.activeCourseIds.map((courseId:string) =>
      //   this.firestoreService.getSubDoc('users', userId, 'courses', courseId)
      // );
    
      // Combineer alle observables
      // combineLatest(courseObservables).subscribe((courses:any) => {
      //   const uniqueCourses = new Map(); // Gebruik Map om duplicaten te vermijden
    
      //   courses.forEach((course: any) => {
      //     let item: any = course.payload.data();
      //     if(item){
      //       item.id = course.payload.id;
      //       if (item.status === 'active' && !uniqueCourses.has(item.id)) {
      //         uniqueCourses.set(item.id, item);
      //       }
      //     }
      //   });
    
      //   // Converteer de unieke waarden naar een array
      //   this.activeCourses = Array.from(uniqueCourses.values());
      // });
      });
    }


    // getActiveCourses(userId: string) {
    //   this.activeCourses = [];
    
    //   this.subscriptions$.pipe(
    //     map((subscriptions) =>
    //       subscriptions
    //         .filter((sub) => sub.status === 'active' && sub.type === 'student')
    //         .map((sub) => sub.courseIds)
    //     ),
    //     map((courseIds) => courseIds.flat()), // Alle courseIds vlak maken
    //     map((courseIds) => 
    //       courseIds.map((courseId) => 
    //         this.firestoreService.getSubDoc('users', userId, 'courses', courseId)
    //       )
    //     ),
    //     switchMap((courseObservables) => combineLatest(courseObservables)) // Combineer live updates
    //   ).subscribe((courses) => {
    //     const uniqueCourses = new Map(); // Gebruik Map om duplicaten te vermijden
    
    //     courses.forEach((course: any) => {
    //       let item: any = course.payload.data();
    //       item.id = course.payload.id;
    
    //       if (item.status === 'active' && !uniqueCourses.has(item.id)) {
    //         uniqueCourses.set(item.id, item);
    //       }
    //     });
    
    //     // Converteer de unieke waarden naar een array
    //     this.activeCourses = Array.from(uniqueCourses.values());
    //   });
    // }
  
    getActiveCourse(courseId:string){
      return this.allCourses.find((course) => course.id === courseId)
      // return this.activeCourses.find((course) => course.id === courseId)
    }
  
    publicCourses: any[] = [];
    getPublicCourses(){
      return this.firestoreService.queryDouble('active_courses','public',true,'==','status','active','==').subscribe((courses) => {
        this.publicCourses = courses.map((course:any) => {
          return { id: course.payload.doc.id, ...course.payload.doc.data() }
        })
        let checkInt = setInterval(() => {
          if(this.infoService.conversation_types.length){
            clearInterval(checkInt)
            for(let i = 0; i < this.publicCourses.length; i++){
              this.publicCourses[i].conversationTypes = this.infoService.getConversationType('',this.publicCourses[i].types,true)
            }
          }
        }, 200);
        // console.log(this.publicCourses)
      })
    }
  
    getPublicCourse(courseId:string){
      return this.publicCourses.find((course) => course.id === courseId)
    }

    settingCountry:boolean = false
    countrySet:boolean = false
    async setStartCountry(){
      if(this.settingCountry || this.countrySet){
        return
      }
      this.settingCountry = true
      setTimeout(async () => {
        if(!this.userInfo.country||!this.userInfo.currency){
            const response = await fetch("https://getiplocation-p2qcpa6ahq-ew.a.run.app", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({}),
            });
            const data = await response.json();
            console.log(data)
            if(data){
              this.countrySet = true
              let country = data.country_code
              let currency = this.countries.availableCurrency(data.currency?.code)
              this.functions.httpsCallable('editUserCountry')({country:country}).subscribe((response:any)=>{})
              this.functions.httpsCallable('editUserCurrency')({currency:currency}).subscribe((response:any)=>{})
            }
            this.settingCountry = false
        }
      }, 2000);
    }

}