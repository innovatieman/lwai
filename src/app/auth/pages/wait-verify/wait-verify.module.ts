import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { WaitVerifyPageRoutingModule } from './wait-verify-routing.module';

import { WaitVerifyPage } from './wait-verify.page';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsModule } from 'src/app/components/components.module';
import { CodeInputModule } from 'angular-code-input';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    WaitVerifyPageRoutingModule,
    PipesModule,
    FontAwesomeModule,
    TranslateModule.forChild(),
    ComponentsModule,
    CodeInputModule.forRoot({
      codeLength: 6,
      isCharsCode: true,
      code: ''
    }),
  ],
  declarations: [WaitVerifyPage]
})
export class WaitVerifyPageModule {}
