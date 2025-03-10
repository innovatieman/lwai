import { Component, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TutorialsPageRoutingModule } from './tutorials-routing.module';

import { TutorialsPage } from './tutorials.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { ComponentsModule } from 'src/app/components/components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TutorialsPageRoutingModule,
    FontAwesomeModule,
    PipesModule,
    ComponentsModule
  ],
  declarations: [TutorialsPage]
})
export class TutorialsPageModule {}
