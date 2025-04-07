import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
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
  @Input() title:string=''
  @Input() text:string=''
  @Input() fields:any[]= [];
  @Input() extraData:any
  @Input() data:any
  configModules={
    toolbar: {
      container:[
        ['bold', 'italic', 'underline'],
        [{ 'color': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        [{ 'align': [] }],
        ['link'],
        ['clean'],
        ['HTML'],
      ],
      clipboard: {
        matchVisual: false
      }
    }
  }
  showHtml:boolean=false
  constructor(
    public icons:IconsService,
    // public modal:ModalController,
    private toast:ToastService,
    public modalController:ModalController,
    private rf:ChangeDetectorRef,
    private translate:TranslateService,
    public helpers:HelpersService,
    public nav:NavService
  ) { 
    moment().locale('nl')
  }

  ngOnInit() {

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
    const modalItem = await this.modalController.create({
      component:ConfirmationModalComponent,
      componentProps:{
        message:this.translate.instant('confirmation_questions_delete'),
      },
    })
    modalItem.onWillDismiss().then((data:any)=>{
      if(data?.confirmed){
        this.modalController.dismiss('delete')
      }
    })
    return await modalItem.present()
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
    const modalItem = await this.modalController.create({
      component:SelectItemPage,
      componentProps:{
        list:list,
        iconList:iconList,
        extraData:{object:object}
      },
      cssClass:'listModal',
    })
    modalItem.onWillDismiss().then(result=>{
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
    return await modalItem.present()
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
      if(this.fields[i].type=='html'){
        this.fields[i].value = this.fields[i].value
          .split('</ol><p><br></p><p>').join('</ol>')
          .split('</p><p><br></p><ol>').join('<ol>')
          .split('</ul><p><br></p><p>').join('</ul>')
          .split('</p><p><br></p><ul>').join('<ul>')
          .split('<p><br></p>').join('<br>')
          .split('</p><br><p>').join('<br><br>')
          .split('</p><p>').join('<br>')
      }
    }
    this.modalController.dismiss(this.fields)
    
  }

  editHtml(field:any){
    this.editHtmlItem(field,(response:any)=>{
      if(response.data){
        field.value = response.data.value
      }
    })
  }

  public async editHtmlItem(data:any,callback:Function){
    const modalItem = await this.modalController.create({
      component:EditHtmlPage,
      componentProps:{
        data:data,
      },
      cssClass:'editHtmlModal',
    })
    modalItem.onWillDismiss().then(data=>{
      callback(data)
    })
    return await modalItem.present()
    // return await modal.present
  }

  showEditor(){
    this.showHtml = false
    setTimeout(() => {
      let elements = document.getElementsByClassName("ql-container")
      for(let i=0;i<elements.length;i++){
        elements[i].setAttribute('style','height:calc(100% - 42px);border:0;')
      }
      elements = document.getElementsByClassName("ql-toolbar")
      for(let i=0;i<elements.length;i++){
        elements[i].setAttribute('style','border:0;')
      }
      setTimeout(() => {

        let htmlBtn:any = document.querySelector('.ql-HTML');
        htmlBtn.innerHTML = 'HTML'
        htmlBtn.style.width = '50px'
        htmlBtn.addEventListener('click', (event:any)=> {
          this.data.value = this.data.value
          .split('</ol><p><br></p><p>').join('</ol>')
          .split('</p><p><br></p><ol>').join('<ol>')
          .split('</ul><p><br></p><p>').join('</ul>')
          .split('</p><p><br></p><ul>').join('<ul>')
          .split('<p><br></p>').join('<br>')
          .split('</p><br><p>').join('<br><br>')
          .split('</p><p>').join('<br>')
          .split('&nbsp;').join(' ')

          this.showHtml = true 
        });
      },300)
    },100)
  }


}
