import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';

@Component({
  selector: 'app-backup-modal',
  templateUrl: './backup-modal.page.html',
  styleUrls: ['./backup-modal.page.scss'],
})
export class BackupModalPage implements OnInit {
  title:string = 'Backup'
  options:any = {}
  backups:any = []
  constructor(
    public modalController:ModalController,
    private navParams:NavParams,
    public icon:IconsService,
    public media:MediaService,
    public helpers:HelpersService,
    public translate:TranslateService
  ) { }

  ngOnInit() {
    if(this.navParams.get('title')){
      this.title = this.navParams.get('title')
    }
    if(this.navParams.get('options')){
      this.options = this.navParams.get('options')
    }
    if(this.navParams.get('backups')){
      this.backups = this.navParams.get('backups')
    }
  }

  doNothing(){
    //
  }
}
