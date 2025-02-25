import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { IconsService } from 'src/app/services/icons.service';
import { ToastService } from 'src/app/services/toast.service';
import * as moment from 'moment'
import { SelectItemPage } from '../select-item/select-item.page';
import { TranslateService } from '@ngx-translate/core';
import { HelpersService } from 'src/app/services/helpers.service';
import { NavService } from 'src/app/services/nav.service';
import { EditHtmlPage } from '../edit-html/edit-html.page';
import { ConfirmationModalComponent } from '../confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-input-fields',
  templateUrl: './input-fields.page.html',
  styleUrls: ['./input-fields.page.scss'],
})
export class InputFieldsPage implements OnInit {
  title:string=''
  text:string=''
  fields:any[]= [];
  extraData:any

  constructor(
    public icons:IconsService,
    public modal:ModalController,
    private navParams:NavParams,
    private toast:ToastService,
    private modalController:ModalController,
    private rf:ChangeDetectorRef,
    private translate:TranslateService,
    public helpers:HelpersService,
    public nav:NavService
  ) { 
    moment().locale('nl')
  }

  ngOnInit() {
    this.title = this.navParams.get('title')
    this.text = this.navParams.get('text')
    this.fields = this.navParams.get('fields')
    this.extraData = this.navParams.get('extraData')
    // console.log(this.fields)
  }

  dateSelected($event:any){
    // console.log($event)
  }

  selectDate(date:any,index:number,showTime?:boolean | null,min?:any,max?:any){
    if(!date){date=moment()}
    this.toast.selectDate(date,(response:any)=>{
      if(response){
        this.fields[index].value = response
      }
    },showTime,{min:min,max:max})
  }
  
  formattedDate(date:any){
    // if(!date){return ''}
    if(!moment(date).isValid()){
      return date
    }
    return moment(date).locale('nl').format(this.translate.instant('date_formats.long'))
  }

  doNothing(){
    //Do nothing
  }

  async showConfirmation(message: string): Promise<boolean> {
    const modalItem = await this.modalController.create({
      component: ConfirmationModalComponent,
      componentProps: {
        message: message,
      },
    });

    await modalItem.present();

    const { data } = await modalItem.onWillDismiss();
    return data?.confirmed || false; // Retourneert true of false
  }

  async deleteItem(){
    const modal = await this.modalController.create({
      component:ConfirmationModalComponent,
      componentProps:{
        message:this.translate.instant('confirmation_questions_delete'),
      },
    })
    modal.onWillDismiss().then((data:any)=>{
      if(data?.confirmed){
        this.modal.dismiss('delete')
      }
    })
    return await modal.present()
  }


  public async selectItem(options:any,index:number,title:string,object?:boolean){
    let iconList = false
    if(title=='icon'){iconList = true}
    let list = []
    if(options[0]){
      list = options
    }
    else{
      list= Object.keys(options)
    }
    const modal = await this.modalController.create({
      component:SelectItemPage,
      componentProps:{
        list:list,
        iconList:iconList,
        extraData:{object:object}
      },
      cssClass:'listModal',
    })
    modal.onWillDismiss().then(result=>{
      if(result.data){
        // console.log(result.data)
        if(result.data.valueOnly){
          this.fields[index].value = result.data.value
        }
        else{
          this.fields[index].value = result.data
        }
        this.rf.detectChanges()
      }
    })
    return await modal.present()
  }

  save(){
    for (let i=0;i<this.fields.length;i++) {
      if(this.fields[i].required&&!this.fields[i].value){
        this.toast.show('* '+ this.translate.instant('error_messages.required'),null,'middle')
        return
      }
      if(this.fields[i].pattern && this.fields[i].value){
        let reg = new RegExp(this.fields[i].pattern)
        if(!reg.test(this.fields[i].value)){
          this.toast.show(this.fields[i].title + ' ' + this.translate.instant('error_messages.invalid_input'),null,'middle')
          return
        }
      }
    }
    this.modal.dismiss(this.fields)
    
  }

  editHtml(field:any){
    this.editHtmlItem(field,(response:any)=>{
      if(response.data){
        field.value = response.data.value
      }
    })
  }

  public async editHtmlItem(data:any,callback:Function){
    const modal = await this.modalController.create({
      component:EditHtmlPage,
      componentProps:{
        data:data,
      },
      cssClass:'editHtmlModal',
    })
    modal.onWillDismiss().then(data=>{
      callback(data)
    })
    return await modal.present()
    // return await modal.present
  }

}
