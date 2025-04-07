import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EditHtmlPageRoutingModule } from './edit-html-routing.module';

import { EditHtmlPage } from './edit-html.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { QuillModule } from 'ngx-quill';
import { ComponentsModule } from '../../components.module';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EditHtmlPageRoutingModule,
    PipesModule,
    ComponentsModule,
    QuillModule,
    FontAwesomeModule,
    TranslateModule.forChild()
  ],
  declarations: [EditHtmlPage]
})
export class EditHtmlPageModule {}
