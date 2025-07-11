import { ChangeDetectorRef, EventEmitter, Injectable, Output, output } from '@angular/core';
import { combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService } from '../auth/auth.service';
import { FirestoreService } from './firestore.service';
import { TranslateService } from '@ngx-translate/core';
import { InfoService } from './info.service';
import { NavService } from './nav.service';

@Injectable({
  providedIn: 'root'
})
export class CasesService {
  @Output()  casesLoaded:EventEmitter<boolean> = new EventEmitter()
  selectedType:any = undefined
  all:any[] = []
  isAdmin:boolean = false
  suggestions:any[] = []
  constructor(
    private fire:AngularFirestore,
    private auth:AuthService,
    private firestore: FirestoreService,
    private translate: TranslateService,
    private infoService: InfoService,
    private nav:NavService,
  ) { 
    this.auth.isAdmin().subscribe((admin) => {
      this.isAdmin = admin;
    });
    this.loadCases(()=>{
      let checkInt = setInterval(() => {
        if(this.infoService.conversation_types.length){
          clearInterval(checkInt)
          for(let i = 0; i < this.all.length; i++){
            this.all[i].conversationTypes = this.infoService.getConversationType('',this.all[i].types,true)
          }
          this.casesLoaded.emit(true)
        }
      }, 200);
    })

    this.nav.changeNav.subscribe((res)=>{
      console.log('changeNav',res)
      this.all = []
      this.loadCases(()=>{
        let checkInt = setInterval(() => {
          if(this.infoService.conversation_types.length){
            clearInterval(checkInt)
            for(let i = 0; i < this.all.length; i++){
              this.all[i].conversationTypes = this.infoService.getConversationType('',this.all[i].types,true)
            }
          }
        }, 200);
        console.log(this.all)
        setTimeout(() => {
          this.all = JSON.parse(JSON.stringify(this.all))
        }, 200);
      })
    })
  }

  get conversations(){
    let arr:any[] = []
    this.all.forEach((e:any) => {
      if(arr.indexOf(e.conversation) === -1){
        arr.push(e.conversation)
      }
    })
    return arr
  }

  single(id:string){
    let caseArr = this.all.filter((e:any) => {
      return e.id === id
    })
    return caseArr[0]
  }

  reloadCases(){
    this.all = []
    this.loadCases(()=>{
      let checkInt = setInterval(() => {
        if(this.infoService.conversation_types.length){
          clearInterval(checkInt)
          for(let i = 0; i < this.all.length; i++){
            this.all[i].conversationTypes = this.infoService.getConversationType('',this.all[i].types,true)
          }
        }
      }, 200);
      console.log(this.all)
      setTimeout(() => {
        this.all = JSON.parse(JSON.stringify(this.all))
      }, 200);
    })
  }

  // loadCases() {
  //   const userQuery = this.fire.collection('cases', ref => ref.where('open_to_user', '==', true)).snapshotChanges();
  //   const publicQuery = this.fire.collection('cases', ref => ref.where('open_to_public', '==', true)).snapshotChanges();
  
  //   let adminQuery = of([] as any[]);
  
  //   if (this.isAdmin) {
  //     adminQuery = this.fire.collection('cases', ref => ref.where('title', '!=', '')).snapshotChanges();
  //   }
  
  //   // Combineer alle observables
  //   combineLatest([userQuery, publicQuery, adminQuery])
  //     .pipe(
  //       map(([userDocs, publicDocs, adminDocs]) => {
  //         const allDocs = [...userDocs, ...publicDocs, ...adminDocs];
  
  //         // Filter dubbele documenten op ID
  //         const uniqueDocs = allDocs.reduce((acc: any[], current) => {
  //           if (!acc.some((doc:any) => doc.payload.doc.id === current.payload.doc.id)) {
  //             acc.push(current);
  //           }
  //           return acc;
  //         }, []);
  
  //         return uniqueDocs.map((e:any) => ({
  //           id: e.payload.doc.id,
  //           ...e.payload.doc.data(),
  //         }));
  //       })
  //     )
  //     .subscribe(docs => {
  //       this.all = docs;
  //     });
  // }


  loadCases(callback?:Function) {
    const currentLang = this.translate.currentLang || 'en';
    // Query voor cases die toegankelijk zijn voor de gebruiker
    this.fire
      .collection('cases', ref => ref.where('open_to_user', '==', true))
      .snapshotChanges()
      .pipe(
        // Map documenten naar objecten
        map(docs =>
          docs.map((e: any) => ({
            id: e.payload.doc.id,
            ...e.payload.doc.data(),
          }))
        ),
        // Haal vertalingen op voor de huidige taal
        switchMap(cases =>
          combineLatest(
            cases.map(doc =>
              this.fire
                .collection(`cases/${doc.id}/translations`)
                .doc(currentLang)
                .get()
                .pipe(
                  map(translationDoc => ({
                    ...doc,
                    translation: translationDoc.exists ? translationDoc.data() : null,
                  }))
                )
            )
          )
        )
      )
      .subscribe(cases => {
        // Combineer hoofdgegevens en vertalingen
        this.all = cases.map(doc => ({
          ...doc,
          title: doc.translation?.title || doc.title,
          user_info: doc.translation?.user_info || doc.user_info,
          casus: doc.translation?.casus || doc.casus,
          openingMessage: doc.translation?.openingMessage || doc.openingMessage,
          goalsItem: doc.translation?.goalsItem || doc.goalsItem,
          level_explanation: doc.translation?.level_explanation || doc.level_explanation,
          free_question: doc.translation?.free_question || doc.free_question || '',
          free_question2: doc.translation?.free_question2 || doc.free_question2 || '',
          free_question3: doc.translation?.free_question3 || doc.free_question3 || '',
          free_question4: doc.translation?.free_question4 || doc.free_question4 || '',
        }));
        if (callback) {
          callback();
        }
      });
      // setTimeout(() => {
      //   console.log(this.all)
      // }, 3000);
  }

  query(collection:string,where:string,key:any,operator?:any){
    if(!operator){
      operator='=='
    }
    return this.fire.collection(collection,ref => ref.where(where,operator,key)).snapshotChanges()
  }

  defaultCase(conversationType:string,openingMessage:string){
    return {
      created:Date.now(),
      conversation:conversationType,
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
      openingMessage:openingMessage,
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
        }
      }
    }
  }
}
