import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AchievementPageRoutingModule } from './achievement-routing.module';

import { AchievementPage } from './achievement.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AchievementPageRoutingModule,
    FontAwesomeModule,
  ],
  declarations: [AchievementPage],
  exports:[AchievementPage]
})
export class AchievementPageModule {}
