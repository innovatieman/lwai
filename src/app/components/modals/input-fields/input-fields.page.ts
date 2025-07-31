import { ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
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
import { AngularFireFunctions } from '@angular/fire/compat/functions';

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
  [x: string]: any;
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
  @ViewChild('fileInput') fileInput:any;
  
  showHtml:boolean=false
  constructor(
    public icons:IconsService,
    // public modal:ModalController,
    private toast:ToastService,
    public modalController:ModalController,
    private rf:ChangeDetectorRef,
    private translate:TranslateService,
    public helpers:HelpersService,
    public nav:NavService,
    private functions:AngularFireFunctions
  ) { 
    moment().locale('nl')
  }

  ngOnInit() {
    this.showEditor();
  }

  triggerFileInputClick() {
    this.fileInput?.nativeElement?.click();
  }
  clearFile(field:any) {
    field.value = '';
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }
  showValue(field:any){
    console.log(field)
  }
  dateSelected($event:any){
    // console.log($event)
  }
  fileField:any = {}
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.fileField = file;
    }
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
  action(action:string){
    this[action]()
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
        message:this.translate.instant('confirmation_questions.delete'),
      },
    })
    modalItem.onWillDismiss().then((result:any)=>{
      if(result.data?.confirmed){
        setTimeout(() => {
          this.modalController.dismiss('delete')
        }, 1000);
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

  async save(){
    
    let noWaiting = true
    for (let i=0;i<this.fields.length;i++) {
      if(this.fields[i].required&&!this.fields[i].value){
        this.toast.hideLoader()
        this.toast.show('* '+ this.translate.instant('error_messages.required'),null,'middle')
        return
      }
      if(this.fields[i].pattern && this.fields[i].value){
        let reg = new RegExp(this.fields[i].pattern)
        if(!reg.test(this.fields[i].value)){
          this.toast.hideLoader()
          this.toast.show(this.fields[i].title + ' ' + this.translate.instant('error_messages.invalid_input'),null,'middle')
          return
        }
      }
      if(this.fields[i].maxLength && this.fields[i].value?.length>this.fields[i].maxLength){
        this.toast.hideLoader()
        this.toast.show(this.fields[i].title + ' ' + this.translate.instant('error_messages.max_length_exceeded', { maxLength: this.fields[i].maxLength }), null, 'middle')
        return
      }
      if(this.fields[i].type=='html'){
        if(!this.fields[i].value){this.fields[i].value = ''}
        this.fields[i].value = this.fields[i].value
          .split('</ol><p><br></p><p>').join('</ol>')
          .split('</p><p><br></p><ol>').join('<ol>')
          .split('</ul><p><br></p><p>').join('</ul>')
          .split('</p><p><br></p><ul>').join('<ul>')
          .split('<p><br></p>').join('<br>')
          .split('</p><br><p>').join('<br><br>')
          .split('</p><p>').join('<br>')
          .split('&nbsp;').join(' ')
      }
      if(this.fields[i].type=='file'){
        noWaiting = false
        console.log('file',this.fileField)
        if(this.fileField.name){
          this.toast.showLoader()
          await this.uploadFile(this.fileField,(response:any)=>{
            this.fields[i].value = response.result.url
            this.fields[i].fileName = this.fileField.name
            this.toast.hideLoader()
            this.modalController.dismiss(this.fields)
            noWaiting = true
          },this.fields[i].infoItem)
        }
        else{
          noWaiting = true
        }
      }
    }
    if(noWaiting){
      this.modalController.dismiss(this.fields)
      // this.toast.hideLoader()
    }
    
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
        if(htmlBtn){
          htmlBtn.innerHTML = 'HTML'
          htmlBtn.style.width = '50px'
          htmlBtn.addEventListener('click', (event:any)=> {
            for(let i=0;i<this.fields.length;i++){
              if(this.fields[i].type=='html'){
                this.fields[i].value = this.fields[i].value
                .split('</ol><p><br></p><p>').join('</ol>')
                .split('</p><p><br></p><ol>').join('<ol>')
                .split('</ul><p><br></p><p>').join('</ul>')
                .split('</p><p><br></p><ul>').join('<ul>')
                .split('<p><br></p>').join('<br>')
                .split('</p><br><p>').join('<br><br>')
                .split('</p><p>').join('<br>')
                .split('&nbsp;').join(' ')
                this.showHtml = true 
              }
            }
          });
        }
      },300)
    },100)
  }

  async uploadFile(selectedFile:any,callback:Function,infoItem?:boolean){

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      let callableName = 'uploadFile';
      if(infoItem){
        callableName = 'uploadInfoItemFiles';
      }
      // console.log(callableName)
      const result = await this.functions.httpsCallable(callableName)({
        fileData: base64Data,
        contentType: selectedFile.type,
        fileExtension: selectedFile.name.split('.').pop()
      }).toPromise();
      callback(result)
    };
    reader.readAsDataURL(selectedFile);

   }

   standards_generate_photo(){
    this.fields[0].value = this.translate.instant('cases.generate_photo_standard_input')
    this.fields[1].value = this.translate.instant('cases.generate_photo_standard_instructions')
   }
}
