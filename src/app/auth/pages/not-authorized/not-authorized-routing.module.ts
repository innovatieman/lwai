import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { NotAuthorizedPage } from './not-authorized.page';

const routes: Routes = [
  {
    path: '',
    component: NotAuthorizedPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NotAuthorizedPageRoutingModule {}
