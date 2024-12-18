import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';
import { ToastService } from 'src/app/services/toast.service';
@Component({
  selector: 'app-info-modal',
  templateUrl: './info-modal.page.html',
  styleUrls: ['./info-modal.page.scss'],
})
export class InfoModalPage implements OnInit {
  title:string='';
  content:string='';
  buttons!:any[]
  video:boolean = false
  videoLoaded:boolean = false
  btnsClass:string = ''
  @ViewChild("iframe",{static:false}) iframe!: ElementRef;

  constructor(
    public modal:ModalController,
    private navParams:NavParams,
    public icon:IconsService,
    private toast:ToastService,
    public media:MediaService,
    private translate:TranslateService,
  ) { 

  }

  ngOnInit() {
    if(!this.videoLoaded&&this.video){
      this.toast.showLoader()
    }
    if(this.navParams.get('title')){
      this.title = this.navParams.get('title')
    }
    else if(!this.navParams.get('video')){
      this.title = this.translate.instant('toast_header')
    }
    if(this.navParams.get('content')){
      this.content = this.navParams.get('content')
    }
    if(this.navParams.get('video')){
      this.video = this.navParams.get('video')
    }
    if(this.navParams.get('buttons')){
      this.buttons = this.navParams.get('buttons')
    }
    if(this.navParams.get('btnsClass')){
      this.btnsClass = this.navParams.get('btnsClass')
    }
  }

  hideLoader(){
    setTimeout(() => {
      this.toast.hideLoader()
    }, 2000);
  }
}