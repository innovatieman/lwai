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
  fileField: any;
  // conversationId: string = 'GCkD5TPK5jsF0PMsiYHQ';
  // activeConversation: any = null;
  // userId: string = 'GI2ZFtzeeiZuAtOA4wvhyfFE3nj2';
  // loadReady: boolean = false;

  // private conversationSub!: Subscription;
  // private subCollectionSubs: Subscription[] = [];
  // private subCollections = ['messages', 'feedback', 'facts','choices','loading','phases','close','tokens','goals','background','skills'];
  

  constructor(
    private functions:AngularFireFunctions, // Assuming you have AngularFireFunctions set up
    private firestore: AngularFirestore, // Assuming you have AngularFirestore set up
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
    callable({ 
      title: 'Doel en mindset van het sollicitatiegesprek', 
      storyText: [
          "...Een sollicitatiegesprek is méér dan een beoordelingsmoment… Het is een tweezijdig gesprek waarin jij en de organisatie samen verkennen of er een goede match is. ",
          "Als je dit van tevoren helder hebt, kun je hier tijdens het gesprek bewust op sturen."
      ],
      lesson_number: '1.1',
      closing_text: 'Bedankt voor het volgen van deze les.'
    }).subscribe({
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


  clearTempUsers(){
    this.functions.httpsCallable('deleteStreamTempUsersOld')({}).subscribe(result=>{
      console.log('Temp users cleared:', result);
      for(let user of (result as any).users){
        this.functions.httpsCallable('deleteUsers')({email:user.email}).subscribe(result=>{
          console.log('Deleted user:', user.email);
        });
      }
    });


    // this.functions.httpsCallable('deleteTempUserManual')({}).subscribe(result=>{
    //   console.log('Temp users cleared:', result);
    // })
  }

  getTestUsers(){
    this.functions.httpsCallable('deleteTestUsers')({}).subscribe(result=>{
      console.log('Test users retrieved:', result);

      for(let user of (result as any).users){
        if(user.email!='mark@innovatieman.nl' && user.email!='curie@innovatieman.nl' && user.email!='basictrainer@innovatieman.nl'){
          this.functions.httpsCallable('deleteUsers')({email:user.email}).subscribe(result=>{
            console.log('Deleted user:', user.email);
          });
        }
        else{
          console.log('Skipping user:', user.email);
        }
      }

    })
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.fileField = file;
    }
    this.uploadScormFile(this.fileField,(response:any)=>{
      console.log('SCORM upload response:', response);
    })
  }




  async uploadScormFile(selectedFile:any,callback:Function){

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      let callableName = 'uploadAndUnpackScorm';
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

   sendTestMails(){

    let mails = `test6@innovatieman.nl`


    const emailData = {
        template:'free',
        language:'nl',
        to: mails, //'alicia@innovatieman.nl',
        subject: `Verzoek van Mark`,
        data:{
          subject: `Verzoek van Mark`,
          content: `Verzoek tot test<br><br>Afzender: Mark)`,
          replyTo: 'mailercheck@innovatieman.nl',
        }
      };
    
      this.firestore.collection('emailsToProcess').add(emailData);

  } 



}
