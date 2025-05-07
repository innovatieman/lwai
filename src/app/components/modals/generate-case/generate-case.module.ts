import { NgModule, Pipe } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { GenerateCasePageRoutingModule } from './generate-case-routing.module';

import { GenerateCasePage } from './generate-case.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ComponentsModule } from '../../components.module';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    GenerateCasePageRoutingModule,
    FontAwesomeModule,
    PipesModule,
    ComponentsModule,
    TranslateModule.forChild()
  ],
  declarations: [GenerateCasePage]
})
export class GenerateCasePageModule {}
