import { Component, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { VerifyPageRoutingModule } from './verify-routing.module';

import { VerifyPage } from './verify.page';
import { ComponentsModule } from 'src/app/components/components.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    VerifyPageRoutingModule,
    ComponentsModule,
    FontAwesomeModule,
    TranslateModule.forChild()
  ],
  declarations: [VerifyPage]
})
export class VerifyPageModule {}
