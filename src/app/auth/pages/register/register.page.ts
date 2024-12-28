import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Auth, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AuthService } from '../../auth.service';
import { NavService } from 'src/app/services/nav.service';
import { IconsService } from 'src/app/services/icons.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {
  registerForm: FormGroup;


  constructor(
    private fb: FormBuilder,
    public auth: AuthService,
    public nav: NavService,
    public icon: IconsService
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit() {
    // if(this.auth.userInfo.uid){
    //   console.log(this.auth.user$)
    //   this.nav.go('start')
    // }
  }

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