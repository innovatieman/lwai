import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { NotAuthorizedPageRoutingModule } from './not-authorized-routing.module';

import { NotAuthorizedPage } from './not-authorized.page';
import { ComponentsModule } from 'src/app/components/components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NotAuthorizedPageRoutingModule,
    ComponentsModule
  ],
  declarations: [NotAuthorizedPage]
})
export class NotAuthorizedPageModule {}
