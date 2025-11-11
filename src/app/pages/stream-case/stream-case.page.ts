import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute } from '@angular/router';
import { Subject, take, takeUntil } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { MediaService } from 'src/app/services/media.service';
import { NavService } from 'src/app/services/nav.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-stream-case',
  templateUrl: './stream-case.page.html',
  styleUrls: ['./stream-case.page.scss'],
})
export class StreamCasePage implements OnInit {
 basicData:any = {}
 finished:boolean = false;
 parentOrigin:string = '';
 iframeOriginal:string = '';
 
  private leave$ = new Subject<boolean>();
  constructor(
    private route:ActivatedRoute,
    public media:MediaService,
    private functions:AngularFireFunctions,
    private nav:NavService,
    private afAuth:AngularFireAuth,
    private toast:ToastService,
    private auth:AuthService
  ) { }

  async ngOnInit() {

    console.log('init stream case page');
    if(sessionStorage.getItem('iframeOriginal') && (window.location.href.endsWith('/finished'))){
      this.iframeOriginal = sessionStorage.getItem('iframeOriginal')||''; 
    }
    else{
      this.iframeOriginal = window.location.href;
      sessionStorage.setItem('iframeOriginal', this.iframeOriginal);
    }
    // window.addEventListener('message', this.receiveParentOrigin.bind(this), false);

    // Eerst checken of iemand is ingelogd
    const currentUser = await this.afAuth.currentUser;

    if (currentUser) {
      console.log('Gebruiker al ingelogd, log eerst uit...');
      await this.logoutStream();  // eerst opruimen
    }


    const stream_id = this.route.snapshot.paramMap.get('stream_id');
    if(stream_id){

      if(stream_id=='finished'){
        this.finished = true;
        return;
      }

      let data = atob(stream_id);
      try{
        this.basicData = JSON.parse(data);
        this.parentOrigin = this.getParentOrigin()||'';
        this.startStream();
      }
      catch(e){
        console.log('error parsing stream data',e);
      }
      // console.log('basic data',this.basicData);
    }
  }

//   receiveParentOrigin(event: MessageEvent) {
//     console.log(event.origin);
//     console.log(event.data);
//     console.log(event.data?.parentOrigin);
//     // Define the allowed parent domains
//   // const allowedParentDomains = ['https://innovatieman.nl', 'https://mijnlms.nl'];

//   // if (allowedParentDomains.includes(event.origin) && event.data?.parentOrigin) {
//     console.log('Ontvangen parent origin:', event.data.parentOrigin);

//     // Je kunt dit nu opslaan in een variabele
//     this.parentOrigin = event.data.parentOrigin;

//     const stream_id = this.route.snapshot.paramMap.get('stream_id');
//     if(stream_id){

//       if(stream_id=='finished'){
//         this.finished = true;
//         return;
//       }

//       let data = atob(stream_id);
//       try{
//         this.basicData = JSON.parse(data);
//         this.parentOrigin = this.getParentOrigin()||'';
//         this.startStream();
//       }
//       catch(e){
//         console.log('error parsing stream data',e);
//       }
//       // console.log('basic data',this.basicData);
//     }

//     // this.startStream();
//     // En meesturen naar je cloud function:
//     // this.functions.httpsCallable('validateEmbedToken')({
//     //   token: this.token,
//     //   parentOrigin: this.parentOrigin,
//     // }).subscribe(result => {
//     //   console.log('Token gevalideerd:', result);
//     // }, err => {
//     //   console.error('Validatie mislukt:', err);
//     // });
//   // } else {
//   //   console.warn('Ongeldige of ontbrekende parentOrigin ontvangen', event);
//   // }
// }
  restartStream(){
    location.href = this.iframeOriginal;
  }

  ngOnDestroy() {
    this.leave$.next(true);
    this.leave$.complete();
  }

  getParentOrigin(): string | null {
    try {
      let ref = document.referrer;
      if (!ref){
        return '';
      };
      const url = new URL(ref);
      return url.origin;
    } catch {
      return '';
    }
  }

  count:number = 0;

  async startStream(){
    // console.log('start stream',this.basicData);
    if(!this.basicData.trainerId || !this.basicData.trainingId || !this.basicData.caseId){
      this.toast.show('Trainer ID, Training ID and Case ID are required');
      return;
    }
    const streamData = {
      trainerId: this.basicData.trainerId,
      trainingId: this.basicData.trainingId,
      caseId: this.basicData.caseId,
      parentOrigin: this.parentOrigin
    }
    // console.log('stream data',streamData);
    try{
      this.functions.httpsCallable('startStreaming')({ stream: btoa(JSON.stringify(streamData)) }).pipe(take(1)).subscribe(async (res:any) => {
        console.log('stream result',res);
        if(res && res.user && res.user.token){
          await this.afAuth.signInWithCustomToken(res.user.token);

         this.auth.userInfo$.pipe(takeUntil(this.leave$)).subscribe(userInfo => {
            // console.log('user info after sign in',userInfo);
            if (userInfo && userInfo.uid) {
              localStorage.setItem('activatedCase',res.case.id)
              localStorage.setItem('personalCase',JSON.stringify(res.case))
              this.nav.go('conversation/'+res.case.id);
            }
          });
        } else {
          // this.toast.show('Error starting stream: Invalid user data');
          this.toast.show('Error starting stream: '+res.result);
        }
      }, (error) => {
        console.error('Error calling startStream function:', error);
        this.toast.show('Error starting stream: '+error.message);
      });
    } catch (error:any) {
      console.error('Error starting stream:', error);
      this.toast.show('Error starting stream: '+error.message);
  }
}


// async logoutStream(): Promise<void> {
//     try {
//       await this.afAuth.signOut();
//       this.auth.userInfo = {}
//     } catch (error) {
//       console.error('Logout error:', error);
//       this.toast.show('logout failed');
//     }
//   }

  async logoutStream(): Promise<void> {
    try {
      const currentUser = await this.afAuth.currentUser;
      if (currentUser) {
        console.log('Signing out...');
        await this.afAuth.signOut();
        this.auth.userInfo = {};
      } else {
        console.log('No user signed in, skipping logout.');
      }
    } catch (error) {
      console.error('Logout error:', error);
      this.toast.show('logout failed');
    }
  }

}
