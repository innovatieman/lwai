import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AchievementPage } from './achievement.page';

const routes: Routes = [
  {
    path: '',
    component: AchievementPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AchievementPageRoutingModule {}
