import { EventEmitter, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { FirestoreService } from './firestore.service';
import { AuthService } from '../auth/auth.service';
import { InfoService } from './info.service';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { combineLatest, map, switchMap, defaultIfEmpty } from 'rxjs';
import { ModalService } from './modal.service';
import { id } from '@swimlane/ngx-datatable';
import { NavService } from './nav.service';
import { color } from 'highcharts';

@Injectable({
  providedIn: 'root'
})
export class TrainerService {
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
  constructor(
    private functions: AngularFireFunctions,
    private fire: AngularFirestore,
    private auth: AuthService,
    private firestore: FirestoreService,
    private translate: TranslateService,
    private infoService: InfoService,
    private modalService: ModalService,
    private nav:NavService
  ) { 
    this.auth.userInfo$.subscribe(userInfo => {
      if (userInfo) {
        this.isTrainer = userInfo.isTrainer;
        this.auth.hasActive('trainer').subscribe((trainer)=>{
          this.loadTrainerInfo();
          this.isTrainer = trainer
        })
        
      }
    })
    this.nav.organisationChange.subscribe((res)=>{      
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
      });
    })
  }

  loadTrainerInfo(callback?:Function,unsubscribe?:boolean) {
    if(!this.nav.activeOrganisationId){
      this.trainerInfo = {}
      return
    }
    let trainerSubscription = this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
      .get()
      .subscribe((doc) => {
        if (doc.exists) {
          // console.log("exists")
          this.trainerInfo = doc.data();
          // get employees from subcollection
          this.trainerInfo.id = doc.id
          this.trainerInfo.employees = []
          this.trainerInfo.settings = []
          // this.isTrainerPro = this.trainerInfo.trainerPro == true
          this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
            .collection('employees')
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
            .subscribe(employees => {
              this.trainerInfo.employees = employees.map(doc => ({
                ...doc,
              }));
              if (callback) {
                callback();
              }
            });
          this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
            .collection('settings')
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
            .subscribe(settings => {
              this.trainerInfo.settings = settings.map(doc => ({
                ...doc,
                id: doc.id || '',
              }));
              if (this.trainerInfo.settings && this.trainerInfo.settings.length>0) {
                for (let i = 0; i < this.trainerInfo.settings.length; i++) {
                  if(this.trainerInfo.settings[i].trainerPro){
                    this.isTrainerPro = this.trainerInfo.settings[i].trainerPro == true
                    // console.log('isTrainerPro',this.isTrainerPro,this.trainerInfo.settings[i])
                  }
                  if(this.trainerInfo.settings[i].affiliate){
                    this.trainerInfo.affiliate = this.trainerInfo.settings[i].affiliate
                  }
                }
              }
              if (callback) {
                callback();
              }
            });
          this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
            .collection('knowledge')
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
            .subscribe(knowledgeItems => {
              this.trainerInfo.knowledgeItems = knowledgeItems.map(doc => ({
                ...doc,
              }));
            });
            if (this.trainerInfo.affiliate) {
              this.getAffiliates();
            }
            if (this.trainerInfo.organisation) {
              this.publishType = 'organisation';
            }

        } else {
          // console.log("No such document!");
        }
      });
      if(unsubscribe){
        setTimeout(() => {
          trainerSubscription.unsubscribe();
        }, 300);
      }

  }

  getAffiliates(){
    if(this.affiliateLoaded){
      return
    }
    this.affiliateLoaded = true
    this.functions.httpsCallable('myAffiliates')({}).subscribe((res:any) => {
      console.log('res',res)
      if(res && res.result){
        this.affiliates = res.result
        console.log('affiliates',this.affiliates)
      }
    })
  }

  loadCases(callback?:Function) {
      const currentLang = this.translate.currentLang || 'en';
      // Query voor cases die toegankelijk zijn voor de gebruiker
      this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
        .collection('cases')
        .snapshotChanges()
        .pipe(
          // Map documenten naar objecten
          map(docs =>
            docs.map((e: any) => ({
              ...e.payload.doc.data(),
              id: e.payload.doc.id,
            }))
          ),
          // Haal vertalingen op voor de huidige taal
          switchMap(cases =>
            combineLatest(
              cases.map(doc =>
                this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
                  .collection(`cases/${doc.id}/translations`)
                  .doc(currentLang)
                  .get()
                  .pipe(
                    map(translationDoc => ({
                      ...doc,
                      id: doc.id,
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
            id: doc.id,
          }));
          if (callback) {
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
      .subscribe(infoItems => {
        this.infoItems = infoItems.map(doc => ({
          ...doc,
        }));
        if (callback) {
          callback();
        }
        if(unsubscribe){
          this.subscriptions['loadInfoItems'].unsubscribe();
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

  loadModules(callback?:Function) {
    this.subscriptions['loadmodules'] = this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
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
        // console.log(this.modules)
        if (callback) {
          callback();
        }
      });
  }

  loadTrainings(callback?:Function) {
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
        // Haal deelnemers op voor elke module
        switchMap(modules =>
          combineLatest(
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
        switchMap(modules =>
          combineLatest(
            modules.map(doc =>
              this.fire.collection('trainers').doc(this.nav.activeOrganisationId)
                .collection('trainings')
                .doc(doc.id)
                .collection('items')
                .snapshotChanges()
                .pipe(
                  map(itemsDocs =>
                    itemsDocs.map((e: any) => ({
                      id: e.payload.doc.id,
                      ...e.payload.doc.data(),
                    }))
                  ),
                  map(trainingItems => ({
                    ...doc,
                    trainingItems: trainingItems,
                  }))
                )
            )
          )
        ),
        switchMap(modules =>
          combineLatest(
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
          combineLatest(
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
        if (callback) {
          if(this.breadCrumbs.length>0){
            let tr = this.getTraining(this.breadCrumbs[0].item.id)
            if(tr && tr.participants){
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
    // console.log('getTraining',id,created)
    if(id){

      for (let i = 0; i < this.trainings.length; i++) {
        if (this.trainings[i].id == id) {
          if(this.trainings[i].results && this.trainings[i].results.length>0){
            this.trainings[i].organizedResults = this.organizeResults(this.trainings[i].results,this.trainings[i])
          }
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

  getItemTraining(id:string,trainingId:string){
    for (let t = 0; t < this.trainings.length; t++) {
      if (this.trainings[t].id == trainingId) {
        if(this.trainings[t].trainingItems){
          for (let i = 0; i < this.trainings[t].trainingItems.length; i++) {
            if (this.trainings[t].trainingItems[i].id == id) {
              return this.trainings[t].trainingItems[i]
            }
          }
        }
      }
    }
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
    costs.extraCostsPerConversation = 2
    costs.extraPeriodCosts = 0
    if(trainingItem.type_credits != 'credits'){
      costs.extraCosts = 10 * trainingItem.amount_participants
      costs.extraCostsPerConversation = 0
      costs.extraConversations = 0
    }
    else{
      // costs.extraCosts = (trainingItem.amount_participants * trainingItem.expected_conversations) - 10
      if(costs.extraCosts < 0){
        costs.extraCosts = 0
      }
      costs.unlimitedCosts = 0
      costs.extraConversations = (trainingItem.amount_participants * trainingItem.expected_conversations) - 10
      if(costs.extraConversations < 0){
        costs.extraConversations = 0
      }
      costs.extraCosts = costs.extraConversations * costs.extraCostsPerConversation
    }

    if(trainingItem.type_credits!='credits' && trainingItem.amount_period>2){
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
    if(trainingItem.type_credits != 'credits'){
      costs.extraCosts = 10 * extraCostsOptions.amount_participants
      costs.extraCostsPerConversation = 0
      costs.extraConversations = 0
    }
    else{
      // costs.extraCosts = (trainingItem.amount_participants * trainingItem.expected_conversations) - 10
      if(costs.extraCosts < 0){
        costs.extraCosts = 0
      }
      costs.unlimitedCosts = 0
      if(extraCostsOptions.expected_conversations<1 && extraCostsOptions.amount_participants<1){
        costs.extraConversations = 0
      }
      else if(extraCostsOptions.expected_conversations<1){
        costs.extraConversations = (extraCostsOptions.amount_participants * trainingItem.expected_conversations)
      }
      else if(extraCostsOptions.amount_participants<1){
        costs.extraConversations = (trainingItem.amount_participants * extraCostsOptions.expected_conversations)
      }
      else{
        costs.extraConversations = ((trainingItem.amount_participants + extraCostsOptions.amount_participants) * (extraCostsOptions.expected_conversations + trainingItem.expected_conversations)) - (trainingItem.amount_participants * trainingItem.expected_conversations)
      }
      costs.extraCosts = costs.extraConversations * costs.extraCostsPerConversation
    }

    if(trainingItem.type_credits!='credits' && extraCostsOptions.amount_period){
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
}
