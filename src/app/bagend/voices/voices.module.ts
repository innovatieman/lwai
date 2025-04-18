import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { VoicesPageRoutingModule } from './voices-routing.module';

import { VoicesPage } from './voices.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { ComponentsModule } from 'src/app/components/components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    VoicesPageRoutingModule,
    FontAwesomeModule,
    PipesModule,
    ComponentsModule,
  ],
  declarations: [VoicesPage]
})
export class VoicesPageModule {}
