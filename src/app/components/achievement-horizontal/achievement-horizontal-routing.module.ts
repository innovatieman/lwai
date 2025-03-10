import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AchievementHorizontalPage } from './achievement-horizontal.page';

const routes: Routes = [
  {
    path: '',
    component: AchievementHorizontalPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AchievementHorizontalPageRoutingModule {}
