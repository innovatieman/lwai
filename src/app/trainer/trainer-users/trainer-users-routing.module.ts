import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TrainerUsersPage } from './trainer-users.page';

const routes: Routes = [
  {
    path: '',
    component: TrainerUsersPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TrainerUsersPageRoutingModule {}
