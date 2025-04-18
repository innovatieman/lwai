import { Component, OnInit } from '@angular/core';
import { Auth, applyActionCode } from '@angular/fire/auth';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute } from '@angular/router';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';
import { AuthService } from '../../auth.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-verify',
  templateUrl: './verify.page.html',
  styleUrls: ['./verify.page.scss'],
})
export class VerifyPage implements OnInit {
  isVerifying = true;
  isVerified = false;
  isError = false;

  constructor(
    private auth: Auth,
    private route: ActivatedRoute,
    private modalService:ModalService,
    private nav:NavService,
    private functions:AngularFireFunctions,
    public authService: AuthService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    const oobCode = this.route.snapshot.queryParams['oobCode'];
    if (oobCode) {
      applyActionCode(this.auth, oobCode)
        .then(() => {
          this.isVerifying = false;
          this.isVerified = true; // Verificatie is geslaagd
          this.authService.reloadCredentials();
          setTimeout(() => {
            this.nav.go('start');
          }, 5000);
        })
        .catch((error) => {
          console.error('Verification error:', error);
          this.isVerifying = false;
          this.isError = true; // Verificatie is mislukt
          setTimeout(() => {
            this.nav.go('login');
          }, 5000);
        });
    } else {
      this.isVerifying = false;
      this.isError = true; // Geen oobCode aanwezig in de URL
    }
  }

  resendVerification() {
    if(this.authService.userInfo.email){
      const callable = this.functions.httpsCallable('reSendVerificationEmail');
      callable({ email: this.authService.userInfo.email, displayName: this.authService.userInfo.displayName}).subscribe((result) => {
        this.modalService.showText(this.translate.instant('page_verify.issend'),this.translate.instant('page_verify.success'));
      });
    }
    else{
      this.modalService.showText(this.translate.instant('page_verify.mail_unkown'),this.translate.instant('page_verify.failure'));
    }
  }

}
