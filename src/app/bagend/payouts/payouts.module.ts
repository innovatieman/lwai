import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PayoutsPageRoutingModule } from './payouts-routing.module';

import { PayoutsPage } from './payouts.page';
import { ComponentsModule } from 'src/app/components/components.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PayoutsPageRoutingModule,
    ComponentsModule,
    FontAwesomeModule,
    ReactiveFormsModule
  ],
  declarations: [PayoutsPage]
})
export class PayoutsPageModule {}
