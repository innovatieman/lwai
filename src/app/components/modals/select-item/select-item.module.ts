import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SelectItemPageRoutingModule } from './select-item-routing.module';

import { SelectItemPage } from './select-item.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule, 
    IonicModule,
    SelectItemPageRoutingModule,
    TranslateModule.forChild(),
    FontAwesomeModule,
    PipesModule,
  ],
  declarations: [SelectItemPage]
})
export class SelectItemPageModule {}
