import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TrainerInfoItemsPageRoutingModule } from './trainer-info-items-routing.module';

import { TrainerInfoItemsPage } from './trainer-info-items.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { ComponentsModule } from 'src/app/components/components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TrainerInfoItemsPageRoutingModule,
    ComponentsModule,
    PipesModule,
    FontAwesomeModule
  ],
  declarations: [TrainerInfoItemsPage]
})
export class TrainerInfoItemsPageModule {}
