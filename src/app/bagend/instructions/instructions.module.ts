import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { InstructionsPageRoutingModule } from './instructions-routing.module';

import { InstructionsPage } from './instructions.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ComponentsModule } from 'src/app/components/components.module';
import { PipesModule } from 'src/app/pipes/pipes.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    InstructionsPageRoutingModule,
    ComponentsModule,
    FontAwesomeModule,
    PipesModule
  ],
  declarations: [InstructionsPage]
})
export class InstructionsPageModule {}
