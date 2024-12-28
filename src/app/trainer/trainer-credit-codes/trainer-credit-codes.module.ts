import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TrainerCreditCodesPageRoutingModule } from './trainer-credit-codes-routing.module';

import { TrainerCreditCodesPage } from './trainer-credit-codes.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TrainerCreditCodesPageRoutingModule
  ],
  declarations: [TrainerCreditCodesPage]
})
export class TrainerCreditCodesPageModule {}
