import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';

@Component({
  selector: 'app-backup',
  templateUrl: './backup.page.html',
  styleUrls: ['./backup.page.scss'],
})
export class BackupPage implements OnInit {
  // conversationId: string = 'GCkD5TPK5jsF0PMsiYHQ';
  // activeConversation: any = null;
  // userId: string = 'GI2ZFtzeeiZuAtOA4wvhyfFE3nj2';
  // loadReady: boolean = false;

  // private conversationSub!: Subscription;
  // private subCollectionSubs: Subscription[] = [];
  // private subCollections = ['messages', 'feedback', 'facts','choices','loading','phases','close','tokens','goals','background','skills'];
  

  constructor(
    private functions:AngularFireFunctions, // Assuming you have AngularFireFunctions set up
    // private firestore: AngularFirestore, // Assuming you have AngularFirestore set up
    // private auth:AuthService
  ) { }

  ngOnInit() {}

  async backupFirestore() {
    this.functions.httpsCallable('manualFirestoreBackups')({}).subscribe(result=>{
      console.log('Backup successful:', result);
    })
  }

  // getConversation(){
  //   if(!this.conversationId || this.conversationId.trim() === '') {
  //     console.warn('Geen conversationId opgegeven');
  //     return;
  //   }
  //   if(!this.userId || this.userId.trim() === '') {
  //     console.warn('Geen userId opgegeven');
  //     return;
  //   }
  //   this.loadConversation(this.conversationId);
  // }

  // async loadConversation(conversationId: string,caseItem?:any,continuing?:boolean): Promise<void> {
  //   // console.log(`users/${this.auth.userInfo.uid}/conversations/${conversationId}`)
    

  //   this.conversationSub = await this.firestore
  //     .doc(`users/${this.userId}/conversations/${conversationId}`)
  //     .valueChanges({ idField: 'conversationId' })
  //     .subscribe((conversation:any) => {
  //       // console.log(conversation)
  //       this.activeConversation = { ...conversation };
  //         // console.log(this.activeConversation)
  //       this.loadSubCollections(conversationId);
  //     })

  // }

  // loadSubCollections(conversationId: string): void {
  //   // Unsubscribe oude listeners
  //   this.subCollectionSubs.forEach((sub) => sub.unsubscribe());
  //   this.subCollectionSubs = [];

  //   this.subCollections.forEach((collectionName) => {
  //     try {
  //       const subCollectionSub = this.firestore
  //         .collection(`users/${this.userId}/conversations/${conversationId}/${collectionName}`)
  //         .valueChanges({ idField: (collectionName=='feedback' ? 'doc_id' : 'id') })
  //         .subscribe(
  //           (subCollectionData:any) => {
  //             this.activeConversation = {
  //               ...this.activeConversation,
  //               [collectionName]: subCollectionData,
  //             };
  //             this.activeConversation[collectionName] = this.activeConversation[collectionName].sort((a:any, b:any) => a.timestamp - b.timestamp);
  //           },
  //           (error) => {
  //             console.warn(`Subcollectie '${collectionName}' kon niet worden geladen:`, error);
  //           }
  //         );

  //       this.subCollectionSubs.push(subCollectionSub);
  //     } catch (error) {
  //       console.warn(`Fout bij het verwerken van subcollectie '${collectionName}':`, error);
  //     }
  //   });
  //   this.loadReady = true;
    
  // }

  // showConversation() {
  //   console.log('Subcollecties geladen:', this.activeConversation);
  // }

  // copyConversation() {
  //   let conversationCopy = JSON.parse(JSON.stringify(this.activeConversation));
  //   const messages = JSON.parse(JSON.stringify(this.activeConversation.messages));
  //   delete conversationCopy.messages;
  //   const close = JSON.parse(JSON.stringify(this.activeConversation.close));
  //   delete conversationCopy.close;
  //   const feedback = JSON.parse(JSON.stringify(this.activeConversation.feedback));
  //   delete conversationCopy.feedback;
  //   const choices = JSON.parse(JSON.stringify(this.activeConversation.choices));
  //   delete conversationCopy.choices;
  //   const loading = JSON.parse(JSON.stringify(this.activeConversation.loading));
  //   delete conversationCopy.loading;
  //   const phases = JSON.parse(JSON.stringify(this.activeConversation.phases));
  //   delete conversationCopy.phases;
  //   const tokens = JSON.parse(JSON.stringify(this.activeConversation.tokens));
  //   delete conversationCopy.tokens;
  //   const skills = JSON.parse(JSON.stringify(this.activeConversation.skills));
  //   delete conversationCopy.skills;

  //   this.firestore
  //     .collection(`users/${this.auth.userInfo.uid}/conversations`)
  //     .doc(this.conversationId)
  //     .set(conversationCopy)
  //     .then(() => {
  //       for (let i = 0; i < messages.length; i++) {
  //         let id = messages[i].id;
  //         delete messages[i].id;
  //         this.firestore
  //           .collection(`users/${this.auth.userInfo.uid}/conversations/${this.conversationId}/messages`)
  //           .doc(id)
  //           .set(messages[i])
  //       }
  //       for (let i = 0; i < close.length; i++) {
  //         let id = close[i].id;
  //         delete close[i].id;
  //         this.firestore
  //           .collection(`users/${this.auth.userInfo.uid}/conversations/${this.conversationId}/close`)
  //           .doc(id)
  //           .set(close[i])
  //       }
  //       for (let i = 0; i < feedback.length; i++) {
  //         let id = feedback[i].doc_id;
  //         delete feedback[i].doc_id;
  //         if(!id) {
  //           id = feedback[i].id;
  //           delete feedback[i].id;
  //         }
  //         this.firestore
  //           .collection(`users/${this.auth.userInfo.uid}/conversations/${this.conversationId}/feedback`)
  //           .doc(id)
  //           .set(feedback[i])
  //       }
  //       for (let i = 0; i < choices.length; i++) {
  //         this.firestore
  //           .collection(`users/${this.auth.userInfo.uid}/conversations/${this.conversationId}/choices`)
  //           .add(choices[i])
  //       }
  //       for (let i = 0; i < loading.length; i++) {
  //         let id = loading[i].id;
  //         delete loading[i].id;
  //         this.firestore
  //           .collection(`users/${this.auth.userInfo.uid}/conversations/${this.conversationId}/loading`)
  //           .doc(id)
  //           .set(loading[i])
  //       }
  //       for (let i = 0; i < phases.length; i++) {
  //         let id = phases[i].id;
  //         delete phases[i].id;
  //         this.firestore
  //           .collection(`users/${this.auth.userInfo.uid}/conversations/${this.conversationId}/phases`)
  //           .doc(id)
  //           .set(phases[i])
  //       }
  //       for (let i = 0; i < tokens.length; i++) {
  //         let id = tokens[i].id;
  //         delete tokens[i].id;
  //         this.firestore
  //           .collection(`users/${this.auth.userInfo.uid}/conversations/${this.conversationId}/tokens`)
  //           .doc(id)
  //           .set(tokens[i])
  //       }
  //       for (let i = 0; i < skills.length; i++) {
  //         let id = skills[i].id;
  //         delete skills[i].id;
  //         this.firestore
  //           .collection(`users/${this.auth.userInfo.uid}/conversations/${this.conversationId}/skills`)
  //           .doc(id)
  //           .set(skills[i])
  //       }
  //     })
  //     .catch((error) => {
  //       console.error('Error copying conversation:', error);
  //     }
  //     );

  // }
}
