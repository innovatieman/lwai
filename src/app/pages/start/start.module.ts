import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { StartPageRoutingModule } from './start-routing.module';

import { StartPage } from './start.page';
import { ComponentsModule } from 'src/app/components/components.module';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { AchievementPageModule } from 'src/app/components/achievement/achievement.module';
import { AchievementHorizontalPageModule } from 'src/app/components/achievement-horizontal/achievement-horizontal.module';
import { TranslateModule } from '@ngx-translate/core';
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    StartPageRoutingModule,
    ComponentsModule,
    PipesModule,
    FontAwesomeModule,
    AchievementPageModule,
    AchievementHorizontalPageModule,
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
    TranslateModule.forChild()
  ],
  declarations: [StartPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],


})
export class StartPageModule {}
