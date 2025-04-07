import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SocialsPageRoutingModule } from './socials-routing.module';

import { SocialsPage } from './socials.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { ComponentsModule } from 'src/app/components/components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SocialsPageRoutingModule,
    FontAwesomeModule,
    PipesModule,
    ComponentsModule
  ],
  declarations: [SocialsPage]
})
export class SocialsPageModule {}
