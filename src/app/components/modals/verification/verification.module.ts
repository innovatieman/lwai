import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { VerificationPageRoutingModule } from './verification-routing.module';

import { VerificationPage } from './verification.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    VerificationPageRoutingModule,
    FontAwesomeModule,
    TranslateModule.forChild()
  ],
  declarations: [VerificationPage]
})
export class VerificationPageModule {}
