import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { AuthService } from 'src/app/auth/auth.service';
import { IconsService } from 'src/app/services/icons.service';

@Component({
  selector: 'app-unsubscribe',
  templateUrl: './unsubscribe.page.html',
  styleUrls: ['./unsubscribe.page.scss'],
})
export class UnsubscribePage implements OnInit {
  emailFlow: string = ''
  userId: string = ''
  constructor(
    public auth:AuthService,
    public icon:IconsService,
    private functions:AngularFireFunctions
  ) { }

  ngOnInit() {
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
        if (!response.ok) {
          console.error("Request failed:", response.status, response.statusText);
          return;
        }
        const responseData = await response;
        console.log("Response data:", responseData);
  }

}
