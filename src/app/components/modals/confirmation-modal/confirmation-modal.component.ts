import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { MediaService } from 'src/app/services/media.service';

@Component({
  selector: 'app-confirmation-modal',
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.scss'],
})
export class ConfirmationModalComponent {
  @Input() message: string = 'Weet je zeker dat je dit wilt doen?';

  constructor(
    private modalController: ModalController,
    public media:MediaService
  ) {}

  dismiss(confirmed: boolean) {
    this.modalController.dismiss({
      confirmed: confirmed,
    });
  }
}