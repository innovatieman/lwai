import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { SortByPipe } from 'src/app/pipes/sort-by.pipe';
import { HelpersService } from 'src/app/services/helpers.service';
import { MediaService } from 'src/app/services/media.service';

@Component({
  selector: 'app-select-many',
  templateUrl: './select-many.page.html',
  styleUrls: ['./select-many.page.scss'],
})
export class SelectManyPage implements OnInit {
  @Input() properties:any = {}
  search:string = ''
  localItems:any[] = []
  localItemsOriginal:any[] = []
  constructor(
    public modalController: ModalController,
    public translate:TranslateService,
    public helper:HelpersService,
    public media:MediaService,
    public sortByPipe:SortByPipe

  ) { }

  ngOnInit() {
    this.localItems = JSON.parse(JSON.stringify(this.properties.list))
    this.localItems = this.sortByPipe.transform(this.localItems,-1,'order')
    if(this.properties.value){
      this.localItems.forEach((item:any) => {
        item[this.properties.subList].forEach((subItem:any) => {
          if(this.properties.value.indexOf(subItem.id) > -1){
            console.log(subItem.id, this.properties.value)
            subItem.selected = true
          }
        })
      })
    }
    this.localItemsOriginal = JSON.parse(JSON.stringify(this.localItems))
    console.log(this.localItems)
  }

  dismiss(obj?:any) {
    if(obj){
      this.modalController.dismiss(obj);
    }
    else{
      this.modalController.dismiss();
    }
  }

  get changes(){
    if(!this.localItemsOriginal?.length) return false
    if(!this.localItems?.length) return false
    for(let i=0; i<this.localItems.length; i++){
      for(let j=0; j<this.localItems[i][this.properties.subList].length; j++){
        if(
          (this.localItems[i][this.properties.subList][j].selected && !this.localItemsOriginal[i][this.properties.subList][j].selected) ||
          (!this.localItems[i][this.properties.subList][j].selected && this.localItemsOriginal[i][this.properties.subList][j].selected)
        ){
          return true
        }
      }
    }
    return false
  }


  save(){
    let value = []
    for(let i=0; i<this.localItems.length; i++){
      for(let j=0; j<this.localItems[i][this.properties.subList].length; j++){
        if(this.localItems[i][this.properties.subList][j].selected){
          value.push(this.localItems[i][this.properties.subList][j].id)
        }
      }
    }
    // alleen unieke items in value
    value = value.filter((v, i, a) => a.indexOf(v) === i)
    this.dismiss(value)
  }
}
