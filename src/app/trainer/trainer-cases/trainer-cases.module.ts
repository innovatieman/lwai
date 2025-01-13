import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TrainerCasesPageRoutingModule } from './trainer-cases-routing.module';

import { TrainerCasesPage } from './trainer-cases.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { ComponentsModule } from 'src/app/components/components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TrainerCasesPageRoutingModule,
    ComponentsModule,
    PipesModule,
    FontAwesomeModule
  ],
  declarations: [TrainerCasesPage]
})
export class TrainerCasesPageModule {}
