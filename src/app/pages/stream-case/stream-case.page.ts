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

  ngOnInit() {
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

  ngOnDestroy() {
    this.leave$.next(true);
    this.leave$.complete();
  }

  getParentOrigin(): string | null {

    console.log('document', document);
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
    console.log('start stream',this.basicData);
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
          this.toast.show('Error starting stream: Invalid user data');
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


}
