import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../../auth.service';
import { NavService } from 'src/app/services/nav.service';
import { IconsService } from 'src/app/services/icons.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { MediaService } from 'src/app/services/media.service';
import { ToastService } from 'src/app/services/toast.service';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  form: FormGroup = {} as FormGroup;
  showPassWordReset = false;
  showPassword = false;
  oobCode:string = '';
  loading = false;
  type:string = 'login'; // login, reset
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    public auth: AuthService,
    public nav:NavService,
    public icon:IconsService,
    public translateService:TranslateService,
    public media:MediaService,
    private toast:ToastService,
    private functions:AngularFireFunctions
  ) {
  }
  
  ngOnInit() {
    this.form = this.fb.group({
      email: [this.nav.email || '', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.auth.userInfo$.subscribe(userInfo => {
      if(this.auth.userInfo.uid){
        setTimeout(() => {
          if(location.href.indexOf('login')>-1){
            if(this.nav.redirectUrl){
              this.nav.go(this.nav.redirectUrl)
              this.nav.redirectUrl = null
            }else{
              this.nav.go('start')
            }
          }
        }, 500);
      }
      else{
        setTimeout(() => {
          if(!this.auth.userInfo.uid && this.nav.redirectUrl && this.type!=='create_password'){
            this.toast.show(this.translateService.instant('page_login.redirect_first_login'),10000,'middle')
          }
        }, 2000);
      }
    });


    this.route.params.subscribe(params => {
      const type = params['type'];
      if (type=='create_password') {
        this.type = 'create_password'
        this.forgotPassword()
        // this.showPassWordReset = true;
      }
    })

  }

  async login() {
    try {
      await this.auth.login(this.form.value.email, this.form.value.password);
    } catch (error) {
    }
  }

  async sendPasswordReset() {

    
    if(!this.form.controls['email'].value){
      return
    }
    try {
      if(this.type==='create_password'){
        this.toast.showLoader(this.translateService.instant('page_login.sending_set_password'))
      }
      else{
        this.toast.showLoader(this.translateService.instant('page_wait_verify.issend'))
      }
      // await this.auth.sendPasswordReset(this.form.value.email);
      this.functions.httpsCallable('reSendVerificationEmail')({email:this.form.controls['email'].value,displayName:'',template:'reset_password'}).subscribe((response:any)=>{
        this.toast.hideLoader()
          if(response.status==200){
            // this.toast.show('Email verstuurd')
            this.showResetPassword = true
          }
          else{
            this.toast.show('Er is iets misgegaan')
          }
      })
      // this.rememberPassword();
    } catch (error) {}
  }

  forgotPassword(){
    this.showPassWordReset = true;
    let email = this.form.value.email;
    this.form = this.fb.group({
      email: [email, [Validators.required, Validators.email]],
    });
  }

  rememberPassword(){
    let email = this.form.value.email;
    this.form = this.fb.group({
      email: [email, [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
    this.showPassWordReset = false;
    this.showResetPassword = false;
    this.oobCode = '';
    this.verifyCode = {
      code:'',
    }

  }

  showResetPassword:boolean = false;
  emailResend:string = '';
  verifyCode:any = {
    code:'',
  }
  onCodeChanged(code: string) {
    // console.log(code)
    this.emailResend = ''
    this.verifyCode = {
      code:''
    }
  }
  
  // this called only if user entered full code
  onCodeCompleted(code: string) {
    console.log(this.form)
    this.verifyCode = {
      code:code
    }
    this.toast.showLoader(this.translateService.instant('page_wait_verify.code_checking'))
    this.functions.httpsCallable('verifyEmailInitCode')({code:code,email:this.form.value.email}).subscribe((response:any) => {
      console.log(response)
      if(response.status==200){
        let email = this.form.value.email;
        this.form = this.fb.group({
          email: [email, [Validators.required, Validators.email]],
          password: ['', [Validators.required, Validators.minLength(6)]],
        });
        this.oobCode = response.result.oobCode
        this.verifyCode.valid = true
      }
      else if (response.result == 'code not valid') {
        this.verifyCode.invalid = true
      }
      else if (response.result == 'code expired') {
        this.verifyCode.expired = true
      }
      else{
        this.verifyCode.error = true
      }
      this.toast.hideLoader()
    })
  }

  resend(){
    this.emailResend = ''
    this.toast.showLoader(this.translateService.instant('page_wait_verify.issend'))
    this.toast.showLoader(this.translateService.instant('page_wait_verify.issend'))
      // await this.auth.sendPasswordReset(this.form.value.email);
      this.functions.httpsCallable('reSendVerificationEmail')({email:this.form.value.email,displayName:'',template:'reset_password'}).subscribe((response:any)=>{
        this.toast.hideLoader()
          if(response.status==200){
             this.toast.show(this.translateService.instant('page_wait_verify.issend'))
            this.toast.hideLoader()
          }
          else{
            this.toast.show(this.translateService.instant('error_messages.failure'))
          }
      })
    
    // this.auth.resendEmailVerification((response:any)=>{
    //   this.toast.hideLoader()
    //   if(response?.status==200){
    //     this.emailResend = 'Email is opnieuw verstuurd'
    //     this.toast.hideLoader()
    //   }
    //   else{
    //     this.emailResend = 'Er is iets misgegaan'
    //     this.toast.hideLoader()
    //   }
    // });
  }

  resetPassword(){
    console.log(this.form.value.password)
    this.auth.ResetPWCustom(this.form.value.password,this.oobCode,(response:any)=>{
      
      if(response&&response.message){
        this.toast.show(this.translateService.instant('page_login.reset_fail')) //'De link is te oud, vraag opnieuw om een reset bericht.' //response.message
        this.loading = false
      }
      else{
        this.toast.show(this.translateService.instant('page_login.reset_done'),6000,'middle')
        setTimeout(()=>{
          this.loading = false
          // this.auth.logout()
          // this.nav.go('my-account')
        },6000)
      }
      this.toast.hideLoader()
    })

  }
}