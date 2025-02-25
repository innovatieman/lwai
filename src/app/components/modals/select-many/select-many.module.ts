import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SelectManyPageRoutingModule } from './select-many-routing.module';

import { SelectManyPage } from './select-many.page';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SelectManyPageRoutingModule,
    TranslateModule.forChild(),
    FontAwesomeModule,
    PipesModule,
  ],
  declarations: [SelectManyPage]
})
export class SelectManyPageModule {}
