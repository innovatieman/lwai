import { EventEmitter, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { FirestoreService } from './firestore.service';
import { AuthService } from '../auth/auth.service';
import { InfoService } from './info.service';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { combineLatest, map, switchMap, defaultIfEmpty, of, catchError, tap, Observable, take, forkJoin, concatMap, from, toArray } from 'rxjs';
import { BehaviorSubject, filter, firstValueFrom, timeout, TimeoutError } from 'rxjs';
import { ModalService } from './modal.service';
import { id } from '@swimlane/ngx-datatable';
import { NavService } from './nav.service';
import { color } from 'highcharts';
import { ToastService } from './toast.service';
import { AccountService } from './account.service';
import { HelpersService } from './helpers.service';
import { SortByPipe } from '../pipes/sort-by.pipe';

@Injectable({
  providedIn: 'root'
})
export class TrainerService {
  [x:string]: any;
  cases$ = new BehaviorSubject<any[]>([]); // voeg toe
  infoItems$ = new BehaviorSubject<any[]>([]); // voeg toe
  modules$ = new BehaviorSubject<any[]>([]); // voeg toe
  trainings$ = new BehaviorSubject<any[]>([]); // voeg toe
  subscriptions:any ={}
  cases: any[] = []
  isTrainer: boolean = false
  isTrainerPro: boolean = false
  casesLoaded: boolean = false
  modules: any[] = []
  trainings: any[] = []
  knowledgeItems: any[] = []
  knowledgeItem: any = {}
  caseItem: any = {}
  moduleItem: any = {}
  trainerInfo: any = {}
  infoItems: any[] = [] 
  infoItem: any = {}
  trainingItem: any = {}
  breadCrumbs:any[] = []
  headModule:any = {}
  originEdit:string = ''
  affiliates:any[] = []
  affiliateLoaded:boolean = false
  publishType: string = 'training';
  isOrgAdmin: boolean = false;
  segments:any[] = []
  segmentsOrganized:any = []
  voices:any[] = []
  isAdmin: boolean = false;
  trainingSubItems:any = {};
  selectedModuleCases:string = ''
  selectedModuleInfoItems:string = ''

  creditsPackagesPricing:any = {
    0:0,
    600: Math.round((2/1.21) * 100) / 100, // 600 credits for 2 euro excl. 21% btw
    1800: Math.round((5/1.21) * 100) / 100, // 1800 credits for 5 euro excl. 21% btw
    4000: Math.round((10/1.21) * 100) / 100, // 4000 credits for 10 euro excl. 21% btw
    1000000: Math.round((25/1.21) * 100) / 100, // 1000000 credits for 25 euro excl. 21% btw
  }

  private pendingSpecificCallbacks: {
    [key: string]: Function[]
    } = {
      cases: [],
      modules: [],
      infoItems: [],
      trainings: [],
      example: [],
    };
  // trainerInfoLoaded:EventEmitter<boolean> = new EventEmitter<boolean>();
  private currentOrgId?: string;
  private listenersStarted = false;
  public trainerInfoLoaded$ = new BehaviorSubject<boolean>(false);
  
  constructor(
    private functions: AngularFireFunctions,
    private fire: AngularFirestore,
    private auth: AuthService,
    private firestore: FirestoreService,
    private translate: TranslateService,
    private infoService: InfoService,
    private modalService: ModalService,
    private nav:NavService,
    private toast:ToastService,
    private accountService:AccountService,
    private helper:HelpersService,
    private sortByPipe:SortByPipe,
  ) { 
    this.auth.userInfo$.subscribe(userInfo => {
      if (userInfo) {
        this.isTrainer = userInfo.isTrainer;
        this.auth.hasActive('trainer').subscribe((trainer)=>{
          this.loadVoices();
          this.loadTrainerInfo(()=>{
            this.trainerInfoLoaded$.next(true);
          });
          this.isTrainer = trainer
        })
        
      }
    })

    auth.isOrgAdmin().subscribe((isAdmin)=>{
      this.isOrgAdmin = isAdmin
      if(isAdmin && this.nav.activeOrganisationId){
        this.loadTrainerInfo(()=>{
          this.trainerInfoLoaded$.next(true);
        },true)
      }
    })

    this.auth.isAdmin().subscribe((admin) => {
      this.isAdmin = admin;
    });

    this.nav.organisationChange.subscribe((res)=>{     
      this.selectedModuleCases = ''
      this.selectedModuleInfoItems = '' 
      this.trainingItem = {}
      this.moduleItem = {}
      this.caseItem = {}
      this.infoItem = {}
      this.breadCrumbs = []
      this.affiliateLoaded = false
      this.loadTrainerInfo(()=>{
        if(this.trainerInfo.affiliate){
          this.getAffiliates();
        }
        this.trainerInfoLoaded$.next(true);
        // this.trainerInfoLoaded.emit(true);
      });
    })
  }

  loadVoices(){
    if(this.voices.length==0){
      this.functions.httpsCallable('getVoices')({trainerId:this.nav.activeOrganisationId,language:this.translate.currentLang}).pipe(take(1)).subscribe((res:any) => {
        this.voices = res.result;
        if(!this.voices || this.voices.length==0 || typeof this.voices === 'string'){
          this.voices = [];
        }
        this.voices = this.sortByPipe.transform(this.voices,-1,'name');
        // console.log('voices',this.voices)
      });
    }
  }

  private runCallbacksIdle(callbacks: Function[]) {
    callbacks.forEach(cb => {
      // Laat de browser ademhalen voor elke callback
      if ('requestIdleCallback' in window) {
        // Browser ondersteunt requestIdleCallback
        (window as any).requestIdleCallback(() => cb());
      } else {
        // Fallback: volgende eventloop
        setTimeout(() => cb(), 0);
      }
    });
  }

  async ensureLoadedForOrg(orgId: string,callback?: any,callbackSpecific?: any) {
    if (!orgId) return;
    if (this.listenersStarted && this.currentOrgId === orgId) {
      if (callback) {
        // console.log('already loaded for org', orgId);
        callback();
      }

      if (callbackSpecific) {
        for(const key in callbackSpecific) {
          this.pendingSpecificCallbacks[key].push(callbackSpecific[key]);
        }
      }
      return;
    }
    // als org wijzigt: alle oude listeners sluiten
    Object.values(this.subscriptions).forEach((s:any) => s?.unsubscribe());
    this.subscriptions = {};

    this.currentOrgId = orgId;
    this.listenersStarted = true;
    this.loadTrainingsAndParticipants(()=>{
      
      // console.log(this.trainings)
      this.loadModules(()=>{
        if(callbackSpecific?.modules){
          callbackSpecific.modules();
        }
        if(this.pendingSpecificCallbacks['modules'].length>0){
          this.runCallbacksIdle(this.pendingSpecificCallbacks['modules']);
          this.pendingSpecificCallbacks['modules'] = [];
        }
        // if(this.pendingSpecificCallbacks['modules'].length>0){
        //   this.pendingSpecificCallbacks['modules'].forEach(cb => cb());
        //   this.pendingSpecificCallbacks['modules'] = [];
        // }
      })
      this.loadCases(()=>{
        if(callbackSpecific?.cases){
          callbackSpecific.cases();
        }
        if(this.pendingSpecificCallbacks['cases'].length>0){
          this.runCallbacksIdle(this.pendingSpecificCallbacks['cases']);
          this.pendingSpecificCallbacks['cases'] = [];
        }
        // if(this.pendingSpecificCallbacks['cases'].length>0){
        //   this.pendingSpecificCallbacks['cases'].forEach(cb => cb());
        //   this.pendingSpecificCallbacks['cases'] = [];
        // }
      })
      this.loadInfoItems(()=>{
        if(callbackSpecific?.infoItems){
          callbackSpecific.infoItems();
        }
        if(this.pendingSpecificCallbacks['infoItems'].length>0){
          this.runCallbacksIdle(this.pendingSpecificCallbacks['infoItems']);
          this.pendingSpecificCallbacks['infoItems'] = [];
        }
        // if(this.pendingSpecificCallbacks['infoItems'].length>0){
        //   this.pendingSpecificCallbacks['infoItems'].forEach(cb => cb());
        //   this.pendingSpecificCallbacks['infoItems'] = [];
        // }
      })
      if (callback) {
        callback();
      }
      if(callbackSpecific?.trainings){
        callbackSpecific.trainings();
      }
      if(callbackSpecific?.example){
        callbackSpecific.example();
      }
      if(this.pendingSpecificCallbacks['trainings'].length>0){
        this.pendingSpecificCallbacks['trainings'].forEach(cb => cb());
        this.pendingSpecificCallbacks['trainings'] = [];
      }
      if(this.pendingSpecificCallbacks['example'].length>0){
        this.pendingSpecificCallbacks['example'].forEach(cb => cb());
        this.pendingSpecificCallbacks['example'] = [];
      }
    })
  }

  async waitForItem(type:string,id: any, timeoutMs = 5000, searchField: string = 'id'): Promise<any> {
    try {
      return await firstValueFrom(
        this[type + 's$'].pipe(
          map((list:any) => list.find((c:any) => c[searchField] === id)),
          filter(Boolean),
          timeout({ first: timeoutMs })
        )
      );
    } catch (e) {
      if (e instanceof TimeoutError) {
        // Val terug: kijk eenmalig in de huidige cache
        const fallback = this[type + 's'].find((c:any) => c[searchField] === id);
        if (fallback) return fallback;
        throw new Error(`Item ${id} niet gevonden binnen ${timeoutMs} ms`);
      }
      throw e;
    }
  }

  // loadTrainerInfo(callback?:Function,unsubscribe?:boolean) {
  //   if(!this.nav.activeOrganisationId){
  //     this.trainerInfo = {}
  //     return
  //   }
  //   let trainerSubscription = this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
  //     .get()
  //     .subscribe((doc) => {
  //       if (doc.exists) {
  //         // console.log("exists")
  //         this.trainerInfo = doc.data();
  //         // get employees from subcollection
  //         this.trainerInfo.id = doc.id
  //         this.trainerInfo.employees = []
  //         this.trainerInfo.settings = []
  //         // this.isTrainerPro = this.trainerInfo.trainerPro == true
  //         this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
  //           .collection('employees')
  //           .snapshotChanges()
  //           .pipe(
  //             // Map documenten naar objecten
  //             map(docs =>
  //               docs.map((e: any) => ({
  //                 id: e.payload.doc.id,
  //                 ...e.payload.doc.data(),
  //               }))
  //             ),
  //           )
  //           .subscribe(employees => {
  //             this.trainerInfo.employees = employees.map(doc => ({
  //               ...doc,
  //             }));
  //             if (callback) {
  //               callback();
  //             }
  //           });
  //         this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
  //           .collection('settings')
  //           .snapshotChanges()
  //           .pipe(
  //             // Map documenten naar objecten
  //             map(docs =>
  //               docs.map((e: any) => ({
  //                 id: e.payload.doc.id,
  //                 ...e.payload.doc.data(),
  //               }))
  //             ),
  //           )
  //           .subscribe(settings => {
  //             this.trainerInfo.settings = settings.map(doc => ({
  //               ...doc,
  //               id: doc.id || '',
  //             }));
  //             if (this.trainerInfo.settings && this.trainerInfo.settings.length>0) {
  //               for (let i = 0; i < this.trainerInfo.settings.length; i++) {
  //                 if(this.trainerInfo.settings[i].trainerPro){
  //                   this.isTrainerPro = this.trainerInfo.settings[i].trainerPro == true
  //                   // console.log('isTrainerPro',this.isTrainerPro,this.trainerInfo.settings[i])
  //                 }
  //                 if(this.trainerInfo.settings[i].affiliate){
  //                   this.trainerInfo.affiliate = this.trainerInfo.settings[i].affiliate
  //                 }
  //               }
  //             }
  //             if (callback) {
  //               callback();
  //             }
  //           });
  //         this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
  //           .collection('knowledge')
  //           .snapshotChanges()
  //           .pipe(
  //             // Map documenten naar objecten
  //             map(docs =>
  //               docs.map((e: any) => ({
  //                 id: e.payload.doc.id,
  //                 ...e.payload.doc.data(),
  //               }))
  //             ),
  //           )
  //           .subscribe(knowledgeItems => {
  //             this.trainerInfo.knowledgeItems = knowledgeItems.map(doc => ({
  //               ...doc,
  //             }));

  //             // get knowledgeItems-documents from subcollection
  //             this.trainerInfo.knowledgeItems.forEach((item:any)=>{
  //               item.documents = []
  //               this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
  //                 .collection('knowledge').doc(item.id)
  //                 .collection('documents')
  //                 .snapshotChanges()
  //                 .pipe(
  //                   // Map documenten naar objecten
  //                   map(docs =>
  //                     docs.map((e: any) => ({
  //                       id: e.payload.doc.id,
  //                       ...e.payload.doc.data(),
  //                     }))
  //                   ),
  //                 )
  //                 .subscribe(documents => {
  //                   item.documents = documents.map(doc => ({
  //                     ...doc,
  //                   }));
  //                 });
  //             });

  //           });
  //         this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
  //           .collection('purchases')
  //           .snapshotChanges()
  //           .pipe(
  //             // Map documenten naar objecten
  //             map(docs =>
  //               docs.map((e: any) => ({
  //                 id: e.payload.doc.id,
  //                 ...e.payload.doc.data(),
  //               }))
  //             ),
  //           )
  //           .subscribe(purchaseItems => {
  //             this.trainerInfo.purchaseItems = purchaseItems.map(doc => ({
  //               ...doc,
  //             }));

  //             // get purchaseItems-documents from subcollection
  //             this.trainerInfo.purchaseItems.forEach((item:any)=>{
  //               item.documents = []
  //               this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
  //                 .collection('purchases')
  //                 .snapshotChanges()
  //                 .pipe(
  //                   // Map documenten naar objecten
  //                   map(docs =>
  //                     docs.map((e: any) => ({
  //                       id: e.payload.doc.id,
  //                       ...e.payload.doc.data(),
  //                     }))
  //                   ),
  //                 )
  //                 .subscribe(documents => {
  //                   item.documents = documents.map(doc => ({
  //                     ...doc,
  //                   }));
  //                 });
  //             });

  //           });


  //           if (this.trainerInfo.affiliate) {
  //             this.getAffiliates();
  //           }
  //           if (this.trainerInfo.organisation) {
  //             this.publishType = 'organisation';
  //           }

  //       } else {
  //         // console.log("No such document!");
  //       }
  //     });
  //     if(unsubscribe){
  //       setTimeout(() => {
  //         trainerSubscription.unsubscribe();
  //       }, 300);
  //     }

  // }

  loadTrainerInfo(callback?: Function, unsubscribe?: boolean) {
    if (!this.nav.activeOrganisationId) {
      this.trainerInfo = {};
      return;
    }

    const docRef = this.fire.collection('trainers').doc(this.nav.activeOrganisationId);

    const stepsToWaitFor: number[] = [];
    let completedSteps = 0;

    const TOTAL_STEPS = 5; // employees, settings, knowledge, purchases
    let subSubSteps = 0;   
    const tryFinish = () => {
      if (completedSteps === TOTAL_STEPS && subSubSteps === 0 && callback) {
        callback();
      }
    };

    const maybeCallback = () => {
      completedSteps++;
      tryFinish();
    };

    let trainerSubscription = docRef.get().subscribe(doc => {
      if (!doc.exists) return;
      this.trainerInfo = doc.data();
      this.trainerInfo.id = doc.id;
      this.trainerInfo.employees = [];
      this.trainerInfo.settings = [];
      this.trainerInfo.knowledgeItems = [];
      this.trainerInfo.purchaseItems = [];

      // EMPLOYEES
      docRef.collection('employees').snapshotChanges().pipe(
        map(docs => docs.map(e => ({ id: e.payload.doc.id, ...e.payload.doc.data() })))
      ).subscribe({
        next: employees => {
          this.trainerInfo.employees = employees;
          maybeCallback();
        },
        error: () => {
          this.trainerInfo.employees = [];
          maybeCallback();
        }
      });

      // SETTINGS
      docRef.collection('settings').snapshotChanges().pipe(
        map(docs => docs.map(e => ({ id: e.payload.doc.id, ...e.payload.doc.data() })))
      ).subscribe({
        next: settings => {
          this.trainerInfo.settings = settings;
          settings.forEach((s:any) => {
            if (s.trainerPro) this.isTrainerPro = s.trainerPro;
            if (s.affiliate) this.trainerInfo.affiliate = s.affiliate;
          });
          maybeCallback();
        },
        error: () => {
          this.trainerInfo.settings = [];
          maybeCallback();
        }
      });

      // CUSTOMERS
      docRef.collection('customers').snapshotChanges().pipe(
        map(docs => docs.map(e => ({ id: e.payload.doc.id, ...e.payload.doc.data() })))
      ).subscribe({
        next: customers => {
          this.trainerInfo.customers = customers;
          // maybeCallback();
           if (customers.length === 0) {
            subSubSteps--;
            subSubSteps--;
            maybeCallback();
          } else {
            subSubSteps += customers.length;
            subSubSteps += customers.length;
            customers.forEach((item:any) => {
              item.trainings = [];
              docRef.collection('customers').doc(item.id).collection('trainings').snapshotChanges().pipe(
                map(docs => docs.map(e => ({ id: e.payload.doc.id, ...e.payload.doc.data() })))
              ).subscribe({
                next: docs => {
                  item.trainings = docs;
                  subSubSteps--;
                  tryFinish();
                },
                error: () => {
                  item.trainings = [];
                  subSubSteps--;
                  tryFinish();
                }
              });
            });
            customers.forEach((item:any) => {
              item.users = [];
              docRef.collection('customers').doc(item.id).collection('users').snapshotChanges().pipe(
                map(docs => docs.map(e => ({ id: e.payload.doc.id, ...e.payload.doc.data() })))
              ).subscribe({
                next: docs => {
                  item.users = docs;
                  subSubSteps--;
                  tryFinish();
                },
                error: () => {
                  item.users = [];
                  subSubSteps--;
                  tryFinish();
                }
              });
            });
            maybeCallback(); // For the parent collection
          }
        },
        error: () => {
          this.trainerInfo.customers = [];
          maybeCallback();
        }
      });

      // KNOWLEDGE
      docRef.collection('knowledge').snapshotChanges().pipe(
        map(docs => docs.map(e => ({ id: e.payload.doc.id, ...e.payload.doc.data() })))
      ).subscribe({
        next: knowledgeItems => {
          this.trainerInfo.knowledgeItems = knowledgeItems;

          if (knowledgeItems.length === 0) {
            subSubSteps--;
            maybeCallback();
          } else {
            subSubSteps += knowledgeItems.length;
            knowledgeItems.forEach((item:any) => {
              item.documents = [];
              docRef.collection('knowledge').doc(item.id).collection('documents').snapshotChanges().pipe(
                map(docs => docs.map(e => ({ id: e.payload.doc.id, ...e.payload.doc.data() })))
              ).subscribe({
                next: docs => {
                  item.documents = docs;
                  subSubSteps--;
                  tryFinish();
                },
                error: () => {
                  item.documents = [];
                  subSubSteps--;
                  tryFinish();
                }
              });
            });
            maybeCallback(); // For the parent collection
          }
        },
        error: () => {
          this.trainerInfo.knowledgeItems = [];
          maybeCallback();
        }
      });

      // PURCHASES
      docRef.collection('purchases').snapshotChanges().pipe(
        map(docs => docs.map(e => ({ id: e.payload.doc.id, ...e.payload.doc.data() })))
      ).subscribe({
        next: purchaseItems => {
          this.trainerInfo.purchaseItems = purchaseItems;

          if (purchaseItems.length === 0) {
            subSubSteps--;
            maybeCallback();
          } else {
            subSubSteps += purchaseItems.length;
            purchaseItems.forEach((item:any) => {
              item.documents = [];
              docRef.collection('purchases').doc(item.id).collection('documents').snapshotChanges().pipe(
                map(docs => docs.map(e => ({ id: e.payload.doc.id, ...e.payload.doc.data() })))
              ).subscribe({
                next: docs => {
                  item.documents = docs;
                  subSubSteps--;
                  this.revenue();
                  tryFinish();
                },
                error: () => {
                  item.documents = [];
                  subSubSteps--;
                  tryFinish();
                }
              });
            });
            maybeCallback(); // For the parent collection
          }
        },
        error: () => {
          this.trainerInfo.purchaseItems = [];
          maybeCallback();
        }
      });

      // Eventuele extra setup
      if (this.trainerInfo.affiliate) this.getAffiliates();
      if (this.trainerInfo.organisation) this.publishType = 'organisation';
    });

    if (unsubscribe) {
      // setTimeout(() => {
        trainerSubscription.unsubscribe();
      // }, 300);
    }
  }

  getAffiliates(){
    if(this.affiliateLoaded){
      return
    }
    this.affiliateLoaded = true
    this.functions.httpsCallable('myAffiliates')({}).subscribe((res:any) => {
      // console.log('res',res)
      if(res && res.result){
        this.affiliates = res.result
        // console.log('affiliates',this.affiliates)
      }
    })
  }

  // loadCases(callback?:Function) {
  //     const currentLang = this.translate.currentLang || 'en';
  //     // Query voor cases die toegankelijk zijn voor de gebruiker
  //     this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
  //       .collection('cases')
  //       .snapshotChanges()
  //       .pipe(
  //         // Map documenten naar objecten
  //         map(docs =>
  //           docs.map((e: any) => ({
  //             ...e.payload.doc.data(),
  //             id: e.payload.doc.id,
  //           }))
  //         ),
  //         // Haal vertalingen op voor de huidige taal
  //         switchMap(cases =>
  //           combineLatest(
  //             cases.map(doc =>
  //               this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
  //                 .collection(`cases/${doc.id}/translations`)
  //                 .doc(currentLang)
  //                 .get()
  //                 .pipe(
  //                   map(translationDoc => ({
  //                     ...doc,
  //                     id: doc.id,
  //                     translation: translationDoc.exists ? translationDoc.data() : null,
  //                   }))
  //                 )
  //             )
  //           )
  //         )
  //       )
  //       .subscribe(cases => {
  //         this.cases = cases.map(doc => ({
  //           ...doc,
  //           id: doc.id,
  //         }));
  //         if (callback) {
  //           callback();
  //         }
  //       });
  // }

  loadCases(callback?: Function): void {
  // 1) Eerst bestaande subscription sluiten (voorkomt stapeling)
    if (this.subscriptions['loadcases']) {
      this.subscriptions['loadcases'].unsubscribe();
    }

    const orgId = this.nav.activeOrganisationId;
    const lang  = this.translate.currentLang || 'en';

    // 2) Realtime listener op cases + bijbehorende vertaling voor huidige taal
    this.subscriptions['loadcases'] = this.fire
      .collection('trainers')
      .doc(orgId)
      .collection('cases')
      .snapshotChanges()
      .pipe(
        // Docs → plain objects
        map((docs: any[]) =>
          docs.map((e: any) => ({
            id: e.payload.doc.id,
            ...e.payload.doc.data(),
          })),
        ),
        // Voor elk case-doc ook de vertaling ophalen (zelfde org, subcollectie)
        switchMap((cases: any[]) => {
          if (!cases.length) return of([] as any[]);
          return combineLatest(
            cases.map((c) =>
              this.fire
                .collection('trainers')
                .doc(orgId)
                .collection(`cases/${c.id}/translations`)
                .doc(lang)
                .get()
                .pipe(
                  map((tDoc: any) => ({
                    ...c,
                    translation: tDoc.exists ? tDoc.data() : null,
                  })),
                  catchError((err) => {
                    // console.error(`Fout bij vertaling ophalen voor case ${c.id}`, err);
                    return of({ ...c, translation: null }); // fallback
                  })
                ),
                catchError(err => {
                  // console.error('loadCases pipeline error', err);
                  return of([]);
                })
            )
          );
        })
      )
      .subscribe((incomingCases: any[]) => {
        // 3) In-place reconcile: behoud object-referenties die de UI al vasthoudt
        this.patchArrayInPlace(this.cases, incomingCases, 'id', (target: any, src: any) => {
          Object.assign(target, src);
        });

        // 4) (optioneel) stabiele sortering
        this.cases.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

        // 5) Stream updaten voor wie wil wachten op binnenkomst (waitForCase, etc.)
        this.cases$.next(this.cases);
        if(callback) {
          callback();
        }
      });
  }

  loadInfoItems(callback?:Function,unsubscribe?:boolean) {
    this.subscriptions['loadInfoItems'] =  this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
      .collection('infoItems')
      .snapshotChanges()
      .pipe(
        // Map documenten naar objecten
        map(docs =>
          docs.map((e: any) => ({
            id: e.payload.doc.id, 
            ...e.payload.doc.data(),
          }))
        ),
      )
      .subscribe((incomingCases: any[]) => {
        // 3) In-place reconcile: behoud object-referenties die de UI al vasthoudt
        this.patchArrayInPlace(this.infoItems, incomingCases, 'id', (target: any, src: any) => {
          Object.assign(target, src);
        });

        // 4) (optioneel) stabiele sortering
        this.infoItems.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

        // 5) Stream updaten voor wie wil wachten op binnenkomst (waitForCase, etc.)
        this.infoItems$.next(this.infoItems);
        if(callback) {
          callback();
        }
      });
      // .subscribe(infoItems => {
      //   this.infoItems = infoItems.map(doc => ({
      //     ...doc,
      //   }));
      //   // console.log('infoItems',this.infoItems)
      //   if (callback) {
      //     callback();
      //   }
      //   if(unsubscribe){
      //     this.subscriptions['loadInfoItems'].unsubscribe();
      //   }
      // });
  }

  getInfoItem(id:string){
    for (let i = 0; i < this.infoItems.length; i++) {
      if (this.infoItems[i].id == id) {
        return this.infoItems[i]
      }
    }
    return null
  }

  emptyBreadCrumbs(){
    this.breadCrumbs = []
    this.trainingItem = {}
    this.moduleItem = {}
    this.caseItem = {}
    this.infoItem = {}
  }

  defaultCase(){
    return {
      created:Date.now(),
      conversation:'',
      open_to_user:false,
      open_to_public:false,
      open_to_admin:true,
      title:'',
      role:'',
      user_role:'',
      description:'',
      attitude:1,
      steadfastness:50,
      casus:'',
      goalsItems: {
        phases:[],
        free:'',
        attitude:0,
      },
      price:0,
      max_time:30,
      minimum_goals:0,
      openingMessage:'',
      goal:false,
      editable_by_user:{
        role:false,
        description:false,
        user_role:false,
        function:false,
        vision:false,
        interests:false,
        communicationStyle:false,
        externalFactors:false,
        history:false,
        attitude:false,
        steadfastness:false,
        free_answer:false,
        casus:false,
        goals:{
          phases:false,
          free:true,
          attitude:false,
        },
        max_time:false,
        minimum_goals:false,
        openingMessage:true,
        agents:{
          choices:true,
          facts:true,
          background:true,
          undo:true,
        },
        hide:{
          attitude:false,
          phases:false,
          feedback:false,
          feedbackCipher: false,
          goal: false,
        }
      }
    }
  }

  defaultInfoItem(){
    return {
      created:Date.now(),
      title:'',
      audio_url:'',
      user_info:'',
      type:'text',
      content:'',
      photo:'',
      video_url:'',
      modules:[],
      tags:[],
      intro:'',
      avatarName:'',
      open_to_user:false,
    }
  }

  // loadModules(callback?:Function) {
  //   this.subscriptions['loadmodules'] = this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
  //     .collection('modules')
  //     .snapshotChanges()
  //     .pipe(
  //       // Map documenten naar objecten
  //       map(docs =>
  //         docs.map((e: any) => ({
  //           id: e.payload.doc.id,
  //           ...e.payload.doc.data(),
  //         }))
  //       ),
  //     )
  //     .subscribe(modules => {
  //       this.modules = modules.map(doc => ({
  //         ...doc,
  //       }));
  //       if(this.moduleItem.id){
  //         for (let i = 0; i < this.modules.length; i++) {
  //           if (this.modules[i].id == this.moduleItem.id) {
  //             this.moduleItem = JSON.parse(JSON.stringify(this.modules[i]))
  //           }
  //         }
  //       }
  //       // console.log(this.modules)
  //       if (callback) {
  //         callback();
  //       }
  //     });
  // }

  // In je service


  // private subscriptions: { [k: string]: any } = {};

  /** Roep dit aan vlak vóór je `update('items', ...)` doet in je component */
  private lastOrderSigByModule = new Map<string, string>();
  rememberLocalOrder(moduleId: string, items: any[]): void {
    this.lastOrderSigByModule.set(moduleId, this.computeOrderSig(items));
  }

  loadModules(callback?: Function): void {
    // console.log('loadModules',this.nav.activeOrganisationId)
    // Unsubscribe als deze al bestaat
    if (this.subscriptions['loadmodules']) {
      this.subscriptions['loadmodules'].unsubscribe();
    }

    this.subscriptions['loadmodules'] = this.fire
      .collection('trainers')
      .doc(this.nav.activeOrganisationId)
      .collection('modules')
      .snapshotChanges()
      .pipe(
        map((docs: any[]) =>
          docs.map((e: any) => ({
            id: e.payload.doc.id,
            ...e.payload.doc.data(),
          }))
        )
      )
      .subscribe((incomingModules: any[]) => {
        // 1) Patch top-level modules in place
        this.patchArrayInPlace(this.modules, incomingModules, 'id', (targetModule: any, srcModule: any) => {
          // 1a) Kopieer velden behalve items
          Object.keys(srcModule).forEach((k) => {
            if (k !== 'items') targetModule[k] = srcModule[k];
          });

          // 1b) Bereken signatures
          const targetItems: any[] = Array.isArray(targetModule.items) ? targetModule.items : (targetModule.items = []);
          const srcItems: any[] = Array.isArray(srcModule.items) ? srcModule.items : [];
          const incomingSig = this.computeOrderSig(srcItems);
          const currentSig  = this.computeOrderSig(targetItems);
          const plannedSig  = this.lastOrderSigByModule.get(targetModule.id);

          // 1c) Als de volgorde (snapshot) gelijk is aan lokaal/geplande -> items níet aanraken (flits voorkomen)
          const sameOrder =
            (plannedSig && plannedSig === incomingSig) ||
            (!plannedSig && incomingSig === currentSig);

          if (sameOrder) {
            // Optioneel: wél lichte field-merge doen zonder structuur of volgorde te wijzigen
            // (Meestal niet nodig bij re-order; we laten 'm leeg om nul DOM-mutaties te forceren)
          } else {
            // 1d) Patch geneste items in place + sorteer
            this.patchArrayInPlace(targetItems, srcItems, 'id', (t: any, s: any) => Object.assign(t, s));
            targetItems.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
          }

          // 1e) Als de geplande signature is “ingehaald” door snapshot: opruimen
          if (plannedSig && plannedSig === incomingSig) {
            this.lastOrderSigByModule.delete(targetModule.id);
          }
        });
        
        // 2) Zorg dat moduleItem een **referentie** blijft naar modules[]
        if (this.moduleItem && this.moduleItem.id) {
          const ref = this.modules.find((m) => m.id === this.moduleItem.id);
          if (ref && ref !== this.moduleItem) {
            this.moduleItem = ref; // herverwijs, niet klonen
          }
        }

        if (typeof callback === 'function') callback();
      });
  }

  // ---- Helpers -------------------------------------------------------------

  /** Signature op basis van id-volgorde; snel en stabiel */
  private computeOrderSig(arr: any[]): string {
    if (!Array.isArray(arr)) return '';
    return arr.map((x) => x && x.id).join('|');
  }

  /**
   * Patcht target[] zodat de array-referentie behouden blijft:
   * - Update bestaande items via onUpdate
   * - Voeg nieuwe toe
   * - Verwijder niet-meer-bestaande
   */
  private patchArrayInPlace(
    target: any[],
    source: any[],
    key: string,
    onUpdate?: (targetItem: any, srcItem: any) => void
  ): void {
    const indexById = new Map<any, number>();
    for (let i = 0; i < target.length; i++) indexById.set(target[i][key], i);

    const seen = new Set<any>();

    // Update bestaande of voeg toe
    for (let s = 0; s < source.length; s++) {
      const sItem = source[s];
      const id = sItem[key];
      const tIdx = indexById.get(id);

      if (tIdx !== undefined) {
        const tItem = target[tIdx];
        if (onUpdate) onUpdate(tItem, sItem);
        else Object.assign(tItem, sItem);
        seen.add(id);
      } else {
        target.push({ ...sItem });
        seen.add(id);
      }
    }

    // Verwijder verdwenen items (van achter naar voren)
    for (let i = target.length - 1; i >= 0; i--) {
      const id = target[i][key];
      if (!seen.has(id)) target.splice(i, 1);
    }
  }

    loadTrainings(callback?: Function): void {
    // Unsubscribe als deze al bestaat
    if (this.subscriptions['loadtrainings']) {
      this.subscriptions['loadtrainings'].unsubscribe();
    }

    this.subscriptions['loadtrainings'] = this.fire
      .collection('trainers')
      .doc(this.nav.activeOrganisationId)
      .collection('trainings')
      .snapshotChanges()
      .pipe(
        map((docs: any[]) =>
          docs.map((e: any) => ({
            id: e.payload.doc.id,
            ...e.payload.doc.data(),
          }))
        )
      )
      .subscribe((incomingTrainings: any[]) => {
        // 1) Patch top-level modules in place
        this.patchArrayInPlace(this.trainings, incomingTrainings, 'id', (targetModule: any, srcModule: any) => {
          // 1a) Kopieer velden behalve items
          Object.keys(srcModule).forEach((k) => {
            if (k !== 'items') targetModule[k] = srcModule[k];
          });

          // 1b) Bereken signatures
          const targetItems: any[] = Array.isArray(targetModule.items) ? targetModule.items : (targetModule.items = []);
          const srcItems: any[] = Array.isArray(srcModule.items) ? srcModule.items : [];
          const incomingSig = this.computeOrderSig(srcItems);
          const currentSig  = this.computeOrderSig(targetItems);
          const plannedSig  = this.lastOrderSigByModule.get(targetModule.id);

          // 1c) Als de volgorde (snapshot) gelijk is aan lokaal/geplande -> items níet aanraken (flits voorkomen)
          const sameOrder =
            (plannedSig && plannedSig === incomingSig) ||
            (!plannedSig && incomingSig === currentSig);

          if (sameOrder) {
            // Optioneel: wél lichte field-merge doen zonder structuur of volgorde te wijzigen
            // (Meestal niet nodig bij re-order; we laten 'm leeg om nul DOM-mutaties te forceren)
          } else {
            // 1d) Patch geneste items in place + sorteer
            this.patchArrayInPlace(targetItems, srcItems, 'id', (t: any, s: any) => Object.assign(t, s));
            targetItems.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
          }

          // 1e) Als de geplande signature is “ingehaald” door snapshot: opruimen
          if (plannedSig && plannedSig === incomingSig) {
            this.lastOrderSigByModule.delete(targetModule.id);
          }
        });

        // 2) Zorg dat moduleItem een **referentie** blijft naar trainings[]
        if (this.trainingItem && this.trainingItem.id) {
          const ref = this.trainings.find((m) => m.id === this.trainingItem.id);
          if (ref && ref !== this.trainingItem) {
            this.trainingItem = ref; // herverwijs, niet klonen
          }
        }

        if (typeof callback === 'function') callback();
      });
  }

  // loadTrainings(callback?:Function) {
  //   this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
  //     .collection('trainings')
  //     .snapshotChanges()
  //     .pipe(
  //       // Map documenten naar objecten
  //       defaultIfEmpty([]),
  //       map(docs =>
  //         docs.map((e: any) => ({
  //           id: e.payload.doc.id,
  //           ...e.payload.doc.data(),
  //         }))
  //       ),
  //     )
  //     .subscribe(trainings => {
  //       this.trainings = trainings.map(doc => ({
  //         ...doc,
  //       }));
  //       if(this.trainingItem.id){
  //         for (let i = 0; i < this.trainings.length; i++) {
  //           if (this.trainings[i].id == this.trainingItem.id) {
  //             this.trainingItem = JSON.parse(JSON.stringify(this.modules[i]))
  //           }
  //         }
  //       }
  //       if (callback) {
  //         callback();
  //       }
  //     });
  // }

  // loadSegments(callback?:Function) {

  //   this.subscriptions['loadsegments'] =  
  //     this.fire.collection('segments',ref =>
  //       ref.where('trainerId','==',this.nav.activeOrganisationId)
  //       .where('type','==','knowledge')
  //     ).snapshotChanges()
  //   .subscribe((segments:any[]) => {
  //     this.segments = segments.map(doc => ({
  //       id: doc.payload.doc.id,
  //       ...doc.payload.doc.data(),
  //     }));
  //     this.segmentsOrganized = this.organizeSegments(this.segments);
  //     console.log('segments',this.segmentsOrganized)
  //     if (callback) {
  //       callback();
  //     }
  //   });
  // }

  organizeSegments(segments:any[]){
    let organized:any = {}
    // console.log('organizeSegments',segments)
    segments.forEach(segment => {
      if (!organized[segment.metadata?.book]) {
        organized[segment.metadata.book] = [];
      }
      organized[segment.metadata.book].push(segment);
      organized[segment.metadata.book].sort((a:any, b:any) => {
        return a.index - b.index;
      });
    });
    let books:any[] = []
    for(let book in organized){
      books.push({
        book: book,
        segments: organized[book]
      })
    }
    books.sort((a:any, b:any) => {
      return a.book.localeCompare(b.book);
    });
    return books;
  }

  //Loadmodules and participants from subcollection
  loadTrainingsAndParticipants(callback?:Function) {
    this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
      .collection('trainings')
      .snapshotChanges()
      .pipe(
        // Map documenten naar objecten
        defaultIfEmpty([]),
        map(docs =>
          docs.map((e: any) => ({
            id: e.payload.doc.id,
            ...e.payload.doc.data(),
          }))
        ),
        tap(trainings => {
          if (trainings.length === 0 && callback) {
            callback();
          }
        }),
        // Haal deelnemers op voor elke module
        switchMap(modules =>
          this.safeCombineLatest(
            modules.map(doc =>
              this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
                .collection('trainings')
                .doc(doc.id)
                .collection('participants')
                .snapshotChanges()
                .pipe(
                  map(participantsDocs =>
                    participantsDocs.map((e: any) => ({
                      id: e.payload.doc.id,
                      ...e.payload.doc.data(),
                    }))
                  ),
                  map(participants => ({
                    ...doc,
                    participants: participants,
                  }))
                )
            )
          )
        ),
        // switchMap(modules =>
        //   modules.length === 0
        //   ? of([])
        //   : combineLatest(
        //     modules.map(doc =>
        //       this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
        //         .collection('trainings')
        //         .doc(doc.id)
        //         .collection('items')
        //         .snapshotChanges()
        //         .pipe(
        //           map(itemsDocs =>
        //             itemsDocs.map((e: any) => ({
        //               id: e.payload.doc.id,
        //               ...e.payload.doc.data(),
        //             }))
        //           ),
        //           map(trainingItems => ({
        //             ...doc,
        //             trainingItems: trainingItems,
        //           }))
        //         )
        //     )
        //   )
        // ),
        switchMap(modules =>
          modules.length === 0
          ? of([])
          : combineLatest(
            modules.map(doc =>
              this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
                .collection('trainings')
                .doc(doc.id)
                .collection('credits')
                .snapshotChanges()
                .pipe(
                  map(creditsDocs =>
                    creditsDocs.map((e: any) => ({
                      id: e.payload.doc.id,
                      ...e.payload.doc.data(),
                    }))
                  ),
                  map(creditsItems => ({
                    ...doc,
                    credits: creditsItems,
                  }))
                )
            )
          )
        ),
        switchMap(modules =>
          modules.length === 0
          ? of([])
          : combineLatest(
            modules.map(doc =>
              this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
                .collection('trainings')
                .doc(doc.id)
                .collection('close')
                .snapshotChanges()
                .pipe(
                  map(closeDocs =>
                    closeDocs.map((e: any) => ({
                      id: e.payload.doc.id,
                      ...e.payload.doc.data(),
                    }))
                  ),
                  map(closeItems => ({
                    ...doc,
                    results: closeItems,
                  }))
                  
                )
            )
          )
        ),
        
      )
      .subscribe(trainings => {

        this.trainings = trainings.map(doc => ({
          ...doc,
        }));
        

        // Reset breadcrumbs en trainingItem als er geen trainingen meer zijn
        if (this.trainings.length === 0) {
          this.trainingItem = null;
          this.breadCrumbs = [];
        }


        if (callback) {
          if(this.breadCrumbs.length>0){
            let tr = this.getTraining(this.breadCrumbs[0].item.id)
            if(tr && tr.participants && this.trainingItem){
              this.breadCrumbs[0].item.participants = tr.participants
              if(this.trainingItem.id == this.breadCrumbs[0].item.id){
                this.trainingItem.participants = tr.participants
              } 
            }
          }
          callback();
        }
      });
  }

  // loadTrainingsAndParticipants(callback?: Function) {
  //   const orgId = this.nav.activeOrganisationId;

  //   this.fire.collection('trainers').doc(orgId)
  //   .collection('trainings')
  //   .snapshotChanges()
  //   .pipe(
  //     defaultIfEmpty([]),
  //     map(docs =>
  //       docs.map((e: any) => ({
  //         id: e.payload.doc.id,
  //         ...e.payload.doc.data(),
  //       }))
  //     ),
  //     concatMap(trainings => {
  //       if (trainings.length === 0) {
  //         return of([]); // geen trainingen → callback straks alsnog
  //       }
        
  //       return from(trainings).pipe(
  //         concatMap(training =>
  //           this.loadSubcollectionsForTraining(training, orgId)
  //         ),
  //         toArray() // alle resultaten verzamelen in array
  //       );
  //     })
  //   )
  //   .subscribe((enrichedTrainings) => {
      
  //     setTimeout(() => {
  //       this.trainings = enrichedTrainings;

  //       if (this.trainings.length === 0) {
  //         this.trainingItem = null;
  //         this.breadCrumbs = [];
  //       }

  //       // vul participants in breadcrumb indien nodig
  //       if (this.breadCrumbs.length > 0) {
  //         const tr = this.getTraining(this.breadCrumbs[0].item.id);
  //         if (tr && tr.participants && this.trainingItem) {
  //           this.breadCrumbs[0].item.participants = tr.participants;
  //           if (this.trainingItem.id === this.breadCrumbs[0].item.id) {
  //             this.trainingItem.participants = tr.participants;
  //           }
  //         }
  //       }
  //       if (callback) callback();
  //     }, 0); // vertraagd uitvoeren om main thread lucht te geven
  //   });
  // }
  // trainingItemsLoaded:string[] = []
  async loadItemsForTraining(trainingId: string): Promise<void> {
    const path = this.fire.collection('trainers')
      .doc(this.nav.activeOrganisationId)
      .collection('trainings')
      .doc(trainingId)
      .collection('items');

    path.snapshotChanges()
      .pipe(
        take(1), // eenmalig laden
        map(docs => docs.map(e => ({
          id: e.payload.doc.id,
          ...e.payload.doc.data(),
        })))
      )
      .subscribe(items => {
        // Update de training in de bestaande trainingslijst
        const training = this.trainings.find(t => t.id === trainingId);
        if (training) {
          training.trainingItems = items;
          this.trainingSubItems[trainingId] = items;
          // this.trainings = [...this.trainings];
        }
      });
  }

  safeCombineLatest<T>(observables: Observable<T>[]): Observable<T[]> {
    return observables.length ? combineLatest(observables) : of([]);
  }

  getModule(id:string){
    for (let i = 0; i < this.modules.length; i++) {
      if (this.modules[i].id == id) {
        return this.modules[i]
      }
    }
    return {}
  }

  getTrainingModule(training:any,id:string){
    if(this.breadCrumbs.length>0 && this.breadCrumbs[0].item.id == id){
      return this.breadCrumbs[0].item
    }
    let foundTraining:any = null
    if(training && training.items){
      for (let i = 0; i < training.items.length; i++) {
        if(training.items[i].type == 'module'){
          foundTraining = this.getTrainingModule(training.items[i],id)
          if(foundTraining){
            return foundTraining
          }
        }
        if (training.items[i].id == id) {
          return training.items[i]
        }
      }
    }
    
    return foundTraining
  }

  getTraining(id:string,created?:number){
    if(id){
      
      for (let i = 0; i < this.trainings.length; i++) {
        if (this.trainings[i].id == id) {
          if(this.trainings[i].results && this.trainings[i].results.length>0){
            this.trainings[i].organizedResults = this.organizeResults(this.trainings[i].results,this.trainings[i])
          }
          // console.log('getTraining',this.trainings[i])
          return this.trainings[i]
        }
      }
    }
    if(created){
      for (let i = 0; i < this.trainings.length; i++) {
        if (this.trainings[i].created == created) {
          if(this.trainings[i].results && this.trainings[i].results.length>0){
            this.trainings[i].organizedResults = this.organizeResults(this.trainings[i].results,this.trainings[i])
          }
          return this.trainings[i]
        }
      }
    }
    return {}
  }

  getCase(id:string){
    for (let i = 0; i < this.cases.length; i++) {
      if (this.cases[i].id == id) {
        return this.cases[i]
      }
    }
    return null
  }

  getItemTraining(id:string,trainingId:string){
    // console.log(this.trainingSubItems,trainingId,id)
    let items = this.trainingSubItems[trainingId] || [];
    if(items.length){
      for (let i = 0; i < items.length; i++) {
        if (items[i].id == id) {
          return items[i]
        }
      }
    }


    // for (let t = 0; t < this.trainings.length; t++) {
    //   if (this.trainings[t].id == trainingId) {
    //     if(this.trainings[t].trainingItems){
    //       for (let i = 0; i < this.trainings[t].trainingItems.length; i++) {
    //         if (this.trainings[t].trainingItems[i].id == id) {
    //           return this.trainings[t].trainingItems[i]
    //         }
    //       }
    //     }
    //   }
    // }
    return {}
  }

  countCostsTraining(trainingItem:any){

    if(!trainingItem.expected_conversations || trainingItem.expected_conversations<1){
      trainingItem.expected_conversations = 1
    }
    if(!trainingItem.amount_participants || trainingItem.amount_participants<1){
      trainingItem.amount_participants = 1
    }
    if(!trainingItem.type_credits){
      trainingItem.type_credits = 'unlimited'
    }
    let costs:any= {}
    costs.basicCosts = 100

    if(this.isTrainerPro || this.trainerInfo?.organisation?.active){
      costs.basicCosts = 0;
    }

    costs.extraCostsPerConversation = 2;
    costs.extraPeriodCosts = 0;
    if(trainingItem.type_credits != 'credits'){
      costs.extraCosts = 10 * trainingItem.amount_participants
      costs.extraCostsPerConversation = 0
      costs.extraConversations = 0
    }
    // else{
    //   // costs.extraCosts = (trainingItem.amount_participants * trainingItem.expected_conversations) - 10
    //   if(costs.extraCosts < 0){
    //     costs.extraCosts = 0
    //   }
    //   costs.unlimitedCosts = 0
    //   costs.extraConversations = (trainingItem.amount_participants * trainingItem.expected_conversations) - 10
    //   if(costs.extraConversations < 0){
    //     costs.extraConversations = 0
    //   }
    //   costs.extraCosts = costs.extraConversations * costs.extraCostsPerConversation
    // }

    if(trainingItem.amount_period>2){
      costs.extraPeriod = (trainingItem.amount_period - 2) 
      costs.extraPeriodCosts = (trainingItem.amount_period - 2) * (10 / 2) * trainingItem.amount_participants
    }

    costs.totalCosts = costs.basicCosts + costs.extraCosts + costs.extraPeriodCosts
    costs.tax = costs.totalCosts * 0.21
    costs.totalCostsPlusTax = costs.totalCosts + costs.tax

    return costs
  }

  countExtraCostsTraining(trainingItem:any,extraCostsOptions:any){

    if(!extraCostsOptions.expected_conversations || extraCostsOptions.expected_conversations<1){
      extraCostsOptions.expected_conversations = 0
    }
    if(!extraCostsOptions.amount_participants || extraCostsOptions.amount_participants<1){
      extraCostsOptions.amount_participants = 0
    }
    if(!extraCostsOptions.type_credits){
      extraCostsOptions.type_credits = 'unlimited'
    }
    let costs:any= {}
    costs.basicCosts = 0
    costs.extraCostsPerConversation = 2
    costs.extraPeriodCosts = 0
    // if(trainingItem.type_credits != 'credits'){
      costs.extraCosts = 10 * extraCostsOptions.amount_participants
      costs.extraCostsPerConversation = 0
      costs.extraConversations = 0
    // }
    // else{
    //   // costs.extraCosts = (trainingItem.amount_participants * trainingItem.expected_conversations) - 10
    //   if(costs.extraCosts < 0){
    //     costs.extraCosts = 0
    //   }
    //   costs.unlimitedCosts = 0
    //   if(extraCostsOptions.expected_conversations<1 && extraCostsOptions.amount_participants<1){
    //     costs.extraConversations = 0
    //   }
    //   else if(extraCostsOptions.expected_conversations<1){
    //     costs.extraConversations = (extraCostsOptions.amount_participants * trainingItem.expected_conversations)
    //   }
    //   else if(extraCostsOptions.amount_participants<1){
    //     costs.extraConversations = (trainingItem.amount_participants * extraCostsOptions.expected_conversations)
    //   }
    //   else{
    //     costs.extraConversations = ((trainingItem.amount_participants + extraCostsOptions.amount_participants) * (extraCostsOptions.expected_conversations + trainingItem.expected_conversations)) - (trainingItem.amount_participants * trainingItem.expected_conversations)
    //   }
    //   costs.extraCosts = costs.extraConversations * costs.extraCostsPerConversation
    // }

    if(extraCostsOptions.amount_period){
      costs.extraPeriod = (extraCostsOptions.amount_period) 
      costs.extraPeriodCosts = (extraCostsOptions.amount_period) * (10 / 2) * (trainingItem.amount_participants + extraCostsOptions.amount_participants)
    }

    costs.totalCosts = costs.basicCosts + costs.extraCosts + costs.extraPeriodCosts
    costs.tax = costs.totalCosts * 0.21
    costs.totalCostsPlusTax = costs.totalCosts + costs.tax

    return costs
  }

  getModuleItem(id:string){
    for (let i = 0; i < this.modules.length; i++) {
      if (this.modules[i].id == id) {
        return this.modules[i]
      }
    }
    return {}
  }

  getTrainingItem(id:string){
    for (let i = 0; i < this.trainings.length; i++) {
      if (this.trainings[i].id == id) {
        return this.trainings[i]
      }
    }
    return {}
  }

  tooltip(item:string,title:string,event?:any){
    if(event){
      event.stopPropagation();
      event.preventDefault();
    }
    if(!item){
      
    }
    else{
      this.modalService.showText(this.translate.instant('tooltips.'+item),this.translate.instant(title))
    }
  }

  checkIsTrainerPro(){
    if(!this.isTrainerPro && !this.trainerInfo.organisation){
      this.modalService.showText(this.translate.instant('dashboard.trainer_pro_required'),this.translate.instant('dashboard.trainer_pro_required_title'),false,[
        {
          text: this.translate.instant('buttons.ok'),
          value: false,
          color: 'dark',
          fill:'outline'
        },
        {
          text: this.translate.instant('dashboard.upgrade'),
          value: 'upgrade',
          color: 'primary',
          fill:'solid'
        }
      ],true, (result:any) => {
        if(result?.data == 'upgrade'){
          this.nav.go('trainer/dashboard/upgrade')
        }
      })
      return false
    }
    else{
      return true
    }
  }

  getNameUser(email:string,training:any){
    // console.log('getNameUser',email,training)
    if(!training.participants || training.participants.length<1){
      return email
    }
    for (let i = 0; i < training.participants.length; i++) {
      if (training.participants[i].email == email) {
        return training.participants[i].displayName || training.participants[i].email
      }
    }
    return email
  }

  getCaseInfo(caseId:string,training:any){
    if(!training.trainingItems || training.trainingItems.length<1){
      return {}
    }
    for (let i = 0; i < training.trainingItems.length; i++) {
      if (training.trainingItems[i].id == caseId) {
        return training.trainingItems[i]
      }
    }
    return {}
  }

  organizeResults(results:any[],training:any){
    let organized:any = {
      by_user: {},
      by_case: {},
      summaries:[],
      users: [],
      cases: []
    }
    for(let i=0;i<results.length;i++){
      let result = results[i]
      if(result.user && !organized.by_user[result.user]){
        organized.by_user[result.user] = {
          user: result.user,
          displayName: this.getNameUser(result.user,training),
          results: [],
          summaries: []
        }
      }
      if(result.caseId && !organized.by_case[result.caseId]){
        organized.by_case[result.caseId] = {
          caseId: result.caseId,
          case: this.getCaseInfo(result.caseId, training),
          results: [],
          summaries: []
        }
      }
      if(result.user&&!result.summary){
        organized.by_user[result.user].results.push({
          ...result,
          displayName: result.user ? this.getNameUser(result.user, training) : '',
          case: result.caseId ? this.getCaseInfo(result.caseId, training) : null
        })

         organized.by_user[result.user].results.sort((a:any, b:any) => {
          return a.timestamp - b.timestamp;
        });
      }
      if(result.caseId&&!result.summary){
        organized.by_case[result.caseId].results.push({
          ...result,
          case: result.caseId ? this.getCaseInfo(result.caseId, training) : null,
          displayName: result.user ? this.getNameUser(result.user, training) : ''
        })
        organized.by_case[result.caseId].results.sort((a:any, b:any) => {
          return a.timestamp - b.timestamp;
        });
      }
      if(result.summary){
        organized.summaries.push(result)
        if(result.user){
          if(!organized.by_user[result.user]){
            organized.by_user[result.user] = {
              user: result.user,
              displayName: this.getNameUser(result.user, training),
              results: [],
              summaries: []
            }
          }
          organized.by_user[result.user].summaries.push(result)
          organized.by_user[result.user].summaries.sort((a:any, b:any) => {
            return a.timestamp - b.timestamp;
          });
        }
        if(result.caseId){
          if(!organized.by_case[result.caseId]){
            organized.by_case[result.caseId] = {
              caseId: result.caseId,
              case: this.getCaseInfo(result.caseId, training),
              results: [],
              summaries: []
            }
          }
          organized.by_case[result.caseId].summaries.push(result)
          organized.by_case[result.caseId].summaries.sort((a:any, b:any) => {
            return a.timestamp - b.timestamp;
          });
        }
      }
    }
    for(let user in organized.by_user){
      if(organized.by_user[user].results.length>0){
        organized.users.push(organized.by_user[user])
      }
    }
    for(let caseId in organized.by_case){
      if(organized.by_case[caseId].results.length>0){
        organized.cases.push(organized.by_case[caseId])
      }
    }

    if(organized.users?.length){
      try {
        organized.users.sort((a:any, b:any) => {
          return a.displayName.localeCompare(b.displayName);
        });
        organized.cases.sort((a:any, b:any) => {
          return a.case.title.localeCompare(b.case.title);
        });
      } catch (error) {
        // console.error('Error sorting organized data:', error);
      }
    }

    return organized
  }

  showTrainerDetails:boolean = false
  registerAsTrainer(addProCallback?:Function){
    this.modalService.inputFields(this.translate.instant('page_account.register_as_trainer_title'),this.translate.instant('page_account.register_as_trainer_text'),[
      {
        title:this.translate.instant('page_account.register_as_trainer_name'),
        type:'text',
        value:'',
        required:true,
      },
      {
        title:this.translate.instant('page_account.register_as_trainer_email'),
        type:'email',
        value:this.auth.userInfo.email,
        required:true,
      },
      {
        title:this.translate.instant('page_account.register_as_trainer_phone'),
        type:'text',
        value:'',
        required:true,
      },
      {
        title:this.translate.instant('page_account.register_as_trainer_expertise'),
        type:'text',
        value:'',
        required:false,
      },
      {
        title:this.translate.instant('page_account.register_as_trainer_rdpa_agree'),
        type:'checkbox',
        value:false,
        required:true,
      }
    ],(result:any)=>{
      if(result.data){
        this.toast.showLoader()
        this.functions.httpsCallable('createTrainer')({
          name: result.data[0].value,
          email: result.data[1].value,
          phone: result.data[2].value,
          expertise: result.data[3].value
        }).subscribe((response:any)=>{
          if(response.status==200){
            setTimeout(() => {
              this.auth.loadOrganisations(this.auth.userInfo.uid, (organisations:any)=>{
                if(organisations && organisations.length){
                  if(addProCallback){
                    addProCallback()
                  }
                  else{
                    this.toast.hideLoader()
                    this.nav.go('trainer/dashboard')
                  }
                  // this.toast.show(this.translate.instant('page_account.register_as_trainer_success'))
                }
              });
            }, 3000);
          }
          else{
            this.toast.hideLoader()
            this.toast.show(this.translate.instant('page_account.register_as_trainer_failure'))
          }
        })
      }
    })

  }

  registerAsTrainerPro(){

    if(!this.auth.organisations.length){
      this.registerAsTrainer((response:any)=>{
        if(response){
          this.registerAsTrainerPro()
        }
      })
    }
    else{

      let product = this.accountService.products_trainer.find((product:any)=>product.metadata?.level=='pro' && product.metadata?.type=='trainer')
      if(!product){
        this.toast.show(this.translate.instant('error_messages.failure'),4000,'middle')
        return
      }
      let metadata = {
        userId: this.auth.userInfo.uid,
        trainerId:this.nav.activeOrganisationId
      };
      product.organisationId = this.nav.activeOrganisationId;
      this.buy(product,metadata)
    }


  }

  registerAsTrainerEnterprise(){
    this.modalService.inputFields(this.translate.instant('dashboard.request_title'),this.translate.instant('page_account.request_new_organization_text'), [
      {
        type: 'textarea',
        title: '',
        text:'',
        value:'',
        required: true,
      }], (result: any) => {
        if(result?.data){
          this.toast.showLoader()
          this.functions.httpsCallable('requestForOrganization')({
            request: result.data[0].value
          }).subscribe((response:any)=>{
            this.toast.hideLoader()
            if(response?.status==200){
              this.toast.show(this.translate.instant('dashboard.request_send_success'),4000,'middle')
            }
            else {
              this.toast.show(this.translate.instant('error_messages.failure'),4000,'middle')
            }
          })
        }
      })
  }

  async buy(item: any,metadata?: any) {
    this.accountService.buyMultiple([item],metadata);
    return;
    const user = await this.auth.userInfo;
    if (!user) {
      console.error("User not authenticated");
      return;
    }
  
    this.toast.showLoader('Bezig met verwerking');
  
    if (item.credits) {
      localStorage.setItem('buying Credits', item.credits);
      localStorage.setItem('oldCredits', this.auth.credits.total);
    }
  
    let stripeId: any = '';
    if (this.auth.customer?.stripeCustomerId) {
      stripeId = this.auth.customer.stripeCustomerId;
    }
  
    if (!stripeId) {
      let newCustomer = await this.functions.httpsCallable('createCustomerId')({ email: user.email }).toPromise();
      stripeId = newCustomer.result?.stripeId;
    }
  
    if (!stripeId) {
      this.toast.hideLoader();
      this.toast.show('Error creating customer');
      return;
    }
    if(!metadata){
      metadata = {
        userId: user.uid
      };
    }
    let checkoutSessionData: any = {
      price: item.prices[0].id,
      success_url: window.location.origin + (item.metadata?.type == 'subscription' ? '/account/subscriptions/success' : '/account/credits/success'),
      cancel_url: window.location.origin + (item.metadata?.type == 'subscription' ? '/account/subscriptions/error' : '/account/credits/error'),
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      metadata: metadata,
      customer: stripeId
    };
  
    if (item.prices[0].type == 'one_time') {
      checkoutSessionData['mode'] = 'payment';
      checkoutSessionData['payment_intent_data'] = {
        setup_future_usage: 'off_session'
      };
      checkoutSessionData['invoice_creation'] = {
        enabled: true
      };
      
    } else {
      checkoutSessionData['mode'] = 'subscription';
    }
  
    console.log(checkoutSessionData);
  
    try {
      const checkoutSessionRef = this.fire.collection(`customers/${user.uid}/checkout_sessions`);
      const docRef = await checkoutSessionRef.add(checkoutSessionData);
  
      console.log("Checkout session created:", docRef.id);
  
      this.firestore.getDocListen(`customers/${user.uid}/checkout_sessions/`, docRef.id).subscribe((value: any) => {
        setTimeout(() => {
          this.toast.hideLoader();
        }, 2000);
  
        if (value.url) {
          window.location.assign(value.url);
        } else if (value.error) {
          console.error("Stripe error:", value.error);
        }
      });
  
    } catch (error) {
      console.error("Error creating checkout session:", error);
    }
  }

  async autoRenewal(type:boolean,setting:string='trainer'){
    let checked = false
    if(type===true){
      checked = true;
    }
    else if(type===false){
      await this.modalService.showConfirmation(this.translate.instant('page_account.not_auto_renewal_confirm')).then((response)=>{
        if(!response){
          return
        }
        else{
          checked = true
        }
      })
    }
    if(!checked){
      return
    }
    this.toast.showLoader()
    this.functions.httpsCallable('editAutoRenew')({autorenew:type,setting,trainerId:this.nav.activeOrganisationId}).subscribe((response:any)=>{
      console.log('editAutoRenew response',response)
      this.toast.hideLoader()
      if(response.status==200){
        if(type===false){
          this.toast.show(this.translate.instant('page_account.auto_renewal_disabled'),3000)
        }
        else{
          this.toast.show(this.translate.instant('page_account.auto_renewal_enabled'),3000)
        }
      }
      else{
        this.toast.show(this.translate.instant('error_messages.failure'),3000)
      }
    })
  }

  getTrainerSettings(id:string='trainer'){
    if(!this.trainerInfo || !this.trainerInfo.settings){
      return {}
    }
    for(let i = 0; i < this.trainerInfo.settings.length; i++) {
      if (this.trainerInfo.settings[i].id == id) {
        return this.trainerInfo.settings[i]
      }
    }
    return {}
  }

  checkForLoopModules(module:any,loopModules:any[] = []):boolean{
    if(!module?.items || !module.items.length){
      return false
    }
    for(let i=0;i<module.items.length;i++){
      let item = module.items[i]
      if(item.type == 'module'){
        if(loopModules.includes(item.id)){
          return true
        }
        else{
          loopModules.push(item.id)
          let found = this.getModule(item.id)
          if(this.checkForLoopModules(found,loopModules)){
            return true
          }
        }
      }
    }
    return false
  }

  purchaseItems(trainingId:string){
    if(!trainingId){
      return []
    }
    if(!this.trainerInfo?.purchaseItems || this.trainerInfo?.purchaseItems.length<1 ){
      return []
    }
    return this.trainerInfo.purchaseItems.filter((item:any) => item.trainingId == trainingId);
  }


  revenue_market:any = {all:{length:0,total:0,profit:0},paid:{length:0,total:0,profit:0},unpaid:{length:0,total:0,profit:0}};
  revenue_direct:any = {all:{length:0,total:0,profit:0},paid:{length:0,total:0,profit:0},unpaid:{length:0,total:0,profit:0}};
  revenue_markets:any = {}
  revenue_directs:any = {}
  costs_credits:any = {all:{length:0,total:0},paid:{length:0,total:0},unpaid:{length:0,total:0}};
  costs_credits_trainingItems:any = {}
  revenue(trainingId?:string){
    let revenue_market:any = {all:{length:0,total:0,profit:0},paid:{length:0,total:0,profit:0},unpaid:{length:0,total:0,profit:0}};
    let revenue_direct:any = {all:{length:0,total:0,profit:0},paid:{length:0,total:0,profit:0},unpaid:{length:0,total:0,profit:0}};
    let costs_credits:any = {all:{length:0,total:0,profit:0},paid:{length:0,total:0,profit:0},unpaid:{length:0,total:0,profit:0}};
    this.revenue_market = {all:{length:0,total:0,profit:0},paid:{length:0,total:0,profit:0},unpaid:{length:0,total:0,profit:0}};
    this.revenue_direct = {all:{length:0,total:0,profit:0},paid:{length:0,total:0,profit:0},unpaid:{length:0,total:0,profit:0}};
    this.costs_credits = {all:{length:0,total:0,profit:0},paid:{length:0,total:0,profit:0},unpaid:{length:0,total:0,profit:0}};
    this.revenue_markets = {}
    this.revenue_directs = {}
    this.costs_credits_trainingItems = {}

    let purchaseItems:any[] = []
    if(trainingId){
      purchaseItems = this.purchaseItems(trainingId);
    }
    else{
      purchaseItems = this.trainerInfo?.purchaseItems || [];
    }
    for(let item of purchaseItems){
      if(item.marketplace){
        let revenue_item:any = {all:{length:0,total:0,profit:0},paid:{length:0,total:0,profit:0},unpaid:{length:0,total:0,profit:0}};
        if(!item.price){
          item.price = 0
        }
        let price = parseFloat(item.price)
        if(isNaN(price)){
          price = 0
        }
        price = price / 1.21; // Exclude 21% VAT

        if(item.status === 'paid'){
          revenue_market.paid.length++;
          revenue_market.paid.total += price;
          // revenue_market.paid.with_tax = revenue_market.paid.total * 1.21; // 21% VAT
          // revenue_market.paid.tax = revenue_market.paid.with_tax - revenue_market.paid.total
          revenue_market.paid.profit = revenue_market.paid.total * (this.getTrainerSettings().margin_marketplace ? 1 - this.getTrainerSettings().margin_marketplace : 0.8); // 80% profit margin
          
          revenue_item.paid.length++;
          revenue_item.paid.total += price;
          revenue_item.paid.profit = revenue_item.paid.total * (this.getTrainerSettings().margin_marketplace ? 1 - this.getTrainerSettings().margin_marketplace : 0.8); // 80% profit margin
        }
        else{
          revenue_market.unpaid.length++;
          revenue_market.unpaid.total += price;
          // revenue_market.unpaid.with_tax = revenue_market.unpaid.total * 1.21; // 21% VAT
          // revenue_market.unpaid.tax = revenue_market.unpaid.with_tax - revenue_market.unpaid.total;
          revenue_market.unpaid.profit = revenue_market.unpaid.total * (this.getTrainerSettings().margin_marketplace ? 1 - this.getTrainerSettings().margin_marketplace : 0.8); // 80% profit margin
          revenue_item.unpaid.length++;
          revenue_item.unpaid.total += price;
          revenue_item.unpaid.profit = revenue_item.unpaid.total * (this.getTrainerSettings().margin_marketplace ? 1 - this.getTrainerSettings().margin_marketplace : 0.8); // 80% profit margin
        }
        revenue_market.all.length++;
        revenue_market.all.total += price;
        // revenue_market.all.with_tax = revenue_market.all.total * 1.21; // 21% VAT
        // revenue_market.all.tax = revenue_market.all.with_tax - revenue_market.all.total;
        revenue_market.all.profit = revenue_market.all.total * (this.getTrainerSettings().margin_marketplace ? 1 - this.getTrainerSettings().margin_marketplace : 0.8); // 80% profit margin
        revenue_item.all.length++;
        revenue_item.all.total += price;
        revenue_item.all.profit = revenue_item.all.total * (this.getTrainerSettings().margin_marketplace ? 1 - this.getTrainerSettings().margin_marketplace : 0.8); // 80% profit margin
        
        if(!this.revenue_markets[item.trainingId]){
          this.revenue_markets[item.trainingId] = revenue_item;
        }
        else{
          this.revenue_markets[item.trainingId].all.length = revenue_item.all.length + this.revenue_markets[item.trainingId].all.length;
          this.revenue_markets[item.trainingId].all.total = revenue_item.all.total + this.revenue_markets[item.trainingId].all.total;
          this.revenue_markets[item.trainingId].all.profit = revenue_item.all.profit + this.revenue_markets[item.trainingId].all.profit;
          this.revenue_markets[item.trainingId].paid.length = revenue_item.paid.length + this.revenue_markets[item.trainingId].paid.length;
          this.revenue_markets[item.trainingId].paid.total = revenue_item.paid.total + this.revenue_markets[item.trainingId].paid.total;
          this.revenue_markets[item.trainingId].paid.profit = revenue_item.paid.profit + this.revenue_markets[item.trainingId].paid.profit;
          this.revenue_markets[item.trainingId].unpaid.length = revenue_item.unpaid.length + this.revenue_markets[item.trainingId].unpaid.length;
          this.revenue_markets[item.trainingId].unpaid.total = revenue_item.unpaid.total + this.revenue_markets[item.trainingId].unpaid.total;
          this.revenue_markets[item.trainingId].unpaid.profit = revenue_item.unpaid.profit + this.revenue_markets[item.trainingId].unpaid.profit;
        }

        this.revenue_directs[item.trainingId] = {all:{length:0,total:0,profit:0},paid:{length:0,total:0,profit:0},unpaid:{length:0,total:0,profit:0}};
        this.costs_credits_trainingItems[item.trainingId] = {all:{length:0,total:0,profit:0},paid:{length:0,total:0,profit:0},unpaid:{length:0,total:0,profit:0}};
      }
      else if(item.direct){
        let revenue_direct_item:any = {all:{length:0,total:0,profit:0},paid:{length:0,total:0,profit:0},unpaid:{length:0,total:0,profit:0}};
        if(!item.price){
          item.price = 0
        }
        let price = parseFloat(item.prices?.trainingPrice || 0)
        if(isNaN(price)){
          price = 0
        }
        // price = price / 1.21; // dit is al excl VAT

        if(item.status === 'paid'){
          revenue_direct.paid.length++;
          revenue_direct.paid.total += price;
          // revenue_direct.paid.with_tax = revenue_direct.paid.total * 1.21; // 21% VAT
          // revenue_direct.paid.tax = revenue_direct.paid.with_tax - revenue_direct.paid.total
          revenue_direct.paid.profit = revenue_direct.paid.total * 0.95; // 95% profit margin

          revenue_direct_item.paid.length++;
          revenue_direct_item.paid.total += price;
          revenue_direct_item.paid.profit = revenue_direct_item.paid.total * 0.95; // 95% profit margin
        }
        else{
          revenue_direct.unpaid.length++;
          revenue_direct.unpaid.total += price;
          // revenue_direct.unpaid.with_tax = revenue_direct.unpaid.total * 1.21; // 21% VAT
          // revenue_market.unpaid.tax = revenue_market.unpaid.with_tax - revenue_market.unpaid.total;
          revenue_direct.unpaid.profit = revenue_direct.unpaid.total * 0.95; // 95% profit margin
          revenue_direct_item.unpaid.length++;
          revenue_direct_item.unpaid.total += price;
          revenue_direct_item.unpaid.profit = revenue_direct_item.unpaid.total * 0.95; // 95% profit margin
        }
        revenue_direct.all.length++;
        revenue_direct.all.total += price;
        // revenue_market.all.with_tax = revenue_market.all.total * 1.21; // 21% VAT
        // revenue_market.all.tax = revenue_market.all.with_tax - revenue_market.all.total;
        revenue_direct.all.profit = revenue_direct.all.total * 0.95; // 95% profit margin
        revenue_direct_item.all.length++;
        revenue_direct_item.all.total += price;
        revenue_direct_item.all.profit = revenue_direct_item.all.total * 0.95; // 95% profit margin

        if(!this.revenue_directs[item.trainingId]){
          this.revenue_directs[item.trainingId] = revenue_direct_item;
        }
        else{
          this.revenue_directs[item.trainingId].all.length = revenue_direct_item.all.length + this.revenue_directs[item.trainingId].all.length
          this.revenue_directs[item.trainingId].all.total = revenue_direct_item.all.total + this.revenue_directs[item.trainingId].all.total
          this.revenue_directs[item.trainingId].all.profit = revenue_direct_item.all.profit + this.revenue_directs[item.trainingId].all.profit
          this.revenue_directs[item.trainingId].paid.length = revenue_direct_item.paid.length + this.revenue_directs[item.trainingId].paid.length
          this.revenue_directs[item.trainingId].paid.total = revenue_direct_item.paid.total + this.revenue_directs[item.trainingId].paid.total
          this.revenue_directs[item.trainingId].paid.profit = revenue_direct_item.paid.profit + this.revenue_directs[item.trainingId].paid.profit
          this.revenue_directs[item.trainingId].unpaid.length = revenue_direct_item.unpaid.length + this.revenue_directs[item.trainingId].unpaid.length
          this.revenue_directs[item.trainingId].unpaid.total = revenue_direct_item.unpaid.total + this.revenue_directs[item.trainingId].unpaid.total
          this.revenue_directs[item.trainingId].unpaid.profit = revenue_direct_item.unpaid.profit + this.revenue_directs[item.trainingId].unpaid.profit
        }
        this.revenue_markets[item.trainingId] = {all:{length:0,total:0,profit:0},paid:{length:0,total:0,profit:0},unpaid:{length:0,total:0,profit:0}};
        this.costs_credits_trainingItems[item.trainingId] = {all:{length:0,total:0,profit:0},paid:{length:0,total:0,profit:0},unpaid:{length:0,total:0,profit:0}};
      }
      else if(item.marketplace===false){
        let costs_credits_item:any = {all:{length:0,total:0,profit:0},paid:{length:0,total:0,profit:0},unpaid:{length:0,total:0,profit:0}};
        if(!item.credits){
          item.credits = 0
        }
        let credits = parseInt(item.credits)
        if(isNaN(credits)){
          credits = 0
        }
        let price = this.creditsPackagesPricing[credits] || 0;
        if(isNaN(price)){
          price = 0
        }
        if(item.status === 'paid'){
          costs_credits.paid.length++;
          costs_credits.paid.total += price;

          costs_credits_item.paid.length++;
          costs_credits_item.paid.total += price;
        }
        else{
          costs_credits.unpaid.length++;
          costs_credits.unpaid.total += price;

          costs_credits_item.unpaid.length++;
          costs_credits_item.unpaid.total += price;
        }
        costs_credits.all.length++;
        costs_credits.all.total += price;

        costs_credits_item.all.length++;
        costs_credits_item.all.total += price;

        if(!this.costs_credits_trainingItems[item.trainingId]){
          this.costs_credits_trainingItems[item.trainingId] = costs_credits_item;
        }
        else{
          this.costs_credits_trainingItems[item.trainingId].all.length = costs_credits_item.all.length + this.costs_credits_trainingItems[item.trainingId].all.length
          this.costs_credits_trainingItems[item.trainingId].all.total = costs_credits_item.all.total + this.costs_credits_trainingItems[item.trainingId].all.total
          this.costs_credits_trainingItems[item.trainingId].paid.length = costs_credits_item.paid.length + this.costs_credits_trainingItems[item.trainingId].paid.length
          this.costs_credits_trainingItems[item.trainingId].paid.total = costs_credits_item.paid.total + this.costs_credits_trainingItems[item.trainingId].paid.total
          this.costs_credits_trainingItems[item.trainingId].unpaid.length = costs_credits_item.unpaid.length + this.costs_credits_trainingItems[item.trainingId].unpaid.length
          this.costs_credits_trainingItems[item.trainingId].unpaid.total = costs_credits_item.unpaid.total + this.costs_credits_trainingItems[item.trainingId].unpaid.total
        }

        this.revenue_markets[item.trainingId] = {all:{length:0,total:0,profit:0},paid:{length:0,total:0,profit:0},unpaid:{length:0,total:0,profit:0}};
        this.revenue_directs[item.trainingId] = {all:{length:0,total:0,profit:0},paid:{length:0,total:0,profit:0},unpaid:{length:0,total:0,profit:0}};

      }


    }
    revenue_market.margin_alicialabs = (this.getTrainerSettings().margin_marketplace ? this.getTrainerSettings().margin_marketplace : 0.2) * 100

    this.revenue_market = revenue_market;
    this.revenue_direct = revenue_direct;
    this.costs_credits = costs_credits;
  }

  validInvoiceAddress(invoice?:any): boolean {
    if(!invoice){
      invoice = this.trainerInfo?.invoice;
    }
    if(!invoice || !invoice.name || !invoice.vat_number || !invoice.address || !invoice.city || !invoice.zip || !invoice.country || !invoice.email || !this.helper.validEmail(invoice.email) || !invoice.reference){
      return false;
    }
    return true;
  }


  validBank(bank_account?:any): boolean {
    if(!bank_account){
      bank_account = this.trainerInfo?.bank_account;
    }
    if(!bank_account || !bank_account.name || !bank_account.iban || !this.validIban(bank_account.iban) || !bank_account.bic){
      return false
    }
    return true
  }

  validIban(iban: string): boolean {
    if(!iban || typeof iban !== 'string') return false;
    const trimmed = iban.replace(/\s+/g, '').toUpperCase();

    // Basiscontrole: lengte tussen 15 en 34
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(trimmed)) return false;

    const rearranged = trimmed.slice(4) + trimmed.slice(0, 4);

    const converted = rearranged
      .split('')
      .map(char => {
        const code = char.charCodeAt(0);
        return code >= 65 && code <= 90 ? (code - 55).toString() : char;
      })
      .join('');

    let remainder = converted;
    while (remainder.length > 2) {
      const block = remainder.slice(0, 9);
      remainder = (parseInt(block, 10) % 97).toString() + remainder.slice(block.length);
    }

    return parseInt(remainder, 10) % 97 === 1;
  }

  requestPayout(){
    if(!this.validBank()){
      this.toast.show(this.translate.instant('marketplace.bank_account_required'), 4000, 'middle');
      return
    }
    this.modalService.showConfirmation(this.translate.instant('marketplace.request_payout_verify')).then(async (result:any) => {
      if(result){
       this.firestore.create('user_messages',{
            type:'payout_request',
            subject:'Please process my payout request',
            message:'I would like to request a payout for my earnings as a trainer (' + this.trainerInfo.name + '). My TrainerId is: ' + this.nav.activeOrganisationId+'<br><br>Thank you!<br><br>Kind regards,<br>'+this.auth.userInfo.displayName +'<br>'+this.auth.userInfo.email,
            user:this.auth.userInfo.uid,
            displayName:this.auth.userInfo.displayName,
            email:this.auth.userInfo.email,
            date:new Date(),
            timestamp:new Date().getTime(),
            read:false,
            archived:false,
            url:window.location.href
          })
          this.toast.show(this.translate.instant('marketplace.payout_request_sent'), 4000, 'middle');
        }
      })
  }
  
}
