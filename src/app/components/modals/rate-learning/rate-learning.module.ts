import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RateLearningPageRoutingModule } from './rate-learning-routing.module';

import { RateLearningPage } from './rate-learning.page';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ComponentsModule } from '../../components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RateLearningPageRoutingModule,
    FontAwesomeModule,
    TranslateModule.forChild(),
    PipesModule,
    ComponentsModule
  ],
  declarations: [RateLearningPage]
})
export class RateLearningPageModule {}
