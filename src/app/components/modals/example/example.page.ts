import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { LevelsService } from 'src/app/services/levels.service';

@Component({
  selector: 'app-example',
  templateUrl: './example.page.html',
  styleUrls: ['./example.page.scss'],
})
export class ExamplePage implements OnInit {
  @Input() training: any;
  vh:number = 0;
  modulesBreadCrumbs:any = [];
  constructor(
    public modalCtrl: ModalController,
    public icon: IconsService,
    public helper: HelpersService,
    public translate: TranslateService,
    public levelService:LevelsService
  ) { }

  ngOnInit() {
  }

  ngAfterViewInit(){
    this.vh = window.innerHeight * 0.01;
  }

  close() {
    this.modalCtrl.dismiss();
  }

  selectSubModule(module:any){
    this.modulesBreadCrumbs.push(module)
  }

  backBreadCrumbs(){
    if(this.modulesBreadCrumbs.length > 0){
      this.modulesBreadCrumbs.pop()
    }
  }
}
