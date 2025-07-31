import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/auth/auth.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';
import { ModalService } from 'src/app/services/modal.service';
import { SelectMenuService } from 'src/app/services/select-menu.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-mailflow',
  templateUrl: './mailflow.page.html',
  styleUrls: ['./mailflow.page.scss'],
})
export class MailflowPage implements OnInit {
  allMails: any[] = [];
  selectedItem: any = null;
  newMailItem: any = {
    title: 'Nieuwe E-Mail',
    from: 'Alicia Labs Conversations <user_agent@alicialabs.nl>',
    subject: '',
    body: '',
    flow: 'registration',
    days: 1,
    active: false,
    information: '',
    exclude:{
      has_training: false,
      has_organisation: false,
      has_conversation: false,
      is_customer: false,
      has_no_training: false,
      has_no_organisation: false,
      has_no_conversation: false,
      is_no_customer: false
    }
  };
  selectedFlows: string[] = []
  constructor(
    private fire:AngularFirestore,
    public icon:IconsService,
    public modalService:ModalService,
    public helpers:HelpersService,
    public translate:TranslateService,
    private popoverController:PopoverController,
    private selectMenuservice:SelectMenuService,
    public media:MediaService,
    public auth:AuthService,
    private functions:AngularFireFunctions,
    private toast:ToastService,
  ) { }

  ngOnInit() {
    this.getAllMails();
  }

  getAllMails() {
    this.fire.collection('mailflow').valueChanges({ idField: 'id' }).subscribe((mails: any[]) => {
      this.allMails = mails;
      for(let mail of this.allMails) {
        if(!mail.exclude) {
          mail.exclude = {
            has_training: false,
            has_organisation: false,
            has_conversation: false,
            is_customer: false,
            has_no_training: false,
            has_no_organisation: false,
            has_no_conversation: false,
            is_no_customer: false
          };
        }
      }
      this.allMails = this.allMails.sort((a, b) => {
        return a.days - b.days || a.title.localeCompare(b.title);
      });
    });
  }

  newMail() {
    let obj = JSON.parse(JSON.stringify(this.newMailItem));
    this.modalService.inputFields('Nieuwe E-Mail','',[
      {
        name: 'title',
        type: 'text',
        title: 'Titel',
        value: obj.title
      },
      {
        name: 'information',
        type: 'textarea',
        title: 'Informatie voor admin',
        value: obj.information,
        rows: 3
      },
      {
        name: 'from',
        type: 'text',
        title: 'Van',
        value: obj.from
      },
      {
        name: 'flow',
        type: 'select',
        title: 'Flow',
        value: obj.flow,
        options:['direct','registration', 'inspiration', 'learning', 'customer']
      },
      {
        name: 'days',
        type: 'number',
        title: 'Dagen vanaf start',
        value: obj.days
      },
      {
        name: 'subject',
        type: 'text',
        title: 'Onderwerp',
        value: obj.subject
      },
      {
        name: 'body',
        type: 'html',
        title: 'Bericht',
        value: obj.body
      },

    ],((result:any)=>{
      if(result.data){
        this.fire.collection('mailflow').add({
          title: result.data[0].value,
          information: result.data[1].value,
          from: result.data[2].value,
          flow: result.data[3].value,
          days: result.data[4].value,
          subject: result.data[5].value,
          body: result.data[6].value,
          created: new Date(),
          created_by: this.auth.userInfo.displayName,
          updated_by:this.auth.userInfo.displayName,
          updated:new Date(),
          active: false,
          exclude:{
            has_training: false,
            has_organisation: false,
            has_conversation: false,
            is_customer: false,
            has_no_training: false,
            has_no_organisation: false,
            has_no_conversation: false,
            is_no_customer: false
          }
        });
      }
    }))
  }

  editMail(item:any,event?:Event) {
    if(event){
      event.stopPropagation();
      event.preventDefault();
    }
    let obj = JSON.parse(JSON.stringify(item));
    this.modalService.inputFields('E-Mail Bewerken','',[
      {
        name: 'title',
        type: 'text',
        title: 'Titel',
        value: obj.title
      },
      {
        name: 'information',
        type: 'textarea',
        title: 'Informatie voor admin',
        value: obj.information,
        rows: 3
      },
      {
        name: 'from',
        type: 'text',
        title: 'Van',
        value: obj.from
      },
      {
        name: 'flow',
        type: 'select',
        title: 'Flow',
        value: obj.flow,
        options:['direct','registration', 'inspiration', 'learning', 'customer']
      },
      {
        name: 'days',
        type: 'number',
        title: 'Dagen vanaf start',
        value: obj.days
      },
      {
        name: 'subject',
        type: 'text',
        title: 'Onderwerp',
        value: obj.subject
      },
      {
        name: 'body',
        type: 'html',
        title: 'Bericht',
        value: obj.body
      },

    ],((result:any)=>{
      console.log(result);
      if(result.data=='delete'){
        this.fire.collection('mailflow').doc(item.id).delete();
        return;
      }
      if(result.data){
        this.fire.collection('mailflow').doc(item.id).update({
          title: result.data[0].value,
          information: result.data[1].value,
          from: result.data[2].value,
          flow: result.data[3].value,
          days: result.data[4].value,
          subject: result.data[5].value,
          body: result.data[6].value,
          updated_by:this.auth.userInfo.displayName,
          updated:new Date()
        });
      }
    }),{delete:true})
  }

  toggleActive(item:any,event?:Event) {
    if(event){
      event.stopPropagation();
      event.preventDefault();
    }
    this.fire.collection('mailflow').doc(item.id).update({
      active: !item.active,
      updated_by:this.auth.userInfo.displayName,
      updated:new Date()
    });
  }

  startMailFlow(){
    this.toast.show('Dit is voor test doeleinden en doet nu even niets.');
    return
    this.functions.httpsCallable('testMailFlow')({ days: 1 }).subscribe((response:any)=>{
      console.log('Mail flow started:', response);
    });
  }

  toggleExclude(item:any, field:string, event?:Event) {
    if(event){
      event.stopPropagation();
      event.preventDefault();
    }
    item.exclude[field] = !item.exclude[field];
    this.fire.collection('mailflow').doc(item.id).update({
      exclude: item.exclude,
      updated_by:this.auth.userInfo.displayName,
      updated:new Date()
    });
  }

  get allFlows() {
    let flows:any[] = [];
    this.allMails.forEach((mail:any) => {
      if (!flows.includes(mail.flow)) {
        flows.push(mail.flow);
      }
    });
    return flows.sort();
  }


  toggleFlow(flow:string){
    if(this.selectedFlows.includes(flow)){
      this.selectedFlows = []
    }
    else{
      this.selectedFlows = [flow]
    }
  }

  flowSelected(flow:string){
    return this.selectedFlows.includes(flow)
  }

}
