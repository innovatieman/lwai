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

  cleanPhotos(){
    this.functions.httpsCallable('manualCleanPhotos')({}).subscribe(result=>{
      console.log('Cleanup successful:', result);
    })
  }


  createVideo(){
    const callable = this.functions.httpsCallable('generateHeygenVideo');
    callable({ title: 'Test Les', storyText: 'Deze is nog sneller dan de vorige keer.' }).subscribe({
      next: (result) => {
        console.log('Video creation initiated:', result);
      },
      error: (error) => {
        console.error('Error creating video:', error);
      }
    });
  }

  movePhotosBack(){
    this.functions.httpsCallable('manualMovePhotosBackFromDeleted')({}).subscribe(result=>{
      console.log('Move back successful:', result);
    })
  }



}
