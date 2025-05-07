import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { InfoItemsPageRoutingModule } from './info-items-routing.module';

import { InfoItemsPage } from './info-items.page';
import { ComponentsModule } from 'src/app/components/components.module';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { QuillModule } from 'ngx-quill';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    InfoItemsPageRoutingModule,ComponentsModule,
    PipesModule,
    FontAwesomeModule,
    TranslateModule,
    QuillModule
  ],
  declarations: [InfoItemsPage]
})
export class InfoItemsPageModule {}
