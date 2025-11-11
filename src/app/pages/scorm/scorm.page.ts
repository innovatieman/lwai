import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-scorm',
  templateUrl: './scorm.page.html',
  styleUrls: ['./scorm.page.scss'],
})
export class ScormPage implements OnInit {
  scormUrl: any;
  scormId:string = "Jh6S3CgjoFRoS99AHlywQCYsgjG3_1762808158736"
  constructor(
    public sanitizer: DomSanitizer,
    private functions:AngularFireFunctions
  ) { }

  ngOnInit() {

    (window as any).API = {
      LMSInitialize: () => {
        console.log("SCORM Init");
        return "true";
      },
      LMSFinish: () => {
        console.log("SCORM Finish");
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

    // this.setScormUrl('assets/scorm/' + this.scormId + '/index.html')

    const callable = this.functions.httpsCallable('getScormLaunchUrl');
    callable({ scormId: this.scormId }).subscribe({
      next: (result) => {
        console.log('Launch URL ontvangen:', result);
        this.setScormUrl(result.launchUrl);
      },
      error: (error) => {
        console.error('Fout bij ophalen launch URL:', error);
      }
    });
  }

  setScormUrl(url:string){
    console.log("Setting SCORM URL:", url);
    this.scormUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      url
    );
  }

}
