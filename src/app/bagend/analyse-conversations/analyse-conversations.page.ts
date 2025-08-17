import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { map, switchMap } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
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
  conversations:any = [];
  constructor(
    public nav:NavService,
    public icon:IconsService,
    private functions:AngularFireFunctions,
    private firestore:FirestoreService,
    public media:MediaService,
    private toast:ToastService,
    public modal:ModalService,
    private fire:AngularFirestore
  ) { }

  ngOnInit() {
  }

  loadConversations(){
    this.functions.httpsCallable('getConversationsByDateRange')({startDate:this.startDate,endDate:this.endDate}).subscribe((res:any) => {
      console.log(res);
      // this.conversations = 
    })
  }

  users: any = [];
  loadOpenConversations() {
  this.fire
    .collection('users')
    .snapshotChanges()
    .pipe(
      // Stap 1: Haal alle users op
      map((docs: any[]) =>
        docs.map((e: any) => ({
          id: e.payload.doc.id,
          ...e.payload.doc.data(),
        }))
      ),
      // Stap 2: Haal per user zijn conversaties op en voeg die toe aan het user-object
      switchMap((users: any[]) =>
        combineLatest(
          users.map(user =>
            this.fire
              .collection(`users/${user.id}/conversations`)
              .get()
              .pipe(
                map(conversationsSnapshot => {
                  const conversations = conversationsSnapshot.docs.map((doc:any) => ({
                    idNew: doc.id,
                    ...doc.data(),
                  }));
                  return {
                    ...user,
                    conversations: conversations,
                  };
                })
              )
          )
        )
      )
    )
    .subscribe((usersWithConversations: any[]) => {
      this.users = usersWithConversations;
      console.log(this.users);
    });
  }

  // updateConversations(){
  //   let count = 0;
  //   this.users.forEach((user:any) => {
  //     user.conversations.forEach((conversation:any) => {
  //       if(conversation.trainer_id && !conversation.trainerId){
  //         // conversation.trainerId = conversation.trainer_id;
  //         count++;
  //         console.log(count, user.id, conversation.idNew, conversation.trainer_id, conversation.trainerId);
  //       }
  //     });
  //   });
  // }

}
