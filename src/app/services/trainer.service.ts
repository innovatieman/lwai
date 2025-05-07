import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { FirestoreService } from './firestore.service';
import { AuthService } from '../auth/auth.service';
import { InfoService } from './info.service';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { combineLatest, map, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TrainerService {
  cases: any[] = []
  isTrainer: boolean = false
  casesLoaded: boolean = false
  modules: any[] = []
  trainings: any[] = []
  caseItem: any = {}
  moduleItem: any = {}
  trainerInfo: any = {}
  infoItems: any[] = []
  infoItem: any = {}
  trainingItem: any = {}
  breadCrumbs:any[] = []
  constructor(
    private functions: AngularFireFunctions,
    private fire: AngularFirestore,
    private auth: AuthService,
    private firestore: FirestoreService,
    private translate: TranslateService,
    private infoService: InfoService,
  ) { 
    this.loadTrainerInfo();
    this.auth.userInfo$.subscribe(userInfo => {
      if (userInfo) {
        this.isTrainer = userInfo.isTrainer;
        this.auth.hasActive('trainer').subscribe((trainer)=>{
          this.isTrainer = trainer
          this.loadTrainerInfo();
        })
      }
    })
  }

  loadTrainerInfo(){
    this.fire.collection('trainers').doc(this.auth.userInfo.uid)
      .get()
      .subscribe((doc) => {
        if (doc.exists) {
          // console.log("exists")
          this.trainerInfo = doc.data();
        } else {
          console.log("No such document!");
        }
      });
  }

  loadCases(callback?:Function) {
      const currentLang = this.translate.currentLang || 'en';
      // Query voor cases die toegankelijk zijn voor de gebruiker
      this.fire.collection('trainers').doc(this.auth.userInfo.uid)
        .collection('cases')
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
                this.fire.collection('trainers').doc(this.auth.userInfo.uid)
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
          this.cases = cases.map(doc => ({
            ...doc,
          }));
          if (callback) {
            callback();
          }
        });
  }

  loadInfoItems(callback?:Function) {
    this.fire.collection('trainers').doc(this.auth.userInfo.uid)
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
      .subscribe(infoItems => {
        this.infoItems = infoItems.map(doc => ({
          ...doc,
        }));
        if (callback) {
          callback();
        }
      });
  }

  getInfoItem(id:string){
    for (let i = 0; i < this.infoItems.length; i++) {
      if (this.infoItems[i].id == id) {
        return this.infoItems[i]
      }
    }
    return null
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
        }
      }
    }
  }

  defaultInfoItem(){
    return {
      created:Date.now(),
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

  loadModules(callback?:Function) {
    this.fire.collection('trainers').doc(this.auth.userInfo.uid)
      .collection('modules')
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
      .subscribe(modules => {
        this.modules = modules.map(doc => ({
          ...doc,
        }));
        if(this.moduleItem.id){
          for (let i = 0; i < this.modules.length; i++) {
            if (this.modules[i].id == this.moduleItem.id) {
              this.moduleItem = JSON.parse(JSON.stringify(this.modules[i]))
            }
          }
        }
        console.log(this.modules)
        if (callback) {
          callback();
        }
      });
  }

  loadTrainings(callback?:Function) {
    this.fire.collection('trainers').doc(this.auth.userInfo.uid)
      .collection('trainings')
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
      .subscribe(trainings => {
        this.trainings = trainings.map(doc => ({
          ...doc,
        }));
        if(this.trainingItem.id){
          for (let i = 0; i < this.trainings.length; i++) {
            if (this.trainings[i].id == this.trainingItem.id) {
              this.trainingItem = JSON.parse(JSON.stringify(this.modules[i]))
            }
          }
        }
        if (callback) {
          callback();
        }
      });
  }

  //Loadmodules and participants from subcollection
  loadTrainingsAndParticipants(callback?:Function) {
    this.fire.collection('trainers').doc(this.auth.userInfo.uid)
      .collection('trainings')
      .snapshotChanges()
      .pipe(
        // Map documenten naar objecten
        map(docs =>
          docs.map((e: any) => ({
            id: e.payload.doc.id,
            ...e.payload.doc.data(),
          }))
        ),
        // Haal deelnemers op voor elke module
        switchMap(modules =>
          combineLatest(
            modules.map(doc =>
              this.fire.collection('trainers').doc(this.auth.userInfo.uid)
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
        )
      )
      .subscribe(trainings => {
        this.trainings = trainings.map(doc => ({
          ...doc,
        }));
        if (callback) {
          console.log(this.trainings)
          callback();
        }
      });
  }

  getModule(id:string){
    for (let i = 0; i < this.modules.length; i++) {
      if (this.modules[i].id == id) {
        return this.modules[i]
      }
    }
    return null
  }
  getTraining(id:string,created?:number){
    if(id){

      for (let i = 0; i < this.trainings.length; i++) {
        if (this.trainings[i].id == id) {
          return this.trainings[i]
        }
      }
    }
    if(created){
      for (let i = 0; i < this.trainings.length; i++) {
        if (this.trainings[i].created == created) {
          return this.trainings[i]
        }
      }
    }
    return null
  }

  getCase(id:string){
    for (let i = 0; i < this.cases.length; i++) {
      if (this.cases[i].id == id) {
        return this.cases[i]
      }
    }
    return null
  }

}
