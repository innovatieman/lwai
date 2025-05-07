import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AnalyseConversationsPageRoutingModule } from './analyse-conversations-routing.module';

import { AnalyseConversationsPage } from './analyse-conversations.page';
import { ComponentsModule } from 'src/app/components/components.module';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AnalyseConversationsPageRoutingModule,
    ComponentsModule,
    PipesModule,
    FontAwesomeModule,
  ],
  declarations: [AnalyseConversationsPage]
})
export class AnalyseConversationsPageModule {}
