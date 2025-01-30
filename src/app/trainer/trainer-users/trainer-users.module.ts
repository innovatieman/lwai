import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TrainerUsersPageRoutingModule } from './trainer-users-routing.module';

import { TrainerUsersPage } from './trainer-users.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { ComponentsModule } from 'src/app/components/components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TrainerUsersPageRoutingModule,
    ComponentsModule,
    PipesModule,
    FontAwesomeModule
  ],
  declarations: [TrainerUsersPage]
})
export class TrainerUsersPageModule {}
