import { Component, OnInit, ViewChild } from '@angular/core';
import { IonSelect, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { MenuPage } from 'src/app/components/menu/menu.page';
import { BackupService } from 'src/app/services/backup.service';
import { CasesService } from 'src/app/services/cases.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { InfoService } from 'src/app/services/info.service';
import { MediaService } from 'src/app/services/media.service';
import { ModalService } from 'src/app/services/modal.service';
import { SelectMenuService } from 'src/app/services/select-menu.service';

@Component({
  selector: 'app-cases',
  templateUrl: './cases.page.html',
  styleUrls: ['./cases.page.scss'],
})
export class CasesPage implements OnInit {
  // @ViewChild('selectNew', { static: false }) selectNew!: IonSelect;
  activeTab: number = 0;
  cases: any[] = []
  caseItem: any = {}
  categories: any[] = []
  categoriesList: any[] = []
  // newConversation: string = ''
  showBackups:boolean = false
  backupDate: number = 0
  extraFilters: any = {
    open_to_user: [true]
  }
  searchTerm: string = '';
  constructor(
    public firestore:FirestoreService,
    public icon:IconsService,
    private modalService:ModalService,
    public backupService:BackupService,
    public helpers:HelpersService,
    public translate:TranslateService,
    public infoService:InfoService,
    private popoverController:PopoverController,
    private selectMenuservice:SelectMenuService,
    public media:MediaService,
    private casesService:CasesService,
  ) { }


  ngOnInit() {
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
    this.loadCategories()
  }




  private loadCases(callback?:Function) {
    this.firestore.get('cases').subscribe((cases) => {
      this.cases = cases.map((casus:any) => {
        return { id: casus.payload.doc.id, ...casus.payload.doc.data() }
      })
      if(callback) callback()
    })
  }
  private loadCategories() {
    this.firestore.get('categories').subscribe((categories) => {
      this.categories = categories.map((category:any) => {
        return { id: category.payload.doc.id, ...category.payload.doc.data() }
      })
      this.categoriesList = this.categories.map((category:any) => {
        return { select: category.id, title: category.title, id: category.id, icon: 'faArrowRight' }
      })
    })
  }
  categoryInfo(id:string){
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
  }

  update(field?:string,isArray:boolean = false){
    const scrollPosition = window.scrollY;
    if(field){
      this.firestore.set('cases',this.caseItem.id,this.caseItem[field],field,isArray).then(()=>{
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
  async openAdd(){
    
    await this.modalService.selectItem('',this.categoriesList,(result:any)=>{
      if(result.data){
        let casus = this.casesService.defaultCase(result.data.id,this.categoryInfo(result.data.id).openingMessage)
        
        this.editCase(casus)
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
    if(this.extraFilters[filter].indexOf(value) > -1){
      this.extraFilters[filter].splice(this.extraFilters[filter].indexOf(value),1)
    }
    else{
      this.extraFilters[filter].push(value)
    }
  }
  filterActive(filter:any,value:any){
    return this.extraFilters[filter].indexOf(value) > -1
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
    })
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

}
