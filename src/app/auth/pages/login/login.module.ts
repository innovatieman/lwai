import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { LoginPageRoutingModule } from './login-routing.module';

import { LoginPage } from './login.page';
import { ComponentsModule } from 'src/app/components/components.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { CodeInputModule } from 'angular-code-input';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    LoginPageRoutingModule,
    ComponentsModule,
    FontAwesomeModule,
    ReactiveFormsModule,
    TranslateModule.forChild(),
    CodeInputModule.forRoot({
    codeLength: 6,
    isCharsCode: true,
    code: ''
  }),
  ],
  declarations: [LoginPage]
})
export class LoginPageModule {}
