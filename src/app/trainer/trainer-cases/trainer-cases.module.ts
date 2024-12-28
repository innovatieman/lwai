import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TrainerCasesPageRoutingModule } from './trainer-cases-routing.module';

import { TrainerCasesPage } from './trainer-cases.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TrainerCasesPageRoutingModule
  ],
  declarations: [TrainerCasesPage]
})
export class TrainerCasesPageModule {}
