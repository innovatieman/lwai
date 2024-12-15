import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { OptionsModalPageRoutingModule } from './options-modal-routing.module';

import { OptionsModalPage } from './options-modal.page';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    OptionsModalPageRoutingModule,
    FontAwesomeModule,
    PipesModule
  ],
  declarations: [OptionsModalPage]
})
export class OptionsModalPageModule {}
