import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TrainingsPageRoutingModule } from './trainings-routing.module';

import { TrainingsPage } from './trainings.page';
import { ComponentsModule } from 'src/app/components/components.module';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { DndModule } from 'ngx-drag-drop';
import { QuillModule } from 'ngx-quill';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TrainingsPageRoutingModule,
    ComponentsModule,
    PipesModule,
    FontAwesomeModule,
    TranslateModule,
    DndModule,
    QuillModule
  ],
  declarations: [TrainingsPage]
})
export class TrainingsPageModule {}
