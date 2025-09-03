import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TrainerInfoPageRoutingModule } from './trainer-info-routing.module';

import { TrainerInfoPage } from './trainer-info.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { ComponentsModule } from '../../components.module';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TrainerInfoPageRoutingModule,
    FontAwesomeModule,
    PipesModule,
    ComponentsModule,
    TranslateModule.forChild()
  ],
  declarations: [TrainerInfoPage]
})
export class TrainerInfoPageModule {}
