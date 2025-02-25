import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EnlistPageRoutingModule } from './enlist-routing.module';

import { EnlistPage } from './enlist.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { ComponentsModule } from 'src/app/components/components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EnlistPageRoutingModule,
    ComponentsModule,
    PipesModule,
    FontAwesomeModule
  ],
  declarations: [EnlistPage]
})
export class EnlistPageModule {}
