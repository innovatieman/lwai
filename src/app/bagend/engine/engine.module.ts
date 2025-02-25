import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EnginePageRoutingModule } from './engine-routing.module';

import { EnginePage } from './engine.page';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ComponentsModule } from 'src/app/components/components.module';
import { QuillModule } from 'ngx-quill';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EnginePageRoutingModule,
    ComponentsModule,
    FontAwesomeModule,
    PipesModule,
    QuillModule
  ],
  declarations: [EnginePage]
})
export class EnginePageModule {}
