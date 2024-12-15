import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AttitudesPage } from './attitudes.page';

const routes: Routes = [
  {
    path: '',
    component: AttitudesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AttitudesPageRoutingModule {}
