import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams, PopoverController } from '@ionic/angular';
import { IconsService } from 'src/app/services/icons.service';

@Component({
  selector: 'app-popover-menu',
  templateUrl: './popover-menu.page.html',
  styleUrls: ['./popover-menu.page.scss'],
})
export class PopoverMenuPage implements OnInit {
  list:any;
  extraData:any
  showIcon:boolean = false
  showingSubList:number|any = undefined
  showingSubSubList:number|any = undefined
  constructor(
    public icon:IconsService,
    private navParams:NavParams,
    public popOver:PopoverController
  ) { 
  }

  log(){
    // console.log(this.list)
  }
  ngOnInit() {
    this.list = this.navParams.get('list')
    // console.log(this.list)
    if(this.navParams.get('showIcon')){
      this.showIcon = true
    }
  }

  showSubList(index:number,deep?:boolean){
    if(deep){
      if(this.showingSubSubList == index){
        this.showingSubSubList = undefined
      }
      else{
        this.showingSubSubList = index
      }
    }else{
      this.showingSubSubList = undefined
      if(this.showingSubList == index){
        this.showingSubList = undefined
      }
      else{
        this.showingSubList = index
      }
    }

  }
}
