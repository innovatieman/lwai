import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Auth, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AuthService } from '../../auth.service';
import { NavService } from 'src/app/services/nav.service';
import { IconsService } from 'src/app/services/icons.service';
import { TranslateService } from '@ngx-translate/core';
import { PopoverController } from '@ionic/angular';
import { SelectMenuService } from 'src/app/services/select-menu.service';
import { MenuPage } from 'src/app/components/menu/menu.page';
import { AngularFireFunctions } from '@angular/fire/compat/functions';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {
  registerForm: FormGroup;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    public auth: AuthService,
    public nav: NavService,
    public icon: IconsService,
    public translateService: TranslateService,
    private popoverController: PopoverController,
    private selectMenuservice:SelectMenuService,
    private functions: AngularFireFunctions,
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit() {
    this.auth.userInfo$.subscribe(userInfo => {
      if(this.auth.userInfo.uid){
        console.log('userInfo',userInfo)
        this.nav.go('start')
      }
    });
  }

  doNothing() {}

  async registerWithEmail() {
    const { email, password } = this.registerForm.value;
    this.auth.register(email, password);
  }

  

  async registerWithApple() {
    // Apple Sign-In logica (bijvoorbeeld via capacitor)
    console.log('Apple Sign-In nog niet geïmplementeerd.');
  }

  async registerWithFacebook() {
    // Facebook Login logica (bijvoorbeeld via capacitor)
    console.log('Facebook Sign-In nog niet geïmplementeerd.');
  }


  

}