import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { InfoService } from 'src/app/services/info.service';
import { ModalService } from 'src/app/services/modal.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-types',
  templateUrl: './types.page.html',
  styleUrls: ['./types.page.scss'],
})
export class TypesPage implements OnInit {

  constructor(
    public infoService: InfoService,
    public helper:HelpersService,
    private firestore:FirestoreService,
    public translate:TranslateService,
    public icon:IconsService,
    private modalService:ModalService,
    private toast:ToastService,
  ) { }

  ngOnInit() {
  }


  deleteSubject(type:any,subject:any){
    this.modalService.showConfirmation(this.translate.instant('confirmation_questions.delete')).then((response:any)=>{
      if(response){
        this.firestore.deleteSub('conversation_types',type.id,'subjects',subject.id).then(()=>{
          this.toast.show(this.translate.instant('toast.deleted'),3000,'bottom')
        })
      }
    })
  }

  addSubject(type:any){
    let languages = []
    for(let lang in type){
      if(lang != 'id' && lang != 'order' && lang != 'subjects'){
        languages.push(lang)
      }
    }
    let items:any = [
      {title:'ID',type:'text',value:'',required:true,name:'id'},
    ]
    for(let lang of languages){
      items.push({title:this.translate.instant('languages.'+lang),type:'text',value:'',required:true,name:lang})
    }
    this.modalService.inputFields('Add Subject','',items,(response:any)=>{
      if(response.data){
        let newSubject:any = {}
        for(let item of response.data){
          newSubject[item.name] = item.value
        }
        this.firestore.setSub('conversation_types',type.id,'subjects',newSubject.id,newSubject).then(()=>{
          this.toast.show(this.translate.instant('toast.added'),3000,'bottom')
        })
      }
    })
  }

  update(type_id:string,subject_id:string,field:any,value:any){
    if(value == ''){
      this.toast.show(this.translate.instant('error_messages.field_required'),3000,'bottom')
      return
    }
    let obj:any = {}
    obj[field] = value
    this.firestore.updateSub('conversation_types',type_id,'subjects',subject_id,obj).then(()=>{
      this.toast.show(this.translate.instant('toast.updated'),3000,'bottom')
    })
  }
}
