import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../../auth.service';
import { NavService } from 'src/app/services/nav.service';
import { IconsService } from 'src/app/services/icons.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  form: FormGroup;
  showPassWordReset = false;
  showPassword = false;
  constructor(
    private fb: FormBuilder,
    public auth: AuthService,
    public nav:NavService,
    public icon:IconsService,
    public translateService:TranslateService
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit() {
    this.auth.userInfo$.subscribe(userInfo => {
      if(this.auth.userInfo.uid){
        setTimeout(() => {
          if(location.href.indexOf('login')>-1){
            this.nav.go('start')
          }
        }, 500);
      }
    });
  }

  async login() {
    try {
      await this.auth.login(this.form.value.email, this.form.value.password);
    } catch (error) {
    }
  }

  async sendPasswordReset() {
    if(!this.form.value.email){
      return
    }
    try {
      await this.auth.sendPasswordReset(this.form.value.email);
      this.rememberPassword();
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

  }

}