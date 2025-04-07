import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { InputFieldsPageRoutingModule } from './input-fields-routing.module';

import { InputFieldsPage } from './input-fields.page';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { QuillModule } from 'ngx-quill';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    InputFieldsPageRoutingModule,
    FontAwesomeModule,
    TranslateModule.forChild(),
    PipesModule,
    QuillModule,
  ],
  declarations: [InputFieldsPage]
})
export class InputFieldsPageModule {}
