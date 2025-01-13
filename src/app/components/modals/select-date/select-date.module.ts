import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SelectDatePageRoutingModule } from './select-date-routing.module';

import { SelectDatePage } from './select-date.page';
//import { DatePickerModule } from 'ionic4-date-picker';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SelectDatePageRoutingModule,
    //DatePickerModule,
  ],
  declarations: [SelectDatePage],
  exports:[]
})
export class SelectDatePageModule {}
