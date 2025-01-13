import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TooltipPageRoutingModule } from './tooltip-routing.module';

import { TooltipPage } from './tooltip.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TooltipPageRoutingModule
  ],
  declarations: [TooltipPage]
})
export class TooltipPageModule {}
