import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SalesTrainingsPageRoutingModule } from './sales-trainings-routing.module';

import { SalesTrainingsPage } from './sales-trainings.page';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ComponentsModule } from '../../components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SalesTrainingsPageRoutingModule,
    FontAwesomeModule,
    TranslateModule.forChild(),
    PipesModule,
    ComponentsModule
  ],
  declarations: [SalesTrainingsPage]
})
export class SalesTrainingsPageModule {}
