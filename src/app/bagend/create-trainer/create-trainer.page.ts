import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/auth/auth.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { IconsService } from 'src/app/services/icons.service';
import { NavService } from 'src/app/services/nav.service';
import { ToastService } from 'src/app/services/toast.service';
import * as moment from 'moment';

@Component({
  selector: 'app-create-trainer',
  templateUrl: './create-trainer.page.html',
  styleUrls: ['./create-trainer.page.scss'],
})
export class CreateTrainerPage implements OnInit {
  trainerItem:any = {
    trainer:false,
    organisation:false,
    logo: '',
    name: '',
    invoice_redirect:true,
    video_allowed:false,
    voice_allowed:false,
    trainerPro: false,
    max_admins:2,
    max_employees:0,
  }
  constructor(
    private translate: TranslateService,
    private nav:NavService,
    public icon:IconsService,
    private firestore:FirestoreService,
    private auth:AuthService,
    private toast:ToastService,
  ) { }

  ngOnInit() {
  }

  createTrainer(){
    console.log('createTrainer', this.trainerItem);
    if(!this.trainerItem.name || this.trainerItem.name.length < 3){
      this.toast.show('Please enter a valid name for your trainer (min 3 characters)');
      return;
    }

    let newObj:any = {
      ...this.trainerItem,
      admins:[this.auth.userInfo.uid],
      adminsList:[{
        displayName: this.auth.userInfo.displayName,
        email: this.auth.userInfo.email,
        uid: this.auth.userInfo.uid
      }],
    }

    let trainerPro = this.trainerItem.trainerPro;
    let max_employees = this.trainerItem.max_employees;
    let max_admins = this.trainerItem.max_admins;
    let isTrainer = this.trainerItem.trainer;
    let isOrganisation = this.trainerItem.organisation;
    let invoice_direct = this.trainerItem.invoice_redirect;
    delete newObj.max_employees;
    delete newObj.trainerPro;
    delete newObj.max_admins;
    // delete newObj.trainer;
    // delete newObj.organisation;
    delete newObj.invoice_redirect;
    if(!isTrainer && !isOrganisation){
      this.toast.show('Please select if this is a trainer or an organisation');
      return;
    }

    if(isOrganisation && max_employees <1){
      this.toast.show('Please set a number of employees for your organisation');
      return
    }
    if(isTrainer && max_admins <1){
      this.toast.show('Please set a number of admins for your trainer');
      return
    }
    this.firestore.create('trainers', newObj,(res:any)=>{
      console.log('createTrainer res', res);
      if(res && res.id){
        if(isTrainer){
          this.firestore.setSub('trainers', res.id, 'settings', 'trainer',{
            expires: moment().add(1, 'year').unix(), // 1 year from now
            active:true,
            trainerPro,
            max_admins,
            invoice_direct,
          })
        }
        if(isOrganisation){
          this.firestore.setSub('trainers', res.id, 'settings', 'organisation',{
            expires: moment().add(1, 'year').unix(), // 1 year from now
            active:true,
            max_employees,
          })
        }
        this.toast.show('Trainer created successfully');
        this.trainerItem = {
          trainer:false,
          organisation:false,
          logo: '',
          name: '',
          invoice_redirect:true,
          video_allowed:false,
          voice_allowed:false,
          trainerPro: false,
          max_admins:2,
          max_employees:0,
        };
      }else{
        this.toast.show('Error creating trainer');
      }
    })

  }

}
