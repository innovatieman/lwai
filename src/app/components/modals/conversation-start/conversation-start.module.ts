import { NgModule, Pipe } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ConversationStartPageRoutingModule } from './conversation-start-routing.module';

import { ConversationStartPage } from './conversation-start.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ComponentsModule } from '../../components.module';
import { PipesModule } from 'src/app/pipes/pipes.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ConversationStartPageRoutingModule,
    FontAwesomeModule,
    PipesModule,
    ComponentsModule
  ],
  declarations: [ConversationStartPage]
})
export class ConversationStartPageModule {}
