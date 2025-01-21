import { NgModule, Pipe } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ConversationPageRoutingModule } from './conversation-routing.module';

import { ConversationPage } from './conversation.page';
import { ComponentsModule } from "../../components/components.module";
import { HighchartsChartModule } from 'highcharts-angular';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { DndModule } from 'ngx-drag-drop';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ConversationPageRoutingModule,
    HighchartsChartModule,
    ComponentsModule,
    PipesModule,
    FontAwesomeModule,
    DndModule,
    TranslateModule.forChild()
],
  declarations: [ConversationPage]
})
export class ConversationPageModule {}
