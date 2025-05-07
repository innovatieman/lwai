import { Component, OnInit, ViewChild } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { IonInfiniteScroll, IonSelect, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { combineLatest, map, Subscription, switchMap } from 'rxjs';
import { MenuPage } from 'src/app/components/menu/menu.page';
import { BackupService } from 'src/app/services/backup.service';
import { CasesService } from 'src/app/services/cases.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { InfoService } from 'src/app/services/info.service';
import { LevelsService } from 'src/app/services/levels.service';
import { MediaService } from 'src/app/services/media.service';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';
import { SelectMenuService } from 'src/app/services/select-menu.service';
import { ToastService } from 'src/app/services/toast.service';
import { HttpClient } from '@angular/common/http';
import { AuthService } from 'src/app/auth/auth.service';
import { CaseFilterPipe } from 'src/app/pipes/case-filter.pipe';
import { FilterSearchPipe } from 'src/app/pipes/filter-search.pipe';
import { FilterKeyPipe } from 'src/app/pipes/filter-key.pipe';
import { ColumnMode, TableColumn } from '@swimlane/ngx-datatable';

@Component({
  selector: 'app-cases',
  templateUrl: './cases.page.html',
  styleUrls: ['./cases.page.scss'],
})
export class CasesPage implements OnInit {
  // @ViewChild('selectNew', { static: false }) selectNew!: IonSelect;
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;
  activeTab: number = 0;
  cases: any[] = []
  caseItem: any = {}
  categories: any[] = []
  categoriesList: any[] = []
  // newConversation: string = ''
  showBackups:boolean = false
  backupDate: number = 0
  extraFilters: any = {
    open_to_user: [true],
    photo:[],
    free_question:[],
  }
  searchTerm: string = '';
  images: any[] = []
  maxCases: number = 15;
  view: string = 'cards';

  listSortBy = 'conversation'
  listOrder = -1

  showBasics: boolean = false;
  showUserInput: boolean = false;
  showUserInputMore: boolean = true;
  showCasus: boolean = false;
  showUserOptions: boolean = false;

  constructor(
    public firestore:FirestoreService,
    private fire:AngularFirestore,
    public icon:IconsService,
    public modalService:ModalService,
    public backupService:BackupService,
    public helpers:HelpersService,
    public translate:TranslateService,
    public infoService:InfoService,
    private popoverController:PopoverController,
    private selectMenuservice:SelectMenuService,
    public media:MediaService,
    private casesService:CasesService,
    public nav:NavService,
    private toast:ToastService,
    public levelService:LevelsService,
    private http: HttpClient,
    private auth:AuthService,
    private caseFilterPipe: CaseFilterPipe,
    private filterSearchPipe: FilterSearchPipe,
    private filterKeyPipe: FilterKeyPipe,

  ) { }


  ngOnInit() {
    this.addUseCase()
    
    if(this.view=='list'){
      this.maxCases = 50
    }
    this.loadCases(()=>{
      let checkInt = setInterval(() => {
        if(this.infoService.conversation_types.length){
          clearInterval(checkInt)
          for(let i = 0; i < this.cases.length; i++){
            this.cases[i].conversationTypes = this.infoService.getConversationType('',this.cases[i].types,true)
          }
        }
        this.updateVisibleCases();
      }, 200);
    })
    this.loadImages()

    this.nav.changeNav.subscribe((res)=>{
      console.log('changeNav',res)
      this.loadCases(()=>{
        let checkInt = setInterval(() => {
          if(this.infoService.conversation_types.length){
            clearInterval(checkInt)
            for(let i = 0; i < this.cases.length; i++){
              this.cases[i].conversationTypes = this.infoService.getConversationType('',this.cases[i].types,true)
            }
          }
        }, 200);
      })
    })

    this.nav.changeLang.subscribe((res)=>{
      this.updateVisibleCases();
    })


    this.loadCategories()
    setTimeout(() => {
      this.getOpeningMessages()
    }, 4000);

  }



  // private loadCases(callback?:Function) {
  //   this.firestore.get('cases').subscribe((cases) => {
  //     this.cases = cases.map((casus:any) => {
  //       if(this.caseItem.id === 
  //         casus.payload.doc.id){
  //         this.caseItem = { id: casus.payload.doc.id, ...casus.payload.doc.data() }
  //       }
  //       return { id: casus.payload.doc.id, ...casus.payload.doc.data() }
  //     })
  //     if(callback) callback()
  //   })
  // }


  loadCases(callback?:Function) {
      const currentLang = this.translate.currentLang || 'en';
      // Query voor cases die toegankelijk zijn voor de gebruiker
      this.fire
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
          this.cases = cases.map(doc => ({
            ...doc,
            title: doc.translation?.title || doc.title,
            user_info: doc.translation?.user_info || doc.user_info,
            casus: doc.translation?.casus || doc.casus,
            openingMessage: doc.translation?.openingMessage || doc.openingMessage,
            goalsItem: doc.translation?.goalsItem || doc.goalsItem,
            level_explanation: doc.translation?.level_explanation || doc.level_explanation,
            role: doc.translation?.role || doc.role,
          }));
          // if(this.caseItem.id){
          //   this.caseItem = this.cases.filter((e:any) => {
          //     return e.id === this.caseItem.id
          //   })[0]
          // }

          if (callback) {
            callback();
          }
        });
        // setTimeout(() => {
        //   console.log(this.all)
        // }, 3000);
    }


  private async loadCategories() {
    this.firestore.get('categories').subscribe((categories) => {
      this.categories = categories.map((category:any) => {
        return { id: category.payload.doc.id, ...category.payload.doc.data() }
      })
      this.loadCategorySubcollections()
      this.categoriesList = this.categories.map((category:any) => {
        return { select: category.id, title: category.title, id: category.id, icon: 'faArrowRight' }
      })
    })
  }

  loadCategorySubcollections(){
    this.categories.forEach((category:any) => {
      this.firestore.getSubSubDoc('categories',category.id,'languages',this.translate.currentLang,'agents','reaction').subscribe((reaction:any) => {
        // add reaction to category
        this.categories = this.categories.map((cat:any) => {
          if(cat.id === category.id){
            cat.reaction = reaction.payload.data() 
          }
          return cat
        })
      })
    })
  }

  categoryInfo(id:string){
    console.log(this.categories)
    if(!this.categories.length) return {}
    let category = this.categories.filter((e:any) => {
      return e.id === id
    })
    return category[0]
  }

  changeTab(tab:number){
    this.activeTab = tab
  }
  selectCasus(casus:any){
    this.caseItem = casus
    console.log(this.caseItem)
  }

  getCaseItem(id:string){
    let item = this.cases.filter((e:any) => {
      return e.id === id
    })
    if(item.length){
      this.caseItem = item[0]
    }
    else{
      this.caseItem = {}
    }
  }

  update(field?:string,isArray:boolean = false,caseItem?:any){
    if(!caseItem?.id){
      caseItem = this.caseItem
    }
    const scrollPosition = window.scrollY;
    if(field){
      this.firestore.set('cases',caseItem.id,caseItem[field],field,isArray).then(()=>{
        setTimeout(() => {
          window.scrollTo(0, scrollPosition);
        }, 100);
      })
    }
  }
  
  onToggleChange(key: any, event: any) {
    this.caseItem.editable_by_user[key] = event.detail.checked;
    this.update('editable_by_user');
  }

  log(event:any){
    console.log(event)
  }
  // openAdd(){
  //   this.selectNew.open()
  // }

  shortMenu:any

  addCase(){
    this.toast.showLoader()
    let casus = this.casesService.defaultCase('','')
    this.firestore.create('cases',casus).then(()=>{
      this.loadCases(()=>{
        let item = this.cases.filter((e:any) => {
          return e.created === casus.created
        })
        if(item.length){
          this.caseItem = item[0]
        }
        else{
          this.caseItem = {}
        }
        this.toast.hideLoader()
      })
    })
  }

  changeCategory(){
    setTimeout(() => {
      this.caseItem.openingMessage = this.categoryInfo(this.caseItem.conversation).reaction.content
      this.update('openingMessage')
      this.toast.show(this.translate.instant('cases.change_category_message'))
    }, 100);
  }

  async openAdd(){
    
    await this.modalService.selectItem('',this.categoriesList,(result:any)=>{
      if(result.data){
        let casus = this.casesService.defaultCase(result.data.id,this.categoryInfo(result.data.id).reaction.content)
        
        casus.openingMessage = this.categoryInfo(casus.conversation).reaction.content

        console.log(casus)
        this.firestore.create('cases',casus).then(()=>{
          this.loadCases(()=>{
            let item = this.cases.filter((e:any) => {
              return e.created === casus.created
            })
            if(item.length){
              this.caseItem = item[0]
            }
            else{
              this.caseItem = {}
            }
          })
        })
      }
    })
  }

  editCase(caseItem:any,existing:boolean = false){

    if(!caseItem.goalsItems){
      caseItem.goalsItems = {
        phases:[],
        free:'',
        attitude:0,
      }
    }
    if(!caseItem.editable_by_user){
      caseItem.editable_by_user = {
        role:false,
        description:false,
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
          free:false,
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
    if(!caseItem.max_time){
      caseItem.max_time = 30
    }
    if(!caseItem.minimum_goals){
      caseItem.minimum_goals = 0
    }
    if(!caseItem.goal){
      caseItem.goal = false
    }
    if(!caseItem.openingMessage){
      caseItem.openingMessage = this.categoryInfo(caseItem.conversation).openingMessage
    }
    if(existing){
      caseItem.existing = true
    }

    this.modalService.showConversationStart({admin:true,conversationInfo:this.categoryInfo(this.caseItem.conversation),...caseItem}).then((res:any)=>{
          
      if(res && !res.id){
        delete res.admin
        delete res.conversationInfo
        delete res.existing
        this.firestore.create('cases',res).then(()=>{
          this.loadCases(()=>{
            let item = this.cases.filter((e:any) => {
              return e.created === res.created
            })
            if(item.length){
              this.caseItem = item[0]
            }
            else{
              this.caseItem = {}
            }
          })
        })
      }
      else if(res && res.id){
        delete res.admin
        delete res.conversationInfo
        delete res.existing

        this.firestore.set('cases',res.id,res).then(()=>{
          this.loadCases(()=>{
            this.caseItem = this.cases.filter((e:any) => {
              return e.id === res.id
            })[0]
          })
        })
      }
    })
    this.selectMenuservice.selectedItem = undefined
  }

  generateCasus(event:Event,caseItem:any){
    event.preventDefault()
    event.stopPropagation()
    
    caseItem.existing = true

    this.modalService.generateCase({admin:true,conversationInfo:this.categoryInfo(this.caseItem.conversation),...caseItem}).then((res:any)=>{
      console.log(res)
      if(res && res.id){
        delete res.admin
        delete res.conversationInfo
        delete res.existing
        if(res.casus!=caseItem.casus){
          res.translate = false
        }
        this.firestore.set('cases',res.id,res).then(()=>{
          this.loadCases(()=>{
            this.caseItem = this.cases.filter((e:any) => {
              return e.id === res.id
            })[0]
          })
        })
      }
    })
    this.selectMenuservice.selectedItem = undefined
  }

  deleteCase(){
    this.modalService.showConfirmation('Are you sure you want to delete this case?').then((result:any) => {
      if(result){
        this.firestore.delete('cases',this.caseItem.id)
        this.caseItem = {}
        this.loadCases()
      }
    })
  }

  getBackups(type:string,agent:string){
    this.backupService.getBackups(type,agent,(backups:any)=>{
      this.modalService.backups(this.backupService.backups,{},'Select a backup to restore',(response:any)=>{
        if(response.data){
            console.log(response.data)
            this.cases = response.data.content
            this.showBackups = true
            this.backupDate = response.data.timestamp
        }
      })
    })

  }
  hideBackups(){
    this.loadCases()
    this.backupService.hideBackups()
    this.showBackups = false
  }

  returnBackup(obj:any){
    this.modalService.showConfirmation('Are you sure you want to restore this backup?').then((result:any) => {
      if(result){
        delete obj.id
        this.firestore.create('cases',obj).then(()=>{
          this.loadCases()
          this.showBackups = false
        })
      }
    })

  }

  selectTypes(types:string[] = []){
    console.log(types)
    // types = ['family','politics']
    let items:any =[]; 
    for(let i = 0; i < this.infoService.conversation_types.length; i++){
      if(this.infoService.conversation_types[i].subjects?.length){
        items.push(this.infoService.conversation_types[i])
      }
    }
    let obj:any = {
      list:items,
      subList:'subjects',
      title:'Selecteer één of meerdere typen',
      value:types ? types : [],
    }
    this.modalService.selectMany(obj,(result:any)=>{
      console.log(result)
      if(result.data){
        this.caseItem.types = result.data
        this.update('types',true)
      }
    })
  }

  get currentFilterTypes() {
    return this.filterTypes();
  }


  filterTypes() {
    let filter: any = {
      types: [],
      subjects: [],
      subjectTypes: {}
    };
  
    for (let i = 0; i < this.infoService.conversation_types.length; i++) {
      if (this.infoService.conversation_types[i].selected) {
        const conversationTypeId = this.infoService.conversation_types[i].id;
        filter.types.push(conversationTypeId);
  
        // Maak een lijst van subjects per conversationType
        filter.subjectTypes[conversationTypeId] = [];
  
        for (let j = 0; j < this.infoService.conversation_types[i].subjects.length; j++) {
          if (this.infoService.conversation_types[i].subjects[j].selected) {
            filter.subjects.push(this.infoService.conversation_types[i].subjects[j].id);
            filter.subjectTypes[conversationTypeId].push(this.infoService.conversation_types[i].subjects[j].id);
          }
        }
      }
    }
  
    return filter;
  }

  toggleFilter(filter:any,value:any){
    console.log(filter,value)
    if(!this.extraFilters[filter]){
      this.extraFilters[filter] = []
    }
    if(this.extraFilters[filter].indexOf(value) > -1){
      this.extraFilters[filter].splice(this.extraFilters[filter].indexOf(value),1)
    }
    else{
      this.extraFilters[filter].push(value)
    }
  }
  filterActive(filter:any,value:any){
    return this.extraFilters[filter]?.indexOf(value) > -1
  }


  check(event:any){
    event.preventDefault()
    event.stopPropagation()
  }

  async selectAvatar(event:Event){
    this.media.selectAvatar(event,(res:any)=>{
      console.log(res)
      if(res?.status==200&&res?.result.url){
        this.caseItem.photo = res.result.url
        this.caseItem.avatarName = ''
        this.update('photo')
        this.update('avatarName')
      }
      else if(res=='delete'){
        this.caseItem.photo = ''
        this.caseItem.avatarName = ''
        this.update('photo')
        this.update('avatarName')
      }
      else if(res.type=='library'){
        this.caseItem.photo = res.url
        this.caseItem.avatarName = ''
        this.update('photo')
        this.update('avatarName')
      }
      else if(res=='generate'){
        this.createPhoto(this.caseItem)
      }
    },true)
  }

  selectStreamingAvatar(event:Event){
    event.preventDefault()
    event.stopPropagation()
    this.modalService.selectImageLibrary({type:'streamingAvatar'},(res:any)=>{
      console.log(res)
      if(res.data){
        this.caseItem.photo = res.data.url
        this.caseItem.avatarName = res.data.avatarId
        this.update('photo')
        this.update('avatarName')
      }
    })
  }

  doNothing(){}

  async startTranslation(caseItem?:any){
    let id = ''
    if(!caseItem?.id){
      if(!this.caseItem.id){
        this.toast.show('Selecteer een casus')
        return
      }
      id = this.caseItem.id
    }
    else{
      id = caseItem.id
    }
    let list:any[] = []
    this.nav.langList.forEach((lang)=>{
      list.push({
        value:lang,
        title:this.translate.instant('languages.'+lang),
        icon:'faGlobeEurope'
      })
    })
    this.modalService.inputFields('Selecteer de originele taal','',[{
      type:'select',
      placeholder:'Selecteer de originele taal',
      value:this.translate.currentLang,
      optionKeys:list
    }],(result:any)=>{
      if(result.data){
        this.firestore.update('cases',id!,{original_language:result.data[0].value,translate:false})
        setTimeout(() => {
          this.firestore.update('cases',id!,{original_language:result.data[0].value,translate:true}).then(()=>{
            if(this.caseItem.id){
              this.caseItem = {}
            }
          })
        }, 1000);
        this.toast.show('Translation started')
      }
    })
     
  }
  
  addTag(){
    if(!this.caseItem.tags){this.caseItem.tags = []}
    if(this.caseItem.tag&&!this.caseItem.tags.includes(this.caseItem.tag)){
      this.caseItem.tags.push(this.caseItem.tag.toLowerCase())
      this.update('tags',true)
      this.caseItem.tag = ''
    }
  }

  removeTag(index:number){
    this.caseItem.tags.splice(index,1)
    this.update('tags',true)
  }

  loadImages(){
    this.firestore.get('ai-avatars').subscribe((images:any)=>{
      this.images = images.map((e:any) => {
        return { ...e.payload.doc.data(), id:e.payload.doc.id }
      })
      // console.log(this.images)
      
    })
  }

  csvData: any = '';
  getCaseCsv(){
    this.http.get('assets/datasets/cases_temp2.csv', { responseType: 'text' })
      .subscribe(
        data => {
          this.csvData = data;
          this.csvData = this.csvToObj(this.csvData);
          this.processCaseCsv();
          console.log(this.csvData);
        },
        error => {
          console.error('Fout bij laden CSV:', error);
        }
      );
  }

  csvToObj(csv: string) {
    const lines = csv.split('\n');
    const result = [];
    const headers = lines[0].split(';');
    for (let i = 1; i < lines.length; i++) {
      const obj:any = {};
      const currentline = lines[i].split(';');
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = currentline[j];
      }
      result.push(obj);
    }
    return result;
  }

  openingMessages:any = {}
  getOpeningMessages(){
    this.categories.forEach((item:any) => {
      this.infoService.loadPublicInfo('categories',item.id,'content','agents','reaction',(result:any) => {
        this.openingMessages[item.id] = result
      })
    })
  }

  setOrderRatings(){
    this.cases.forEach((item:any) => {
      if(!item.order_rating){
        this.firestore.update('cases',item.id,{order_rating:3})
      }
    })
  }


  async processCaseCsv(){
     
    this.csvData.forEach(async (item:any) => {
      item.level = parseInt(item.level);
      item.attitude = parseInt(item.attitude);
      item.types = item.types.split('$$$');
      for(let i = 0; i < item.types.length; i++){
        item.types[i] = item.types[i].trim();
        item.types[i] = this.getConversationTypeSubjectId(item.types[i]);
      }
      // item.openingMessage = this.openingMessages[item.conversation]
      item.casus = item.casus.split('jai').join('jij, als AI simulatiegesprekspartner,').split('Jai').join('Jij, als AI simulatiegesprekspartner,')
    })
  }

  async importCases(){
    return
    // console.log(this.csvData[i]);
    let batch = 0;
    // let eindeBatch = batch + 1;
    let eindeBatch = this.csvData.length;
    for(let i = batch; i < eindeBatch; i++){
      let obj:any = {
        conversation:this.csvData[i].conversation,
        role: this.csvData[i].role,
        title: this.csvData[i].title,
        age: this.csvData[i].age,
        gender: this.csvData[i].gender,
        casus: this.csvData[i].casus,
        user_info: this.csvData[i].user_info,
        level: this.csvData[i].level,
        attitude: this.csvData[i].attitude,
        steadfastness: this.csvData[i].steadfastness,
        types: this.csvData[i].types,
        openingMessage: this.csvData[i].openingMessage || '',
        free_question: this.csvData[i].free_question || '',
        open_to_user: false,
        goalsItems: {
          free:this.csvData[i].goal,
          attitude:0,
          phases:[]
        },
        max_time: 30,
        order_rating:3,
        editable_by_user: {
          role: false,
          description: false,
          free_answer:this.csvData[i].free_question ? true : false,
          function: false,
          vision: false,
          interests: false,
          communicationStyle: false,
          externalFactors: false,
          history: false,
          attitude: false,
          steadfastness: false,
          casus: false,
          goals: {
            phases: false,
            free: true,
            attitude: false,
          },
          max_time: false,
          minimum_goals: false,
          openingMessage: true,
          agents: {
            choices: true,
            facts: true,
            background: true,
            undo: true,
          }
        },
        photo: '',
        avatarName: '',
        tags: [],
        translate: false,
        original_language: 'nl',
        created: new Date().getTime(),
      }
      // let obj = {
      //   age: this.csvData[i].age,
      //   gender: this.csvData[i].gender
      // }
      // console.log(obj);
      this.firestore.create('cases',obj).then(()=>{
        console.log('Case imported');
      })
      await this.wait(1);

      // let title = this.csvData[i].title
      // let ids = this.getCaseIdByTitle(title)
      // // console.log(ids.length)
      // if(ids.length){
      //   // this.firestore.delete('cases',ids[0])
      //   this.firestore.update('cases',ids[0],obj).then(()=>{
      //     console.log('Case updated');
      //   })
      //   await this.wait(1)
      // }
    }
  }

  getCaseIdByTitle(title:string){
    let ids = []
    for(let i = 0; i < this.cases.length; i++){
      if(this.cases[i].title == title){
        ids.push(this.cases[i].id)
      }
    }
    return ids
  }

  async wait(seconds:number){
    return new Promise(resolve => {
      setTimeout(() => {
        resolve('resolved');
      }, seconds * 50);
    });
  }

  getConversationTypeSubjectId(subjectNl:string){
    for(let i = 0; i < this.infoService.conversation_types.length; i++){
      for(let j = 0; j < this.infoService.conversation_types[i].subjects.length; j++){
        if(this.infoService.conversation_types[i].subjects[j].nl == subjectNl){
          return this.infoService.conversation_types[i].subjects[j].id;
        }
      }
    }
    return subjectNl;
  }


  async createPhoto(caseItem:any){
    console.log(caseItem)
      this.toast.showLoader('Creating image...')
      setTimeout(() => {
        if(!this.caseItem.id){
          this.toast.hideLoader()
        }
      }, 500);
      let url = 'https://generateandstoreimagerunway-p2qcpa6ahq-ew.a.run.app'

      let prompt = `
        create a photo in a photo-realistic style of a character/person with the following Role:
        "${caseItem.role}"
      `
      prompt = caseItem.role
      
      let obj:any = {
        "userId": this.auth.userInfo.uid,
        "size": "1024x1024",
        prompt:prompt || '',
        akool: false,
        noPadding: true
      }
  
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(obj),
      });
      if (!response.ok) {
        console.error("Request failed:", response.status, response.statusText);
        return;
      }
      const responseData = await response.json();
      console.log(responseData)
      if(responseData?.imageURL){
        caseItem.photo = responseData.imageURL
        this.firestore.update('cases',caseItem.id,{photo:caseItem.photo})
      }
      this.toast.hideLoader()

      // const imageUrl = responseData.imageUrl;
  
      // console.log("Image URL:", imageUrl);
  }
  

    filteredCases: any[] = [];
    visibleCases: any[] = [];


    updateVisibleCases() {
      // <!-- <ion-col [size]="helpers.cardSizeSmall" *ngFor="let caseItem of cases | caseFilter: currentFilterTypes.types : currentFilterTypes.subjectTypes : extraFilters.open_to_user | filterSearch : searchTerm : false : ['title']"> -->

      const filtered = this.caseFilterPipe.transform(
        this.cases,
        this.currentFilterTypes.types,
        this.currentFilterTypes.subjectTypes,
        this.extraFilters.open_to_user
      );
    
      const searched = this.filterSearchPipe.transform(
        filtered,
        this.searchTerm,
        false,
        ['title','role','user_info','tags']
      );
    
      const extraFiltered2 = this.filterKeyPipe.transform(
        searched,
        'photo',
        this.extraFilters.photo
      );

      const extraFiltered3 = this.filterKeyPipe.transform(
        extraFiltered2,
        'free_question',
        this.extraFilters.photo
      );

      this.filteredCases = extraFiltered3;
      this.filteredCases = this.filteredCases.sort((a, b) => a.order_rating - b.order_rating);
      this.visibleCases = this.filteredCases.slice(0, this.maxCases);
      if (this.infiniteScroll) {
        this.infiniteScroll.disabled = this.visibleCases.length >= this.filteredCases.length;
      }
      setTimeout(() => {
        // console.log('disabled: ', this.visibleCases.length >= this.filteredCases.length)
        this.infiniteScroll.disabled = this.visibleCases.length >= this.filteredCases.length;
      }, 400);
    }


    loadMore(event?: any) {
      this.maxCases += 15;
      if(this.view=='list'){
        this.maxCases += 35
      }
      this.visibleCases = this.filteredCases.slice(0, this.maxCases);
    
      if (event) {
        event.target.complete();
      }
    
      if (this.maxCases >= this.filteredCases.length && event) {
        event.target.disabled = true;
      }
    }

    onFiltersChanged() {
      setTimeout(() => {
        
        this.maxCases = 15;
        if(this.view=='list'){
          this.maxCases = 50
        }
        this.updateVisibleCases();
        if (this.infiniteScroll) {
          this.infiniteScroll.disabled = false; // weer activeren!
        }
      }, 100);
    }
    onSearchChanged() {
      // setTimeout(() => {

        this.maxCases = 15;
        if(this.view=='list'){
          this.maxCases = 50
        }
        this.updateVisibleCases();
        // console.log(this.infiniteScroll)
        if (this.infiniteScroll) {
          this.infiniteScroll.disabled = false; // weer activeren!
        }
      // }, 100);
    }

    toggleOrderRating(caseItem:any){
      if(caseItem.order_rating > 2){
        caseItem.order_rating = 1
      }
      else if(caseItem.order_rating == 1){
        caseItem.order_rating = 2
      }
      else if(caseItem.order_rating == 2){
        caseItem.order_rating = 3
      }
      this.firestore.update('cases',caseItem.id,{order_rating:caseItem.order_rating})
    }

    toggleSortList(field:string){
      if(this.listSortBy == field){
        this.listOrder = this.listOrder * -1
      }
      else{
        this.listSortBy = field
        this.listOrder = -1
      }
    }

    editOpeningMessage(caseItem:any){
      this.modalService.inputFields('Edit opening message','',[
        {
          type:'textarea',
          placeholder:'Edit opening message',
          value:caseItem.openingMessage
        }
      ],(result:any)=>{
        if(result.data){
          console.log(result.data)
          this.firestore.update('cases',caseItem.id,{openingMessage:result.data[0].value})
          if(caseItem.translation){
            this.firestore.update(`cases/${caseItem.id}/translations`,this.translate.currentLang,{openingMessage:result.data[0].value})
            this.startTranslation(caseItem)
          }
        }
      }

      )
    }

    editInput(caseItem:any,field:string){
      this.modalService.inputFields('Edit '+field,'',[{
        type:'text',
        placeholder:'Edit '+field,
        value:caseItem[field]
      }],(result:any)=>{
        if(result.data){
          this.firestore.update('cases',caseItem.id,{[field]:result.data[0].value})
          if(caseItem.translation){
            this.firestore.update(`cases/${caseItem.id}/translations`,this.translate.currentLang,{[field]:result.data[0].value})
            this.startTranslation(caseItem)
          }
        }
      })
    }

    // created:Date.now(),
    //   conversation:conversationType,
    //   open_to_user:false,
    //   open_to_public:false,
    //   open_to_admin:true,
    //   title:'New Case',
    //   role:'',
    //   user_role:'',
    //   description:'',
    //   attitude:1,
    //   steadfastness:50,
    //   goals:{
    //     phases:[],
    //     free:'',
    //     attitude:0,
    //   },
    //   price:0,
    //   max_time:30,
    //   minimum_goals:0,
    //   openingMessage:openingMessage,
    //   goal:false,
    //   editable_by_user:{
    //     role:false,
    //     description:false,
    //     user_role:false,
    //     function:false,
    //     vision:false,
    //     interests:false,
    //     communicationStyle:false,
    //     externalFactors:false,
    //     history:false,
    //     attitude:false,
    //     steadfastness:false,

    //     casus:false,
        
    //     goals:{
    //       phases:false,
    //       free:false,
    //       attitude:false,
    //     },
    //     max_time:false,
    //     minimum_goals:false,
    //     openingMessage:true,
    //     agents:{
    //       choices:true,
    //       facts:true,
    //       background:true,
    //       undo:true,
    //     }
    //   }

    exportCases(){
      let caseList:any[] = []
      this.cases.forEach((item:any) => {
        caseList.push({
          id:item.id,
          title:item.title,
          role:item.role,
          user_info:item.user_info,
          casus:item.casus ? item.casus.split('"').join("'") : '',
          attitude:item.attitude,
          steadfastness:item.steadfastness,
          types:item.types ? item.types.join(', ') : '',
          conversation:item.conversation,
          free_question:item.free_question,
          open_to_user:item.open_to_user,
          tags: item.tags ? item.tags.join(', ') : '',
          order_rating:item.order_rating,
          goal:item.goalsItems?.free || '',
          openingMessage:item.openingMessage,
          photo:item.photo,
        })
      })
        
      //create csv string
      let csvString = 'id;title;role;user_info;casus;attitude;steadfastness;types;conversation;free_question;open_to_user;tags;order_rating;goal;openingMessage;photo;\n'
      caseList.forEach((item:any) => {
        csvString += item.id + ';' + item.title + ';' + item.role + ';"' + item.user_info + '";"' + item.casus + '";' + item.attitude + ';' + item.steadfastness + ';' + item.types + ';' + item.conversation + ';"' + item.free_question + '";' + item.open_to_user + ';' + item.tags + ';' + item.order_rating + ';"' + item.goal + '";' + item.openingMessage + ';' + item.photo + ';\n'
      }
      )
      //download csv file
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', 'cases.csv');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.toast.show('CSV file downloaded')


    }


    editCasus(event:Event){
      event.preventDefault()
      event.stopPropagation()

      this.modalService.editHtmlItem({value:this.caseItem.casus},(result:any)=>{
        if(result.data && result.data.value!=this.caseItem.casus){
          this.caseItem.casus = result.data.value
          this.caseItem.translate = false
          this.firestore.update('cases',this.caseItem.id,{casus:result.data.value,translate:false})
        }
      })

    }

    addUseCase(){
      // let useCases:any = {
      //   "0PPq0Oerj0xmvQeAHv03":["self_develop","solve_problem"],
      //   "0du8Tgj04y33yS3YbftH":["others_understanding","better_persuade"],
      //   "1CUPUX4CFdJhh9v2yGhQ":["others_understanding","better_persuade","achieve_conversation"],
      //   "1T0lHMWBCZ1fEikRHpLU":["achieve_conversation","better_persuade","self_develop"],
      //   "1gRjCJY56qh9WTRi793X":["achieve_conversation","self_develop"],
      //   "1rcmwcmNANJiOsPs07xn":["benefit_conversation","better_persuade"],
      //   "1t7KSw4XIjHNG7UWAAHl":["solve_problem","achieve_conversation","better_persuade"],
      //   "24qhcCIvOdKZbvILfnhV":["solve_problem","achieve_conversation","better_persuade"],
      //   "25IjNiuBpwRcHAwHHxid":["self_develop"],
      //   "288HXe3YZx7MOJKsJpAq":["others_understanding","achieve_conversation","help_others"],
      //   "2aaT95d65LBckzrr17Cv":["help_others","better_persuade","solve_problem"],
      //   "2ajLbwIoLP0xznfRapRU":["benefit_conversation","better_persuade","achieve_conversation"],
      //   "2xcmatWzwhuABm6igiSf":["better_persuade","achieve_conversation","solve_problem"],
      //   "38P1U3AMsZSPkTXaYjIK":["others_understanding","self_develop","achieve_conversation"],
      //   "38fycqHcw5hvwINjrJCe":["others_understanding","achieve_conversation"],
      //   "3pnmy8rIi2Aal4BlhRTe":["help_others","self_develop"],
      //   "4Dfhz1sOI5DbV1FNuKsh":["better_persuade","help_others","achieve_conversation"],
      //   "4hdVWLDNwT0Gg6iibpZt":["others_understanding","self_develop"],
      //   "4l8WCfsgdk0VtIhLg7lc":["my_understanding","self_develop"],
      //   "4wl5iWtLt77IaiZ3hGqR":["achieve_conversation","better_persuade","help_others"],
      //   "50s1MbYKPOO5lfD6MEk9":["help_others","better_persuade","solve_problem"],
      //   "5KQ1IlK2yIKwX3ppYx7g":["solve_problem","achieve_conversation","benefit_conversation"],
      //   "5lDryHCx5P7sVN5siFap":["achieve_conversation","better_persuade","solve_problem"],
      //   "6WCLXJvVSBPxjNJtBqLW":["others_understanding","achieve_conversation"],
      //   "6ta3TxwlwahwpflFMbcm":["achieve_conversation","better_persuade","help_others"],
      //   "74yEFGDojXHK1WaqqLmC":["achieve_conversation","solve_problem"],
      //   "79jwbVeDDL1bxI2pfwyI":["achieve_conversation","solve_problem"],
      //   "7Mk0xZC3BvsrjZ74Kny9":["others_understanding","self_develop"],
      //   "7ql683YmPBMumXuX9kZa":["achieve_conversation","self_develop","solve_problem"],
      //   "7wRpIpcRhuwLNkVjLHbV":["self_develop","my_understanding"],
      //   "87rBmQfG4RxJzRoMhJV3":["benefit_conversation","self_develop"],
      //   "8mC5dU9NxqyO5xyVvUFv":["others_understanding","achieve_conversation"],
      //   "980ektyPEZjo0xsGJQSH":["my_understanding","self_develop"],
      //   "9FoZaCkYYAYovCSvTNAd":["solve_problem","achieve_conversation","better_persuade"],
      //   "9kVIoQBl3s6vHLjCZRCn":["others_understanding","self_develop"],
      //   "9rXDEqrIOoEGirwbNuRd":["achieve_conversation","better_persuade","self_develop"],
      //   "9vZZHArdlEkoMV3vKkIg":["help_others","better_persuade","solve_problem"],
      //   "A60384RhsubdjfNVvW2z":["better_persuade","self_develop"],
      //   "A8KniLuJXrHIof4DsdOk":["others_understanding","achieve_conversation"],
      //   "AVbKL0eq3nWbAb2GlYAe":["achieve_conversation","better_persuade","benefit_conversation"],
      //   "Af187K29OKaNsgkpSrhK":["self_develop","achieve_conversation","solve_problem"],
      //   "Aj8THMs2iSLlpOnShj8L":["help_others","achieve_conversation","better_persuade"],
      //   "AuBA8lijZPdBjpqcCqul":["self_develop","my_understanding"],
      //   "BWJwPzKUlfdj92W6ioG5":["self_develop","my_understanding","achieve_conversation"],
      //   "BkvDl7PYNwapBZn5aOMs":["others_understanding","self_develop","achieve_conversation"],
      //   "BlAVkYmmDyHlHUpdqwUO":["self_develop","achieve_conversation","better_persuade"],
      //   "CAWO3Ez114nxn6k6jelA":["solve_problem","benefit_conversation","achieve_conversation"],
      //   "CBRJFIADtbxg78ffcKEH":["others_understanding","self_develop"],
      //   "CVZo7VeeEqnZUJsO3HJV":["achieve_conversation","self_develop"],
      //   "Cczz8dcs8DU8nWwpAqC0":["better_persuade","achieve_conversation","solve_problem"],
      //   "DE7WCRIrEDphjIAjjIhE":["help_others","achieve_conversation"],
      //   "DK4odoE7XKlRPWGtPfWF":["self_develop","my_understanding","achieve_conversation"],
      //   "DSeTpC5UcUh80tD8MOHE":["solve_problem","better_persuade","benefit_conversation"],
      //   "DjeVJwT91pRvtkDidet8":["help_others","solve_problem","achieve_conversation"],
      //   "DoIYmVCi5L7qxowVypJy":["help_others","solve_problem","achieve_conversation"],
      //   "EDg5711JYGA1L9he3eF9":["others_understanding","self_develop","achieve_conversation"],
      //   "EGFJFeXMgWC9VSl6I5P2":["benefit_conversation","better_persuade","solve_problem"],
      //   "EJxg1P8A0H1kmw2tt6EN":["benefit_conversation","better_persuade"],
      //   "EdJwLUzsk1yaFULANAw7":["solve_problem","achieve_conversation","help_others"],
      //   "F4UEsKzRmoT1h3TqfXpV":["self_develop","my_understanding","achieve_conversation"],
      //   "F84fGtOTLN3fiqIaOVeu":["achieve_conversation","solve_problem","better_persuade"],
      //   "FFnV414SgDQnjZeJsk7m":["others_understanding","self_develop","achieve_conversation"],
      //   "FSin9khTqPnCs8lLomlc":["better_persuade","solve_problem","achieve_conversation"],
      //   "FafTIccTUtQiidLrQKIi":["self_develop","my_understanding"],
      //   "G52ltEFEcVjsZfInLFPD":["others_understanding","self_develop"],
      //   "GLqpos4afcMjY5e5tUph":["others_understanding","achieve_conversation","self_develop"],
      //   "GOe2GqkaVxc1clcSHod6":["others_understanding","self_develop"],
      //   "GOjxLboskSVkvbSW4Uy2":["self_develop","my_understanding","solve_problem"],
      //   "H3X8IsQJz4YP7QIaYInz":["help_others","better_persuade","achieve_conversation"],
      //   "HBVVzrGJVoLx3iM4bqzU":["others_understanding","self_develop"],
      //   "HOcaAPas234UWNcZY7jv":["others_understanding","help_others","better_persuade"],
      //   "HWPNdW7PQFv0NVxeUf9t":["self_develop","my_understanding","achieve_conversation"],
      //   "HsQZSjB0pTXNvnuGCXI1":["better_persuade","solve_problem","achieve_conversation"],
      //   "IGAUcSTWGmKOLaFakSHK":["benefit_conversation","self_develop"],
      //   "IbAFRVCq91gUV23KMeAb":["solve_problem","better_persuade","achieve_conversation"],
      //   "IeByEOxHZVSCQYmT3OLy":["others_understanding","achieve_conversation","self_develop"],
      //   "IsinksDEcFiIiuYbSlNu":["solve_problem","self_develop","achieve_conversation"],
      //   "JCKq7GVdkHUSChcrWvH1":["benefit_conversation","better_persuade","achieve_conversation"],
      //   "JaaTdEvoI0o0kMWvYY3l":["benefit_conversation","help_others","achieve_conversation"],
      //   "Jc1nRjhfT2RnoArUFMBm":["others_understanding","achieve_conversation","self_develop"],
      //   "Jgy5IZJrctUaLAra4ECX":["self_develop","my_understanding","achieve_conversation"],
      //   "Jvvon9lbsVDyruDOP1m3":["achieve_conversation","better_persuade","benefit_conversation"],
      //   "K1CnaAT0wrLdbO1Rdmvb":["others_understanding","better_persuade","self_develop"],
      //   "KKL5c1OPzl0Id8piUn1k":["others_understanding","achieve_conversation","self_develop"],
      //   "KiHnfu61YeBaJ92N7Hdq":["help_others","solve_problem","achieve_conversation"],
      //   "LEHvnKXkvMUCyWSLj4Qz":["help_others","better_persuade","achieve_conversation"],
      //   "LNklkzqEv0ahoT3oLkuo":["solve_problem","achieve_conversation","better_persuade"],
      //   "LRARSieHbMLIlT4KDyZE":["others_understanding","achieve_conversation","self_develop"],
      //   "M0GahcDXTSgA9QRovYbz":["solve_problem","better_persuade","benefit_conversation"],
      //   "MI3UHxBL9FGXLDbJfDY5":["benefit_conversation","better_persuade"],
      //   "MTPMxGxUA2jRgUCVTCPM":["others_understanding","achieve_conversation","self_develop"],
      //   "MWwHSU5GFF6ZkZSIrE1R":["better_persuade","solve_problem","help_others"],
      //   "MlePXZ4Szb8KNChNjCME":["others_understanding","self_develop"],
      //   "NPNYWWmfFM4OoVvrRsU7":["others_understanding","self_develop"],
      //   "Nc7xAX0axJM12cXevTGV":["achieve_conversation","solve_problem"],
      //   "NmRGCyozk86eBYhVtSpR":["help_others","solve_problem","achieve_conversation"],
      //   "OZ6mDNIYgXGoIRugEF9u":["my_understanding","self_develop","achieve_conversation"],
      //   "PAnOVVyO4jq9DA1YK1t3":["benefit_conversation","better_persuade"],
      //   "PB3Z9o9v6ZrxoZjMkunm":["help_others","solve_problem"],
      //   "Pm0WmLBgULF6LqKW771c":["self_develop","solve_problem","achieve_conversation","better_persuade"],
      //   "Pv7eboz5WPw31b7rwbt1":["others_understanding","self_develop"],
      //   "QFDJyq1j3rk9hmoifHGa":["others_understanding","self_develop"],
      //   "QLVZAEHFYcKLN1QIonRc":["others_understanding","self_develop","achieve_conversation"],
      //   "ROvFptRva8MGN2Uh12vj":["help_others","achieve_conversation"],
      //   "Rn8UOMobHq9nDZVaRh6l":["help_others","solve_problem","achieve_conversation"],
      //   "SNIDoNSb47CPMjhDepJ8":["others_understanding","achieve_conversation","self_develop"],
      //   "SQS5UHgOez03tZbBtyAI":["others_understanding","self_develop"],
      //   "STJqQG5TrGdeqfMeJbMC":["help_others","better_persuade","solve_problem"],
      //   "SdT338ckAY4TEC4erXI5":["help_others","achieve_conversation","solve_problem"],
      //   "TL18C0HnQo0AIRw9MFSK":["others_understanding","help_others"],
      //   "TMfmiUUyZ4MuqQ4Sr6Xk":["achieve_conversation","solve_problem","better_persuade"],
      //   "TR8hHalpB3wPDd4s3CFv":["others_understanding","achieve_conversation","self_develop"],
      //   "TpEpOEnOa4tS4wLPZm2W":["others_understanding","self_develop","achieve_conversation"],
      //   "UEk5frHsLnTIpf0pA8Yv":["self_develop","achieve_conversation","better_persuade"],
      //   "UHWDzseMR0NK7rzjOYLi":["my_understanding","achieve_conversation","self_develop"],
      //   "V81pJiEOiX2pAxvW2IPP":["others_understanding","self_develop"],
      //   "VRYwl7BLBBEqqloLOUMc":["self_develop","solve_problem","my_understanding"],
      //   "WDhKujfTm6fFDPXNYv17":["help_others","solve_problem","achieve_conversation"],
      //   "WYewy88i1knPATDRKlKL":["solve_problem","achieve_conversation","self_develop"],
      //   "Wmiuc9ypNffcKUEFwAHD":["others_understanding","achieve_conversation","self_develop"],
      //   "X9T56aEZ4BGqqR1KfSAf":["self_develop","my_understanding"],
      //   "XIgwZx6t37SMatoLEf9u":["help_others","achieve_conversation","better_persuade"],
      //   "XiCk7N6AKhObGzFWVHcr":["others_understanding","self_develop","achieve_conversation"],
      //   "XmB58K2oWI5h9ioiQnAH":["help_others","achieve_conversation","better_persuade"],
      //   "XzimftAcg9xZWE1CuPaQ":["solve_problem","better_persuade","achieve_conversation"],
      //   "Y4Z4B92MwjTph2LmMTjF":["self_develop","achieve_conversation"],
      //   "YjNmYCz5X3kdwdwQ1T2x":["self_develop","better_persuade","help_others"],
      //   "YnUkNbpKkSvv1ilYQeuU":["others_understanding","achieve_conversation","self_develop"],
      //   "Yv7a3w4w9XJDIEHxUTHn":["help_others","solve_problem","achieve_conversation"],
      //   "Z8TaGUJMwZ4DPAPEgcya":["others_understanding","achieve_conversation","self_develop"],
      //   "ZCYld5uo1l7Lq8BamtTI":["others_understanding","self_develop","achieve_conversation"],
      //   "ZxyDWOfEFzyREsbVzVx5":["others_understanding","achieve_conversation","self_develop"],
      //   "a5b9ItoLIp2aR0I9AhFw":["achieve_conversation","solve_problem"],
      //   "aRMgEcpwe9rJuDpEaplm":["others_understanding","self_develop","achieve_conversation"],
      //   "aV2haIVwKNjwwHLKoZj0":["others_understanding","self_develop","achieve_conversation"],
      //   "agH35v6Hy4VrILszDE7t":["solve_problem","benefit_conversation","achieve_conversation"],
      //   "bCrEaVKTeOXosJkhJk8W":["help_others","solve_problem","achieve_conversation"],
      //   "bSSCHv9NMRrO8ZXAngiU":["others_understanding","self_develop","achieve_conversation"],
      //   "bdy7fqsVROm1GIRZlOzj":["self_develop","solve_problem","my_understanding"],
      //   "btNWnVs5CPjJkNhvbD3h":["self_develop","solve_problem","achieve_conversation"],
      //   "cJZGsrGBmRz2MKaCjxsb":["others_understanding","self_develop","achieve_conversation"],
      //   "cPCnyUiTWgeImT3wJDoa":["better_persuade","benefit_conversation","achieve_conversation"],
      //   "ceJtF4NLwcXAiZEo4WPI":["self_develop","my_understanding","achieve_conversation"],
      //   "dlkH7pqNRPuNku5lbLHR":["self_develop","my_understanding"],
      //   "eN6H6Pd1Auoe4zXABeN6":["self_develop","achieve_conversation","my_understanding"],
      //   "eRbWenDZd0NnFCxf79Jr":["self_develop"],
      //   "eZGB1ZcCJ87G6PK8a3fi":["achieve_conversation","solve_problem","better_persuade"],
      //   "fBEVX1cBrIvKtT58Uoob":["others_understanding","self_develop","achieve_conversation"],
      //   "gDeb8GC91woK308TjEs7":["help_others","solve_problem","self_develop","achieve_conversation"],
      //   "gJdo0kArtElthEGDER3U":["self_develop","my_understanding","solve_problem"],
      //   "gR7JlUSgC5RU2EKDoWgO":["better_persuade","self_develop","help_others","others_understanding"],
      //   "gTs4iDH7y7nTBRQnLUBB":["others_understanding","self_develop","achieve_conversation"],
      //   "gbleSTnURs5HTaIx3M8q":["others_understanding","self_develop","achieve_conversation"],
      //   "gkkEkxzuhHwcxTJnMPbb":["help_others","solve_problem","achieve_conversation"],
      //   "gpxBPIjC5SaESTpaPvUq":["solve_problem","achieve_conversation"],
      //   "h2yWq5D51JCIPlBS7QXS":["benefit_conversation","self_develop","achieve_conversation"],
      //   "hMKd99PSJTjsHZa612M8":["better_persuade","solve_problem","benefit_conversation"],
      //   "hMuYGUW9XEmGSgXNlnLA":["others_understanding","self_develop","achieve_conversation"],
      //   "hVTmwEXnW5mpBOMO8OUZ":["others_understanding","self_develop"],
      //   "hgO3zjtF42mqgXQlg22N":["my_understanding","better_persuade","self_develop"],
      //   "hqdlxtfIf4MnL7279BXp":["self_develop","my_understanding","achieve_conversation"],
      //   "hupyMVTDEVCixzuMmdF7":["benefit_conversation","solve_problem","achieve_conversation"],
      //   "i4fBZnT7OUBNA5uVk8zT":["others_understanding","self_develop"],
      //   "i8ovDN15tgFCpkFABQ0H":["solve_problem","better_persuade","self_develop"],
      //   "iHg4qdUUAsCfJSsrca8z":["self_develop","my_understanding","achieve_conversation"],
      //   "iMYwyKx5Hb1ckquvRilC":["self_develop","my_understanding"],
      //   "iPICl1rp38mQGuULlEkh":["help_others","solve_problem","achieve_conversation"],
      //   "kUHNgA9yHmQwj4yq5NUV":["help_others","solve_problem","achieve_conversation"],
      //   "lya2mqAuKi6McDkRe8QP":["help_others","better_persuade","solve_problem"],
      //   "mQ8OXIaRMi2rLFvpSrir":["help_others","achieve_conversation"],
      //   "mxnrpDCruFJTzLSvpchy":["self_develop","my_understanding","achieve_conversation"],
      //   "n6Fc3ZqZPPVYrkVwRpwd":["others_understanding","self_develop","achieve_conversation"],
      //   "nGX7xdapBBh6gflBjyc3":["others_understanding","self_develop","achieve_conversation"],
      //   "nQ0oxZpasmYkbqqNQCY7":["help_others","achieve_conversation","self_develop"],
      //   "nbFLurXxf1Ou4akdxuiB":["others_understanding","self_develop","achieve_conversation"],
      //   "nowtEnqJHBGcXpPVDQ0y":["others_understanding","self_develop"],
      //   "oKsoDOWMBJfb22EqpoCW":["others_understanding","achieve_conversation","self_develop"],
      //   "oL7yIiEjE1fw5My4BWC1":["better_persuade","my_understanding","self_develop"],
      //   "oXxAnSAfNeq1CH8ybULn":["solve_problem","self_develop","achieve_conversation"],
      //   "oZeq5YziZgPEJWPcRuZM":["others_understanding","self_develop","achieve_conversation"],
      //   "oxNoJqLiJiBAjQOc2QxN":["others_understanding","self_develop"],
      //   "pNs5KaQQLmDy22bq70VU":["benefit_conversation","better_persuade","achieve_conversation"],
      //   "q8vo2fITQ3irFb4KdBba":["others_understanding","self_develop","achieve_conversation"],
      //   "r8NLBkJRYzyYIj8T7stc":["self_develop","my_understanding","achieve_conversation"],
      //   "rEBEqkpUXcEHzwUsYSl6":["solve_problem","better_persuade","self_develop"],
      //   "rNIMIIalPSg4VdpljXOw":["others_understanding","self_develop","achieve_conversation"],
      //   "rhQ0HsE8cSOH4UbV7Lm8":["my_understanding","self_develop"],
      //   "rmNpOU5y4sui2GzbxaSI":["help_others","self_develop","achieve_conversation"],
      //   "sBVYcNgwurDFo4Z8G6ur":["achieve_conversation","my_understanding","self_develop"],
      //   "seJsKweaZ1kiIjhzjAGI":["self_develop","achieve_conversation","my_understanding"],
      //   "tBD4esUl15QpN1Ge7jOJ":["solve_problem","self_develop","achieve_conversation"],
      //   "tiGu0VDp3sy8XhPqCBL0":["better_persuade","achieve_conversation","solve_problem"],
      //   "u0gWtCx20ZhTSlFaapai":["others_understanding","self_develop","achieve_conversation"],
      //   "u8ZILTsDyiERUfNx0wlm":["help_others","self_develop","achieve_conversation"],
      //   "uW1KTAXFQKNQfwkvXZRB":["solve_problem","achieve_conversation","better_persuade"],
      //   "up9fAKwzMYmqljuvuVVt":["help_others","achieve_conversation","better_persuade"],
      //   "usycYzt5i1hvqWg3ZOqv":["self_develop","my_understanding","achieve_conversation"],
      //   "uxYQD1c0QoxoOxYxtfxb":["self_develop","my_understanding","achieve_conversation"],
      //   "uyd74NTWjCZKmASDVDMQ":["others_understanding","self_develop","achieve_conversation"],
      //   "v5re4i7KaryZqiWtwrnq":["solve_problem","better_persuade","achieve_conversation"],
      //   "vpullbZkO2GxkN4f6vrE":["help_others","achieve_conversation","better_persuade"],
      //   "vx9EvU5lE7xpClYgQeM7":["others_understanding","self_develop"],
      //   "wCcHz4dFONQbqg66nNbV":["others_understanding","achieve_conversation","self_develop"],
      //   "wnbwi7gtCYtu7wKSmD8o":["others_understanding","achieve_conversation","self_develop"],
      //   "x7LQdbhYkthRKN1UGq6M":["others_understanding","self_develop"],
      //   "xB63kcJyWdxm5JCuoAeY":["my_understanding","self_develop"],
      //   "xBTqh2pgWnlwPprCmKCY":["self_develop","my_understanding","achieve_conversation"],
      //   "xTMxIxacimmjjlQMOTXc":["solve_problem","better_persuade","achieve_conversation"],
      //   "xcJBlfQaPARaW3ChsQc6":["self_develop","my_understanding","achieve_conversation"],
      //   "y8AAOsnEuGagryuIVGAX":["others_understanding","self_develop","achieve_conversation"],
      //   "yVXLQLNAaSwMIrbTeAHg":["others_understanding","achieve_conversation","self_develop"],
      //   "yXQnX3aIa87xYdf1y8PN":["self_develop","solve_problem"],
      //   "yZ9rSaiJKty0CXnzxCF0":["help_others","achieve_conversation","solve_problem"],
      //   "zDzdeaUsNM3A7IqCt6jy":["others_understanding","self_develop"],
      // }
  
      // for(let casus in useCases){
      //   console.log(useCases[casus])
      //   this.firestore.update('cases',casus,{useCases:useCases[casus]}).then((result:any)=>{
      //     console.log('updated')
      //   })
      // }
      // this.firestore.update('cases',"zDzdeaUsNM3A7IqCt6jy",{useCases:useCases["zDzdeaUsNM3A7IqCt6jy"]})
    }


    caseNotready(){
      let check = 
        this.caseItem?.title == '' || 
        this.caseItem?.role == '' ||
        this.caseItem?.user_info == '' ||
        ! this.caseItem?.level ||
        this.caseItem?.types?.length == 0 ||
        !this.caseItem?.attitude ||
        !this.caseItem?.steadfastness ||
        this.caseItem?.conversation == '' ||
        !this.caseItem?.translate ||
        !this.caseItem?.order_rating ||
        this.caseItem?.photo == '' ||
        (
          this.caseItem?.editable_by_user?.free_answer == true &&
          this.caseItem?.free_question == ''
        )

        return check
    }

    caseReady(part:string){
      let check = false
      switch(part){
        case 'title':
          check = this.caseItem?.title && this.caseItem?.user_info
          break;
        case 'basics':
          check = this.caseItem?.role && this.caseItem?.conversation && this.caseItem.types.length && this.caseItem?.level && this.caseItem?.attitude && this.caseItem?.steadfastness && this.caseItem?.order_rating
          break;
        case 'looks':
          check = this.caseItem?.photo
          break;
        case 'settings':
          check = this.caseItem.translate && this.caseItem?.open_to_user
          break;
        case 'input':
          check = ((this.caseItem.openingMessage && this.caseItem.editable_by_user.openingMessage) || !this.caseItem.editable_by_user.openingMessage) && ((this.caseItem.editable_by_user.free_answer && this.caseItem?.free_question) || !this.caseItem.editable_by_user.free_answer)
          break;
        default:
          check = false
      }
      return check
    }
}
