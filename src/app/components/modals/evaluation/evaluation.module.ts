import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EvaluationPageRoutingModule } from './evaluation-routing.module';

import { EvaluationPage } from './evaluation.page';
import { ComponentsModule } from '../../components.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PipesModule } from 'src/app/pipes/pipes.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EvaluationPageRoutingModule,
    ComponentsModule,
    FontAwesomeModule,
    PipesModule
  ],
  declarations: [EvaluationPage]
})
export class EvaluationPageModule {}
