import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
    create_self: [false],
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
  showUserHide: boolean = false;
  showUserhelp: boolean = false;
  showUserInput: boolean = false;
  showUserInputMore: boolean = true;
  showCasus: boolean = false;
  showUserOptions: boolean = false;
  @ViewChild('import_item') import_item!: ElementRef;

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
    public auth:AuthService,
    private caseFilterPipe: CaseFilterPipe,
    private filterSearchPipe: FilterSearchPipe,
    private filterKeyPipe: FilterKeyPipe,

  ) { }


  ngOnInit() {
    // this.addUseCase()
    
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
            free_question: doc.translation?.free_question || doc.free_question || '',
            free_question2: doc.translation?.free_question2 || doc.free_question2 || '',
            free_question3: doc.translation?.free_question3 || doc.free_question3 || '',
            free_question4: doc.translation?.free_question4 || doc.free_question4 || '',
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
    if(casus.editable_by_user && !casus.editable_by_user.hide){
      casus.editable_by_user.hide = {
        attitude:false,
        phases:false,
        feedback:false,
        feedbackCipher: false,
        goal: false,
      }
      setTimeout(() => {
        this.update('editable_by_user',true,casus)
      }, 500);
    }
    
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
        for(let key in res){
          if(res[key] == undefined){
            res[key] = null
          }
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

  deleteCase(item?:any){
    if(!item){
      item = this.caseItem
    }
    this.modalService.showConfirmation('Are you sure you want to delete this case?').then((result:any) => {
      if(result){
        this.firestore.delete('cases',item.id)
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
      else if(res=='download'){
        this.nav.goto(this.caseItem.photo,true)
      }

    },true,false,'','avatar')
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
    this.http.get('assets/datasets/cases_temp_free_choice.csv', { responseType: 'text' })
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
      item.steadfastness = parseInt(item.steadfastness);
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
        create_self: false,
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
        free_question2: this.csvData[i].free_question_2 || '',
        free_question3: this.csvData[i].free_question_3 || '',
        free_question4: this.csvData[i].free_question_4 || '',
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
      console.log(obj);
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

    this.modalService.inputFields('Generate image', 'Please fill in the details for the image...', [
      {
        type: 'textarea',
        title: 'Prompt',
        value: `A centered portrait of a 
[age (young, middle-aged, old, ...)] 
[gender (male, female, non-binary, ...)] 
[ethnicity (Asian, Black, Caucasian, Hispanic, ...)] 
[occupation (doctor, teacher, engineer, ...)],
who looks [emotion (happy, scared, angry, ...]. 
The person is positioned in the center of the frame.
The person’s hairstyle, clothing, and any accessories are chosen creatively by the AI.  
The background is soft, neutral, and simple (e.g., soft gray or light beige).  
The face is well-lit with a natural expression, and the portrait is in a photo-realistic style.  
No text, lines, or other elements should be present in the image besides the portrait.`,
      }], async (result: any) => {
        if (result.data) {
          let prompt = result.data[0].value
      console.log(caseItem)
        this.toast.showLoader('Creating image...')
        setTimeout(() => {
          if(!this.caseItem.id){
            this.toast.hideLoader()
          }
        }, 500);
        let url = 'https://generateandstoreimagerunway-p2qcpa6ahq-ew.a.run.app'

        // let prompt = `
        //   create a photo in a photo-realistic style of a character/person with the following Role:
        //   "${caseItem.role}"
        // `
        // prompt = caseItem.role
        
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
      }
      
    })

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

      const extraFiltered4 = this.filterKeyPipe.transform(
        extraFiltered3,
        'create_self',
        this.extraFilters.create_self
      );

      this.filteredCases = extraFiltered4;
      this.filteredCases = this.filteredCases.sort((a, b) => a.order_rating - b.order_rating);
      this.visibleCases = this.filteredCases.slice(0, this.maxCases);
      if (this.infiniteScroll) {
        this.infiniteScroll.disabled = this.visibleCases.length >= this.filteredCases.length;
      }
      setTimeout(() => {
        // console.log('disabled: ', this.visibleCases.length >= this.filteredCases.length)
        if(this.infiniteScroll){
          this.infiniteScroll.disabled = this.visibleCases.length >= this.filteredCases.length;
        }
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

    copyCase(caseItem?:any){
      if(!caseItem?.id){
        if(!this.caseItem.id){
          this.toast.show('Selecteer een casus')
          return
        }
        caseItem = this.caseItem
      }
      let copy = JSON.parse(JSON.stringify(caseItem))
      delete copy.id
      copy.created = Date.now()
      copy.title = copy.title + ' (copy)'
      copy.open_to_user = false
      copy.translate = false
      this.firestore.create('cases',copy).then(()=>{
        this.loadCases(()=>{
          let item = this.cases.filter((e:any) => {
            return e.created === copy.created
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

    practice(item?:any){
      if(this.caseNotReady(item)){
        this.toast.show(this.translate.instant('error_messages.not_complete'))
        return
      }
      if(!item?.id){
        if(!this.caseItem.id){
          this.toast.show('Selecteer een casus')
          return
        }
        item = this.caseItem
      }
      if(item.translation){
        item.role = item.translation.role
        if(item.translation.free_question){
          item.free_question = item.translation.free_question
        }
      }
      item.trainerId = this.nav.activeOrganisationId
      this.modalService.showConversationStart(item).then((res)=>{
        // console.log(res)
        if(res){
          localStorage.setItem('activatedCase',item.id)
          localStorage.setItem('personalCase',JSON.stringify(item))
          this.nav.go('conversation/'+item.id)
        }
      })
    }

    async showshortMenu(event:any,list:any[],callback:Function){
      this.shortMenu = await this.popoverController.create({
        component: MenuPage,
        componentProps:{
          pages:list,
          listShape:true,
          customMenu:true,
        },
        cssClass: 'shortMenu',
        event: event,
        translucent: false,
        reference:'trigger',
      });
      this.shortMenu.shadowRoot.lastChild.lastChild['style'].cssText = 'border-radius: 24px !important;';
      await this.shortMenu.present();
      await this.shortMenu.onDidDismiss()
      callback(this.selectMenuservice.selectedItem)
    }


    onRightClick(event:Event,item:any){
    event.preventDefault()
    event.stopPropagation()
    let list = [
      {
        title:this.translate.instant('cases.edit_case'),
        icon:'faEdit',
        value:'edit'
      },
      {
        title:this.translate.instant('cases.copy_case'),
        icon:'faCopy',
        value:'copy'
      },
      {
        title:this.translate.instant('cases.remove_case'),
        icon:'faTrashAlt',
        value:'delete'
      },
      {
        title:this.translate.instant('cases.practice'),
        icon:'faComment',
        value:'practice'
      },
      {
        title:this.translate.instant('cases.export_case'),
        icon:'faFileExport',
        value:'export'
      },
    ]
    this.showshortMenu(event,list,(result:any)=>{
      if(result?.value){
        switch(result.value){
          case 'edit':
            this.selectCasus(item)
            break;
          case 'delete':
            this.deleteCase(item)
            break;
          case 'copy':
            this.copyCase(item)
            break;
          case 'practice':
            this.practice(item)
            break;
          case 'export':
            this.exportItem(item)
            break;
        }
      }
      this.selectMenuservice.selectedItem = undefined
    })
  }

  exportItem(item:any){

    item.exportedType = 'case'
    const obj = JSON.parse(JSON.stringify(item));
    
    const base64 = this.encodeObjectToBase64(obj); // encode naar base64

    const blob = new Blob([base64], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    let title = 'case'
    if(item.title){
      title = item.title.replace(/[^a-zA-Z0-9]/g, '_'); // vervang speciale tekens door _
    }
    link.download = 'export_'+title+'.alicialabs';
    link.click();

  }

  importClick(){
    this.import_item.nativeElement.click();
  }

  selectImportFile($event:any) {
    if($event?.target?.files[0]){
      this.readImportFile($event.target.files[0])
    }

  } 

  readImportFile(file: File) {
    var reader = new FileReader();
    reader.onload = () => {
        let obj = this.decodeBase64ToObject(reader.result)
        this.importData(obj)
    };
    reader.readAsText(file);
  }

  importData(fileData:any){
    if(!fileData || fileData.exportedType !== 'case') {
      this.toast.show(this.translate.instant('error_messages.invalid_file'), 4000, 'middle');
      return;
    }
    let newItem:any = {}

    try {
        newItem.created = Date.now();
        newItem.conversation = fileData.conversation || '';
        newItem.title = fileData.title + ' - import' || 'import case';
        newItem.role = fileData.role || '';
        newItem.free_question = fileData.free_question || '';
        newItem.free_question2 = fileData.free_question2 || '';
        newItem.free_question3 = fileData.free_question3 || '';
        newItem.free_question4 = fileData.free_question4 || '';
        newItem.tags = fileData.tags || [];
        newItem.order_rating = fileData.order_rating || 0;
        newItem.photo = fileData.photo || '';
        newItem.avatarName = fileData.avatarName || '';
        newItem.level = fileData.level || 1;
        newItem.translate = fileData.translate || false;
        newItem.user_role = fileData.user_role || '';
        newItem.user_info = fileData.user_info || '';
        newItem.attitude = fileData.attitude || 1;
        newItem.steadfastness = fileData.steadfastness || 50;
        newItem.casus = fileData.casus || '';
        newItem.trainerId = this.nav.activeOrganisationId;
        newItem.goalsItems = fileData.goalsItems || {
          phases: [],
          free: '',
          attitude: 0,
        };
        newItem.max_time = fileData.max_time || 30;
        newItem.minimum_goals = fileData.minimum_goals || 0;
        newItem.openingMessage = fileData.openingMessage || '';
        newItem.goal = fileData.goal || false;
        newItem.editable_by_user = fileData.editable_by_user || {
          role: false,
          description: false,
          user_role: false,
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
          },
          hide:{
            attitude:false,
            phases:false,
            feedback:false,
            feedbackCipher: false,
            goal: false,
          }
        };
      
    }
     catch (error) {
      this.toast.show(this.translate.instant('error_messages.invalid_file'), 4000, 'middle');
      return;
    }
    this.firestore.createSub('trainers', this.nav.activeOrganisationId, 'cases', newItem,(res:any) => {
      if(res && res.id){
        this.loadCases(()=>{
          let item = this.cases.filter((e:any) => {
            return e.created === newItem.created
          })
          if(item.length){
            this.caseItem = item[0]
          }
          else{
            this.caseItem = {}
          }
          this.toast.hideLoader()
        })
      } else {
        this.toast.show(this.translate.instant('error_messages.import_failed'), 4000, 'middle');
      }
    })

  }


  decodeBase64ToObject(base64: any): any {
    const binary = atob(base64);
    const bytes = new Uint8Array([...binary].map(c => c.charCodeAt(0)));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  }

  encodeObjectToBase64(obj: any): string {
    const json = JSON.stringify(obj);
    const utf8Bytes = new TextEncoder().encode(json); // UTF-8 → Uint8Array
    const base64 = btoa(String.fromCharCode(...utf8Bytes));
    return base64;
  }

  caseNotReady(item?:any){
    if(!item?.id){
      if(!this.caseItem.id){
        this.toast.show('Selecteer een casus')
        return
      }
      item = this.caseItem
    }
    let check =
      item?.title == '' ||
      item?.role == '' ||
      item?.user_info == '' ||
      !item?.level ||
      item?.types?.length == 0 ||
      !item?.attitude ||
      !item?.steadfastness ||
      item?.conversation == '' ||
      !item?.translate ||
      !item?.order_rating ||
      item?.photo == '' ||
      (
        item?.editable_by_user?.free_answer == true &&
        item?.free_question == ''
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
        check = this.caseItem?.role && this.caseItem?.conversation && this.caseItem.types?.length && this.caseItem?.level && this.caseItem?.attitude && this.caseItem?.steadfastness && this.caseItem?.order_rating
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


  selectVoice(){
    let list:any[] = []
    let sexHtml:any = {
      female: '<span style="background-color:yellow;color:black;padding:2px 6px;font-size:10px;border-radius:4px;position:relative;margin-right:5px;">'+this.translate.instant('cases.voice_sex_female')+'</span>',
      male: '<span style="background-color:lightblue;color:white;padding:2px 6px;font-size:10px;border-radius:4px;position:relative;margin-right:5px;">'+this.translate.instant('cases.voice_sex_male')+'</span>',
      other: '<span style="background-color:lightgreen;color:white;padding:2px 6px;font-size:10px;border-radius:4px;position:relative;margin-right:5px;">'+this.translate.instant('cases.voice_sex_other')+'</span>'
    }


    for(let i=0;i<this.auth.voices.length;i++){
      let voice:any = this.auth.voices[i]
      let sample = "https://storage.cloud.google.com/lwai-3bac8.firebasestorage.app/voices/"+voice.name+"_"+this.translate.currentLang+".wav"
      let html = '<div style="display:flex;margin:10px 0px;align-items:center"><div><span style="font-weight:bold;font-size:18px;">'+voice.name+'</span>[type]<br>[sex]<span style="font-size:12px;font-style:italic;">'+voice.short +'</span></div><span style="flex:auto 1 1"></span><audio style="height:36px;" controls><source src="'+sample+'" type="audio/mpeg">Your browser does not support the audio element.</audio>'
      if(voice.type.toLowerCase()=='teenager'){
        html = html.replace('[type]','<span style="background-color:orange;color:white;padding:2px 6px;font-size:10px;border-radius:4px;position:relative;margin-left:15px;top:-2px;">'+this.translate.instant('cases.voice_type_teenager')+'</span>')
      }
      else{
        html = html.replace('[type]','')
      }
      html = html.replace('[sex]',sexHtml[voice.sex] || '')
      list.push({
        value:voice.name,
        html:html,
        name:voice.name + (voice.short ? ' ('+voice.short+')' : ''),
      })
    }
    this.modalService.selectItem('',list,(result:any)=>{
      if(result.data){
        this.caseItem.voice = result.data.value;
        this.update('voice')
      }
    },null,this.translate.instant('cases.select_voice'),{object:true})
  }

    clearVoice(event:Event){
      event.stopPropagation()
      this.caseItem.voice = ''
      this.update('voice')
    }
}
