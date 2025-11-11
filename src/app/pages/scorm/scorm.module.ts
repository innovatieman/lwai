import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ScormPageRoutingModule } from './scorm-routing.module';

import { ScormPage } from './scorm.page';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { ComponentsModule } from 'src/app/components/components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ScormPageRoutingModule,
    PipesModule,
    ComponentsModule
  ],
  declarations: [ScormPage]
})
export class ScormPageModule {}
