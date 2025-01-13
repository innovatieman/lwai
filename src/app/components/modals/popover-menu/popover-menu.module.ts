import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PopoverMenuPageRoutingModule } from './popover-menu-routing.module';

import { PopoverMenuPage } from './popover-menu.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PopoverMenuPageRoutingModule,
    FontAwesomeModule
  ],
  declarations: [PopoverMenuPage]
})
export class PopoverMenuPageModule {}
