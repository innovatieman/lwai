import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';

@Component({
  selector: 'app-options-modal',
  templateUrl: './options-modal.page.html',
  styleUrls: ['./options-modal.page.scss'],
})
export class OptionsModalPage implements OnInit {
  title:string='';
  options:any[] = [];
  intro:string = '';
  buttons!:any[]
  btnsClass:string = ''
  @ViewChild("iframe",{static:false}) iframe!: ElementRef;

  constructor(
    public modalController:ModalController,
    private navParams:NavParams,
    public icon:IconsService,
    public media:MediaService,
    // private translate:TranslateService,
  ) { 

  }

  ngOnInit() {
    if(this.navParams.get('title')){
      this.title = this.navParams.get('title')
    }
    if(this.navParams.get('options')){
      this.options = this.navParams.get('options')
    }
    if(this.navParams.get('intro')){
      this.intro = this.navParams.get('intro')
    }
    if(this.navParams.get('buttons')){
      this.buttons = this.navParams.get('buttons')
    }
    if(this.navParams.get('btnsClass')){
      this.btnsClass = this.navParams.get('btnsClass')
    }
  }


}
