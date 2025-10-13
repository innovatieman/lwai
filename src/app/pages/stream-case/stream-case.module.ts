import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { StreamCasePageRoutingModule } from './stream-case-routing.module';

import { StreamCasePage } from './stream-case.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    StreamCasePageRoutingModule
  ],
  declarations: [StreamCasePage]
})
export class StreamCasePageModule {}
