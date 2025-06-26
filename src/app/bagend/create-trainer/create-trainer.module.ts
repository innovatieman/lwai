import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CreateTrainerPageRoutingModule } from './create-trainer-routing.module';

import { CreateTrainerPage } from './create-trainer.page';
import { ComponentsModule } from 'src/app/components/components.module';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CreateTrainerPageRoutingModule,
    ComponentsModule,
    TranslateModule.forChild()
  ],
  declarations: [CreateTrainerPage]
})
export class CreateTrainerPageModule {}
