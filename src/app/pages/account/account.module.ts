import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AccountPageRoutingModule } from './account-routing.module';

import { AccountPage } from './account.page';
import { ComponentsModule } from 'src/app/components/components.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { AchievementPageModule } from 'src/app/components/achievement/achievement.module';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AccountPageRoutingModule,
    ComponentsModule,
    FontAwesomeModule,
    PipesModule,
    AchievementPageModule,
    TranslateModule.forChild(),
    NgCircleProgressModule.forRoot({
      "backgroundStrokeWidth": 36,
      "space": 6,
      "toFixed": 0,
      "unitsFontSize": "58",
      "outerStrokeWidth": 20,
      "outerStrokeLinecap": "square",
      "innerStrokeWidth": 18,
      "titleFontSize": "28",
      "subtitleFontSize": "71",
      "animationDuration": 200,
      // "responsive":true
    }),
  ],
  declarations: [AccountPage]
})
export class AccountPageModule {}
