import { Component, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AttitudesPageRoutingModule } from './attitudes-routing.module';

import { AttitudesPage } from './attitudes.page';
import { ComponentsModule } from 'src/app/components/components.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AttitudesPageRoutingModule,
    ComponentsModule,
    FontAwesomeModule
  ],
  declarations: [AttitudesPage]
})
export class AttitudesPageModule {}
