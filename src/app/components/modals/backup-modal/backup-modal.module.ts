import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { BackupModalPageRoutingModule } from './backup-modal-routing.module';

import { BackupModalPage } from './backup-modal.page';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BackupModalPageRoutingModule,
    FontAwesomeModule,
    PipesModule
    
  ],
  declarations: [BackupModalPage]
})
export class BackupModalPageModule {}
