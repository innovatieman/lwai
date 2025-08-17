import { Component, Input, OnInit } from '@angular/core';
import { ModalController, PopoverController } from '@ionic/angular';
import { AuthService } from 'src/app/auth/auth.service';
import { NavService } from 'src/app/services/nav.service';
import { InfoModalPage } from '../info-modal/info-modal.page';
import { ConversationStartPage } from '../conversation-start/conversation-start.page';
import { MediaService } from 'src/app/services/media.service';
import { TranslateService } from '@ngx-translate/core';
import { FirestoreService } from 'src/app/services/firestore.service';
import { ToastService } from 'src/app/services/toast.service';
import { MenuPage } from '../../menu/menu.page';
import { SelectMenuService } from 'src/app/services/select-menu.service';

@Component({
  selector: 'app-caseinfo',
  templateUrl: './caseinfo.page.html',
  styleUrls: ['./caseinfo.page.scss'],
})
export class CaseinfoPage implements OnInit {
  @Input() caseItem:any ={}
  isTrainer:boolean = false
  constructor(
    public modalController:ModalController,
    public popoverController:PopoverController,
    public nav:NavService,
    public auth:AuthService,
    public media:MediaService,
    private translate:TranslateService,
    private firestore:FirestoreService,
    private toast:ToastService,
    public selectMenuservice:SelectMenuService,
  ) { }

  ngOnInit() {
    // console.log(this.caseItem)

    this.auth.hasActive('trainer').subscribe((trainer)=>{
      this.isTrainer = trainer
    })
  }

  
  noCredits(){
    this.showInfo({
      title:this.translate.instant('credits.no_credits'),
      content:this.translate.instant('credits.no_credits_conversation'),
      buttons:[
        {text:this.translate.instant('buttons.back'),value:'',color:'secondary',fill:'outline'},
        {text:this.translate.instant('credits.buy_credits'),value:'credits',color:'primary',fill:'solid'},
      ]
    },(response:any)=>{
      if(response.data=='credits'){
        this.nav.go('account/credits')
        this.modalController.dismiss()
      }
    })
  }

  private async showInfo(options:any,callback?:any){
    if(options.backdropDismiss==undefined){options.backdropDismiss = true}
    const modalItem = await this.modalController.create({
      component:InfoModalPage,
      componentProps:{
        options:options
      },
      backdropDismiss:options.backdropDismiss,
      cssClass:'infoModal',
    })
    if(callback){
      modalItem.onWillDismiss().then(data=>{
        callback(data)
      })
    }
    return await modalItem.present()
  }

  startConversation(caseItem:any){
    this.modalController.dismiss()
    this.showConversationStart(caseItem).then((res)=>{
      // console.log(res)
      if(res){
        localStorage.setItem('activatedCase',caseItem.id)
        localStorage.setItem('personalCase',JSON.stringify(caseItem))
        this.nav.go('conversation/'+caseItem.id)
      }
    })
  }

    async showConversationStart(caseItem: any): Promise<boolean> {
      console.log(caseItem);
      const modalItem = await this.modalController.create({
        component: ConversationStartPage,
        backdropDismiss: false,
        componentProps: {
          caseItem: caseItem,
        },
        cssClass: 'caseModal',
      });
  
      await modalItem.present();
  
      const { data } = await modalItem.onWillDismiss();
      return data || false; // Retourneert true of false
    }

    shortMenu:any
    async copyItemAsTrainer(item:any,event:Event){
      event.stopPropagation()
      console.log(item)
      for(let key in item){
        if(item[key] == undefined){
          item[key] = ''
        }
      }
      if(this.auth.organisations.length==1){
        item.trainerId = this.nav.activeOrganisationId
        delete item.id
        this.firestore.createSub('trainers',this.nav.activeOrganisationId,'cases',item).then((res:any)=>{
          this.toast.show(this.translate.instant('cases.case_copied_to_trainer'))
        })
      }
      else{
        let list = []
        for(let i=0;i<this.auth.organisations.length;i++){
          list.push({
            title:this.auth.organisations[i].name,
            icon:this.auth.organisations[i].logo ? '' :'faStar',
            image:this.auth.organisations[i].logo ? this.auth.organisations[i].logo : '',
            // url:'/trainer/trainings',
            id:this.auth.organisations[i].id,
            value:this.auth.organisations[i].id,
          })
        }
    
        this.shortMenu = await this.popoverController.create({
          component: MenuPage,
          componentProps:{
            customMenu:true,
            pages:list
          },
          cssClass: 'customMenu',
          event: event,
          translucent: false,
          reference:'trigger',
        });
        this.shortMenu.shadowRoot.lastChild.lastChild['style'].cssText = 'border-radius: 24px !important;';
        await this.shortMenu.present();
        await this.shortMenu.onWillDismiss().then((result:any)=>{
          if(this.selectMenuservice.selectedItem){
            item.trainerId = this.selectMenuservice.selectedItem.id
            this.firestore.createSub('trainers',this.selectMenuservice.selectedItem.id,'cases',item).then((res:any)=>{
                this.toast.show(this.translate.instant('cases.case_copied_to_trainer'))
              })
          }
        })
      }
    }

}
