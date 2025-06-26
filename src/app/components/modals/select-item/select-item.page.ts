import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { IconsService } from 'src/app/services/icons.service';
import * as moment from 'moment'
import { TranslateService } from '@ngx-translate/core';
import { FilterSearchPipe } from 'src/app/pipes/filter-search.pipe';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-select-item',
  templateUrl: './select-item.page.html',
  styleUrls: ['./select-item.page.scss'],
})
export class SelectItemPage implements OnInit {
  @Input() text:string = ''
  @Input() list:any = []
  @Input() iconList:boolean = false
  @Input() title:string = ''
  @Input() extraData:any
  // title:string=''
  // text:string=''
  // list:any;
  multiple:boolean=false
  // extraData:any
  fields:any = ''
  // iconList:boolean=false
  search:string=''
  
  constructor(
    public icon:IconsService,
    public modalController:ModalController,
    public translate:TranslateService,
    private filterSearch:FilterSearchPipe,
    private toast:ToastService
  ) { 
    moment().locale('nl')
  }

  ngOnInit() {
    // this.text = this.navParams.get('text')
    // this.list = this.navParams.get('list')
    // this.iconList = this.navParams.get('iconList')
    // this.title = this.navParams.get('title')
    // this.extraData = this.navParams.get('extraData')
    if(!this.title){
      this.title = 'Selecteer'
    }
    console.log(this.list)
    console.log(this.extraData)
  }

  formattedDate(date:any){
    // if(!date){return ''}
    if(!moment(date).isValid()){
      return date
    }
    return moment(date).format(this.translate.instant('date_format_long'))
  }
  preventBubble(event:any){
    event.stopPropagation()
  }

  doNothing(){
    //do nothing
  }
  get allSelected(){

    for(let key in this.filterSearch.transform(this.list,this.search,false,[this.extraData.field])){
      if(!this.filterSearch.transform(this.list,this.search,false,[this.extraData.field])[key].selected){
        return false
      }
    }
    return true
  }

  selectAll(clear?:boolean){
    if(this.allSelected||clear){
      for(let key in this.filterSearch.transform(this.list,this.search,false,[this.extraData.field])){
        this.filterSearch.transform(this.list,this.search,false,[this.extraData.field])[key].selected = false
      }
    }
    else{
      
      for(let key in this.filterSearch.transform(this.list,this.search,false,[this.extraData.field])){
        this.filterSearch.transform(this.list,this.search,false,[this.extraData.field])[key].selected = true
      }
    }
  }

  okMultiple(){
    let selectedList = []
    let allList = JSON.parse(JSON.stringify(this.filterSearch.transform(this.list,this.search,false,[this.extraData.field])))
    


    for(let key in allList){
      if(allList[key].selected){
        delete allList[key].selected
        selectedList.push(allList[key])
      }
    }
    if(selectedList.length==0&&!this.extraData.allowEmpty){
      this.toast.show(this.translate.instant('error_messages.no_selection'),null,'middle')
      return
    }
    this.modalController.dismiss(selectedList)
  }
}
