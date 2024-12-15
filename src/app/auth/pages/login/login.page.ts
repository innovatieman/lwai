import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../../auth.service';
import { NavService } from 'src/app/services/nav.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  email = '';
  password = '';
  showPassWordReset = false;
  constructor(
    private auth: AuthService,
    public nav:NavService
  ) {}

  ngOnInit() {
    if(this.auth.userInfo.uid){
      this.nav.go('start')
    }
  }

  async login() {
    try {
      await this.auth.login(this.email, this.password);
    } catch (error) {
    }
  }

  async loginWithGoogle() {
    try {
      await this.auth.loginWithGoogle();
    } catch (error) {
    }
  }

  async sendPasswordReset() {
    if(!this.email){
      return
    }
    try {
      await this.auth.sendPasswordReset(this.email);
      this.showPassWordReset = false;
      this.email = '';
      this.password = '';
    } catch (error) {}
  }

}