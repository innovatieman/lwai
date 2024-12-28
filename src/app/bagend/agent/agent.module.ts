import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AgentPageRoutingModule } from './agent-routing.module';

import { AgentPage } from './agent.page';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ComponentsModule } from 'src/app/components/components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AgentPageRoutingModule,
    ComponentsModule,
    FontAwesomeModule,
    PipesModule
  ],
  declarations: [AgentPage]
})
export class AgentPageModule {}
