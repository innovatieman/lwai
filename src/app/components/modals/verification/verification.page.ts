import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { MediaService } from 'src/app/services/media.service';

@Component({
  selector: 'app-verification',
  templateUrl: './verification.page.html',
  styleUrls: ['./verification.page.scss'],
})
export class VerificationPage implements OnInit {
  title: string = 'Bevestigen';
  message: string = 'Weet je het zeker';
  buttons: any[] = [
    {
      text: 'Annuleren',
      value: false,
      color: 'dark',
    },
    {
      text: 'OK',
      value: true,
      color: 'primary',
    }
  ]

  constructor(
    private modalCtrl: ModalController,
    public media: MediaService,
    private route: ActivatedRoute,
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe((params:any) => {
      if (params.title) {
        this.title = params.title;
      }
      if (params.message) {
        this.message = params.message;
      }
      if (params.buttons) {
        this.buttons = JSON.parse(params.buttons);
      }
    });
  }

  dismiss(choice?:any) {
    this.modalCtrl.dismiss(choice);
  }
}
