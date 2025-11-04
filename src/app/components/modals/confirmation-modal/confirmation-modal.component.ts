import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { MediaService } from 'src/app/services/media.service';

@Component({
  selector: 'app-confirmation-modal',
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.scss'],
})
export class ConfirmationModalComponent {
  @Input() message: string = this.translate.instant('confirmation_questions.default_question');

  constructor(
    private modalController: ModalController,
    public media:MediaService,
    public translate:TranslateService
  ) {}

  dismiss(confirmed: boolean) {
    this.modalController.dismiss({
      confirmed: confirmed,
    });
  }
}