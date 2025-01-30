import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RateLearningPage } from './rate-learning.page';

const routes: Routes = [
  {
    path: '',
    component: RateLearningPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RateLearningPageRoutingModule {}
