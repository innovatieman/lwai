import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ModulesPageRoutingModule } from './modules-routing.module';

import { ModulesPage } from './modules.page';
import { ComponentsModule } from 'src/app/components/components.module';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { DndModule } from 'ngx-drag-drop';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ModulesPageRoutingModule,
    ComponentsModule,
    PipesModule,
    FontAwesomeModule,
    TranslateModule,
    DndModule
  ],
  declarations: [ModulesPage]
})
export class ModulesPageModule {}
