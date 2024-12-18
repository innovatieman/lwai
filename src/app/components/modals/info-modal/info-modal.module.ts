import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { InfoModalPageRoutingModule } from './info-modal-routing.module';

import { InfoModalPage } from './info-modal.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PipesModule } from 'src/app/pipes/pipes.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    InfoModalPageRoutingModule,
    FontAwesomeModule,
    PipesModule
  ],
  declarations: [InfoModalPage]
})
export class InfoModalPageModule {}