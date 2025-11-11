import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ScormPage } from './scorm.page';

const routes: Routes = [
  {
    path: '',
    component: ScormPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ScormPageRoutingModule {}
