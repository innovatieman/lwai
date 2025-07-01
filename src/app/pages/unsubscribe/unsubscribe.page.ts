import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/auth/auth.service';
import { IconsService } from 'src/app/services/icons.service';
import { NavService } from 'src/app/services/nav.service';

@Component({
  selector: 'app-unsubscribe',
  templateUrl: './unsubscribe.page.html',
  styleUrls: ['./unsubscribe.page.scss'],
})
export class UnsubscribePage implements OnInit {
  emailFlow: string = ''
  userId: string = ''
  message: string = 'Momentje geduld...';
  ready: boolean = false;
  success: boolean = false;
  constructor(
    public auth:AuthService,
    public icon:IconsService,
    public nav:NavService
  ) { }

  ngOnInit() {
  }

  toLogin(){
    this.nav.go('login');
  }

  ionViewDidEnter() {
    let queryParams = new URLSearchParams(window.location.search);
    this.emailFlow = queryParams.get('emailFlow') || '';
    this.userId = queryParams.get('userId') || '';

    if(this.emailFlow && this.userId) {
      this.unsubscribe();
    }
  }

  async unsubscribe() {
    const url = 'https://europe-west1-lwai-3bac8.cloudfunctions.net/emailUnsubscribe';
    const obj = {
      userId: this.userId,
      emailFlow: this.emailFlow
    };
    console.log("Unsubscribing with data:", obj);
    const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(obj),
        });
        const responseData = await response;
        if (!responseData.ok) {
          this.message = 'Er is iets misgegaan, probeer het later opnieuw.';
          this.ready = true;
          this.success = false;
          console.error("Request failed:", response.status, response.statusText);
          return;
        }
        else {
          this.message = 'Je bent succesvol uitgeschreven.';
          this.ready = true;
          this.success = true;
        }
        console.log("Response data:", responseData);
  }

}
