import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { VerifysocialPageRoutingModule } from './verifysocial-routing.module';

import { VerifysocialPage } from './verifysocial.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { ComponentsModule } from 'src/app/components/components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    VerifysocialPageRoutingModule,
    FontAwesomeModule,
    PipesModule,
    ComponentsModule
  ],
  declarations: [VerifysocialPage]
})
export class VerifysocialPageModule {}
