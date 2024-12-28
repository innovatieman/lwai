import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { IconsService } from 'src/app/services/icons.service';
import { InfoService } from 'src/app/services/info.service';
import { MediaService } from 'src/app/services/media.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-conversation-start',
  templateUrl: './conversation-start.page.html',
  styleUrls: ['./conversation-start.page.scss'],
})
export class ConversationStartPage implements OnInit {
  caseItem:any = {}
  step = 0
  constructor(
    public modalCtrl:ModalController,
    private navParams:NavParams,
    public icon:IconsService,
    private toast:ToastService,
    public media:MediaService,
    private translate:TranslateService,
    public info:InfoService
  ) { }

  ngOnInit() {
    if(this.navParams.get('caseItem')){
      console.log(this.caseItem)
      this.caseItem = this.navParams.get('caseItem')
    }
  }

  slide(nr:number){
    this.step = nr
  }
  close(){
    this.modalCtrl.dismiss(this.caseItem)
  }

  ngOnDestroy(){
    console.log('destroy')

  }
}
