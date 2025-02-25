import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { WaitVerifyPageRoutingModule } from './wait-verify-routing.module';

import { WaitVerifyPage } from './wait-verify.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    WaitVerifyPageRoutingModule
  ],
  declarations: [WaitVerifyPage]
})
export class WaitVerifyPageModule {}
