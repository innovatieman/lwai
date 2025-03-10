import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AchievementHorizontalPageRoutingModule } from './achievement-horizontal-routing.module';

import { AchievementHorizontalPage } from './achievement-horizontal.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AchievementHorizontalPageRoutingModule,
    FontAwesomeModule
  ],
  declarations: [AchievementHorizontalPage],
  exports: [AchievementHorizontalPage]
})
export class AchievementHorizontalPageModule {}
