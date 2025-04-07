import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { MediaService } from 'src/app/services/media.service';

@Component({
  selector: 'app-verification',
  templateUrl: './verification.page.html',
  styleUrls: ['./verification.page.scss'],
})
export class VerificationPage implements OnInit {
  title: string = this.translate.instant('buttons.confirm');
  message: string = this.translate.instant('confirmation_questions.default_question');
  buttons: any[] = [
    {
      text: this.translate.instant('buttons.cancel'),
      value: false,
      color: 'dark',
      fill:'solid'
    },
    {
      text: this.translate.instant('buttons.ok'),
      value: true,
      color: 'primary',
      fill:'solid'
    }
  ]

  constructor(
    private modalCtrl: ModalController,
    public media: MediaService,
    private route: ActivatedRoute,
    private translate: TranslateService
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
