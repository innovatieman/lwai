import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AuthService } from 'src/app/auth/auth.service';
import { NavService } from 'src/app/services/nav.service';
import { InfoModalPage } from '../info-modal/info-modal.page';
import { ConversationStartPage } from '../conversation-start/conversation-start.page';
import { MediaService } from 'src/app/services/media.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-caseinfo',
  templateUrl: './caseinfo.page.html',
  styleUrls: ['./caseinfo.page.scss'],
})
export class CaseinfoPage implements OnInit {
  @Input() caseItem:any ={}
  constructor(
    public modalController:ModalController,
    public nav:NavService,
    public auth:AuthService,
    public media:MediaService,
    private translate:TranslateService
  ) { }

  ngOnInit() {
    console.log(this.caseItem)
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

}
