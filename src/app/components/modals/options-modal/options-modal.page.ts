import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { ModalController, } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';

@Component({
  selector: 'app-options-modal',
  templateUrl: './options-modal.page.html',
  styleUrls: ['./options-modal.page.scss'],
})
export class OptionsModalPage implements OnInit {
  @Input() options:any[] = [];
  @Input() intro:string = '';
  @Input() title:string = '';

  constructor(
    public modalController:ModalController,
    public icon:IconsService,
    public media:MediaService,
    // private translate:TranslateService,
  ) { 

  }

  ngOnInit() {

   
  }


}
