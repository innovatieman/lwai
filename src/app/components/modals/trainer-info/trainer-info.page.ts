import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';
import { InputFieldsPage } from '../input-fields/input-fields.page';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { take } from 'rxjs';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-trainer-info',
  templateUrl: './trainer-info.page.html',
  styleUrls: ['./trainer-info.page.scss'],
})
export class TrainerInfoPage implements OnInit {
  @Input() trainerInfo: any;
  constructor(
    public media: MediaService,
    public modalController: ModalController,
    public icon: IconsService,
    private translateService: TranslateService,
    private functions:AngularFireFunctions,
    private toast:ToastService,
  ) { }

  ngOnInit() {
    // console.log(this.trainerInfo);
  }

  async sendEmail(){
    let fields = [
      {
        title:this.translateService.instant('menu.feedback_subject'),
        type:'text',
        required:true,
        value:'',
      },
      {
        title:this.translateService.instant('menu.feedback_message'),
        type:'textarea',
        // placeholder:this.translateService.instant('feedback'),
        required:true,
        value:'',
      }
    ]


    const modalItem = await this.modalController.create({
      component:InputFieldsPage,
      componentProps:{
        text:'',
        fields:fields,
        title:this.translateService.instant('buttons.send_message'),
        extraData:{}
      },
      cssClass:'infoModal',
    })
    modalItem.onWillDismiss().then(result=>{
      if(result.data){
        this.toast.showLoader()
        let subject = result.data[0].value
        let content = result.data[1].value
        this.functions.httpsCallable('sendEmailToTrainer')({
          trainerId:this.trainerInfo.trainerId ? this.trainerInfo.trainerId : this.trainerInfo.id,
          subject:subject,
          content:content,
        }).pipe(take(1)).subscribe(res=>{
          this.toast.hideLoader()
          if(res.success){
            this.toast.show(this.translateService.instant('messages.email_sent'))
          }
          else{
            this.toast.show(this.translateService.instant('error_messages.failure'))
          }
        })
      }
    })
    return await modalItem.present()
  }


}
