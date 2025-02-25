import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PhotoGeneratorPageRoutingModule } from './photo-generator-routing.module';

import { PhotoGeneratorPage } from './photo-generator.page';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ComponentsModule } from 'src/app/components/components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PhotoGeneratorPageRoutingModule,
    PipesModule,
    FontAwesomeModule,
    ComponentsModule
  ],
  declarations: [PhotoGeneratorPage]
})
export class PhotoGeneratorPageModule {}
