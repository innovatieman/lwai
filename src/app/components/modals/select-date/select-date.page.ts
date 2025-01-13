import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment'

@Component({
  selector: 'app-select-date',
  templateUrl: './select-date.page.html',
  styleUrls: ['./select-date.page.scss'],
})
export class SelectDatePage implements OnInit {
  date:string
  extraData:any = {}
  // showTime:boolean
  // time:any
  // timePickerObj:any = {}
  constructor(
    private navParams:NavParams,
    public modal:ModalController,
    public translate:TranslateService
  ) { 
    // this.date = new Date()
    // console.log(this.date)
    // console.log(this.date.getFullYear())
    if(this.navParams.get('date')&&typeof this.navParams.get('date') != 'string'){
      this.date = moment(this.navParams.get('date')).format('YYYY-MM-DD') 
      // console.log(this.date)
      if(this.navParams.get('extraData')&&this.navParams.get('extraData').min){
        if(moment(this.navParams.get('date')).isBefore(this.extraData.min)){
          this.date = moment(this.extraData.min).format('YYYY-MM-DD')
        }
      }
      else if(this.navParams.get('extraData')&&this.navParams.get('extraData').max){
        if(moment(this.navParams.get('date')).isAfter(this.extraData.max)){
          this.date = moment(this.extraData.max).format('YYYY-MM-DD')
        }
      }

      this.translate.currentLang
    }
    else{
      this.date= this.navParams.get('date')
      if(this.navParams.get('extraData')){
        this.extraData= this.navParams.get('extraData')
      }
      // console.log(this.extraData)
      // console.log(this.date)
    }
  }

  ngOnInit() {
    
    if(this.navParams.get('date')&&typeof this.navParams.get('date') != 'string'){
      this.date = moment(this.navParams.get('date')).format('YYYY-MM-DD') 
    }
    else{
      this.date= this.navParams.get('date')
    }

  }

  get currentLang(){
    return this.translate.currentLang + '-' + this.translate.currentLang.toUpperCase()
  }


  selectDateClick(event:any){
    if(event?.path&&event?.path[0]?.dataset?.year){
      let year = event?.path[0]?.dataset?.year
      let month = event?.path[0]?.dataset?.month
      let day = event?.path[0]?.dataset?.day

      if(year+'-'+month+'-'+day == moment().format('YYYY-MM-DD')){
        this.modal.dismiss(year+'-'+month+'-'+day)
      }
    }

  }

  selectDate(event:any){
    if(event?.path&&event?.path[0]?.dataset?.year){
      let year = event?.path[0]?.dataset?.year
      let month = event?.path[0]?.dataset?.month
      let day = event?.path[0]?.dataset?.day

      if(year+'-'+month+'-'+day == moment().format('YYYY-MM-DD')){
        this.modal.dismiss(year+'-'+month+'-'+day)
      }
    }
    if(event.detail.value){
      let formattedDate = moment(event.detail.value).format('YYYY-MM-DD')
      this.modal.dismiss(formattedDate)
    }
  }
}
