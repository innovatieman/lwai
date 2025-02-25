import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TokenAnalysisPageRoutingModule } from './token-analysis-routing.module';

import { TokenAnalysisPage } from './token-analysis.page';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ComponentsModule } from 'src/app/components/components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TokenAnalysisPageRoutingModule,
    PipesModule,
    FontAwesomeModule,
    ComponentsModule
  ],
  declarations: [TokenAnalysisPage]
})
export class TokenAnalysisPageModule {}
