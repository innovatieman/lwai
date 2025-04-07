import { Component, OnInit } from '@angular/core';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';

@Component({
  selector: 'app-user-messages',
  templateUrl: './user-messages.page.html',
  styleUrls: ['./user-messages.page.scss'],
})
export class UserMessagesPage implements OnInit {
  allMessages:any[] = []
  filterReadMessages:any[] = [false,true]
  filterArchivedMessages:any[] = [false]
  showMessage:number = -1
  constructor(
    private firestore:FirestoreService,
    public nav:NavService,
    public icon:IconsService,
    public helper:HelpersService,
    public modalService:ModalService,
  ) { }

  ngOnInit() {
    this.getMessages()
  }

  getMessages(){
    this.firestore.get('user_messages').subscribe((messages:any)=>{     
      this.allMessages = messages.map((message:any)=>{
        return {...message.payload.doc.data(),id:message.payload.doc.id}
      })  
      this.allMessages = this.allMessages.sort((a,b)=>{return b.timestamp - a.timestamp})    
    })
  }

  read(message:any){
    if(!message.read){
      this.firestore.update('user_messages',message.id,{read:true})
    }
  }
  unread(message:any){
    if(message.read){
      this.firestore.update('user_messages',message.id,{read:false})
    }
  }
  toggleFilterReadMessages(bool:boolean){
    let i = this.filterReadMessages.indexOf(bool)
    if(i == -1){
      this.filterReadMessages.push(bool)
    }else{
      this.filterReadMessages.splice(i,1)
    }
    this.filterReadMessages = JSON.parse(JSON.stringify(this.filterReadMessages))
  }
  filterReadIsActive(bool:boolean){
    return this.filterReadMessages.indexOf(bool) != -1
  }

  archive(message:any){
    if(!message.archived){
      this.firestore.update('user_messages',message.id,{archived:true})
    }
  }
  unarchive(message:any){
    if(message.archived){
      this.firestore.update('user_messages',message.id,{archived:false})
    }
  }
  toggleFilterArchivedMessages(bool:boolean){
    let i = this.filterArchivedMessages.indexOf(bool)
    if(i == -1){
      this.filterArchivedMessages.push(bool)
    }else{
      this.filterArchivedMessages.splice(i,1)
    }
    this.filterArchivedMessages = JSON.parse(JSON.stringify(this.filterArchivedMessages))
  }
  filterArchivedIsActive(bool:boolean){
    return this.filterArchivedMessages.indexOf(bool) != -1
  } 

  delete(message:any){
    this.modalService.showConfirmation('Are you sure you want to delete this message?').then((confirmed)=>{
      if(confirmed){
        this.showMessage=-1
        this.firestore.delete('user_messages',message.id)
        
      }
    })
  }

  reply(message:any){
    let fields:any[] = [
      {
        title:'Subject',
        type:'text',
        required:true,
        value:'Re: '+message.subject,
      },
      {
        title:'Message',
        type:'html',
        required:true,
        value:'Beste '+message.displayName+',<br><br><br>Met hartelijke groet,<br><br>Het AliciaLabs team<br>--------<br><br>' + message.message,
      }
    ]
    this.modalService.inputFields('reply','',fields,(result:any)=>{
      if(result.data){
        
        const emailData = {
            to: message.email,
            content: {
              subject: result.data[0].value,
              body: result.data[1].value,
              from:'Alicia Labs <user_agent@alicialabs.nl>'
            },
            language: 'en',
            data: {}
          };
        
          this.firestore.create('emailsToProcess',emailData)
          this.firestore.update('user_messages',message.id,{replied:true,replyDate:new Date().getTime(),replyMessage:result.data[1].value,replySubject:result.data[0].value})
        }
    })
  }

  doNothing(){}
}
