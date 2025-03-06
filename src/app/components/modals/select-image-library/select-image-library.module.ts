import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SelectImageLibraryPageRoutingModule } from './select-image-library-routing.module';

import { SelectImageLibraryPage } from './select-image-library.page';
import { ComponentsModule } from '../../components.module';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SelectImageLibraryPageRoutingModule,
    ComponentsModule,
    PipesModule,
    FontAwesomeModule,
    TranslateModule
  ],
  declarations: [SelectImageLibraryPage]
})
export class SelectImageLibraryPageModule {}
