import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TrainerInfoPage } from './trainer-info.page';

const routes: Routes = [
  {
    path: '',
    component: TrainerInfoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TrainerInfoPageRoutingModule {}
