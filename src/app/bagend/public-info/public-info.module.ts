import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PublicInfoPageRoutingModule } from './public-info-routing.module';

import { PublicInfoPage } from './public-info.page';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ComponentsModule } from 'src/app/components/components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PublicInfoPageRoutingModule,
    ComponentsModule,
    FontAwesomeModule,
    PipesModule
  ],
  declarations: [PublicInfoPage]
})
export class PublicInfoPageModule {}
