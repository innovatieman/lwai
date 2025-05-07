import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { FirestoreService } from 'src/app/services/firestore.service';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-analyse-conversations',
  templateUrl: './analyse-conversations.page.html',
  styleUrls: ['./analyse-conversations.page.scss'],
})
export class AnalyseConversationsPage implements OnInit {
  startDate:any = '2025-04-12T00:00:00Z';
  endDate:any = '2025-14-14T00:00:00Z';
  conversations:any[] = [];
  constructor(
    public nav:NavService,
    public icon:IconsService,
    private functions:AngularFireFunctions,
    private firestore:FirestoreService,
    public media:MediaService,
    private toast:ToastService,
    public modal:ModalService
  ) { }

  ngOnInit() {
  }

  loadConversations(){
    this.functions.httpsCallable('getConversationsByDateRange')({startDate:this.startDate,endDate:this.endDate}).subscribe((res:any) => {
      console.log(res);
      // this.conversations = 
    })
  }

}
