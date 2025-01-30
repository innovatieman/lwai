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
  constructor(
    public firestore:FirestoreService,
    public icon:IconsService,
    private modal:ModalService,
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
    this.loadCases()
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

  update(field?:string){
    const scrollPosition = window.scrollY;
    if(field){
      this.firestore.set('cases',this.caseItem.id,this.caseItem[field],field).then(()=>{
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
    
    this.shortMenu = await this.popoverController.create({
      component: MenuPage,
      componentProps:{
        customMenu:true,
        pages:this.categoriesList
      },
      cssClass: 'customMenu',
      event: event,
      translucent: false,
    });
    this.shortMenu.shadowRoot.lastChild.lastChild['style'].cssText = 'border-radius: 24px !important;';

    await this.shortMenu.present()
    await this.shortMenu.onWillDismiss();


    if(this.selectMenuservice.selectedItem){
      console.log(this.categoryInfo(this.selectMenuservice.selectedItem.id))
      let casus = this.casesService.defaultCase(this.selectMenuservice.selectedItem.id,this.categoryInfo(this.selectMenuservice.selectedItem.id).openingMessage)
        
        this.editCase(casus)
        
    }
    
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

    this.modal.showConversationStart({admin:true,conversationInfo:this.categoryInfo(this.caseItem.conversation),...caseItem}).then((res:any)=>{
          
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


  // add(){
  //   if(this.newConversation){
  //     let casus =
  //       {
  //         conversation:this.newConversation,
  //         open_to_user:false,
  //         open_to_public:false,
  //         open_to_admin:true,
  //         title:'New Case',
  //         role:'',
  //         description:'',
  //         attitude:1
  //       }
  //     this.newConversation = ''
      
  //     this.modal.showConversationStart({admin:true,...casus}).then((res:any)=>{

  //         console.log(res)
  //       })
        
        
  //   }
  // }

  deleteCase(){
    this.modal.showConfirmation('Are you sure you want to delete this case?').then((result:any) => {
      if(result){
        this.firestore.delete('cases',this.caseItem.id)
        this.caseItem = {}
        this.loadCases()
      }
    })
  }

  getBackups(type:string,agent:string){
    this.backupService.getBackups(type,agent,(backups:any)=>{
      this.modal.backups(this.backupService.backups,{},'Select a backup to restore',(response:any)=>{
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
    this.modal.showConfirmation('Are you sure you want to restore this backup?').then((result:any) => {
      if(result){
        delete obj.id
        this.firestore.create('cases',obj).then(()=>{
          this.loadCases()
          this.showBackups = false
        })
      }
    })

  }

}
