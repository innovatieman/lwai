import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
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
  @Input() title:string = 'Backup'
  @Input() options:any = {}
  @Input() backups:any = []
  constructor(
    public modalController:ModalController,
    public icon:IconsService,
    public media:MediaService,
    public helpers:HelpersService,
    public translate:TranslateService
  ) { }

  ngOnInit() {

  }

  doNothing(){
    //
  }
}
