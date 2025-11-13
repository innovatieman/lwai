import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { DomSanitizer } from '@angular/platform-browser';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-scorm',
  templateUrl: './scorm.page.html',
  styleUrls: ['./scorm.page.scss'],
})
export class ScormPage implements OnInit {
  scormUrl: any;
  start: boolean = false;
  closed: boolean = false;
  scormId:string = "Jh6S3CgjoFRoS99AHlywQCYsgjG3_1762808158736"
  constructor(
    public sanitizer: DomSanitizer,
    private functions:AngularFireFunctions,
    private toast:ToastService,
    private rf:ChangeDetectorRef
  ) { }

  ngOnInit() {

    (window as any).API = {
      LMSInitialize: () => {
        console.log("SCORM Init");
        return "true";
      },
      LMSFinish: () => {
        if(!this.closed){

          console.log("SCORM Finish");
          this.toast.show('SCORM sessie beëindigd', 6000);
          document.querySelector('iframe')?.remove();
          this.closed = true
          setTimeout(() => {
            this.closed = true
            this.rf.detectChanges();
          }, 200);
        }
        return "true";
      },
      LMSSetValue: (key: string, value: string) => {
        console.log("Set", key, value);
        // hier kun je Firestore aanroepen indien gewenst
        return "true";
      },
      LMSGetValue: (key: string) => {
        console.log("Get", key);
        return "";
      },
      LMSCommit: () => {
        console.log("Commit");
        return "true";
      },
      LMSGetLastError: () => "0",
      LMSGetErrorString: () => "",
      LMSGetDiagnostic: () => ""
    };

    this.setScormUrl('assets/scorm/elearning1/training.htm')

    // const callable = this.functions.httpsCallable('getScormLaunchUrl');
    // callable({ scormId: this.scormId }).subscribe({
    //   next: (result) => {
    //     console.log('Launch URL ontvangen:', result);
    //     this.setScormUrl(result.launchUrl);
    //   },
    //   error: (error) => {
    //     console.error('Fout bij ophalen launch URL:', error);
    //   }
    // });
  }

  setScormUrl(url:string){
    console.log("Setting SCORM URL:", url);
    this.scormUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      url
    );
  }


  reload(){
    location.reload();
  }
}
