import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { WaitVerifyPage } from './wait-verify.page';

const routes: Routes = [
  {
    path: '',
    component: WaitVerifyPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WaitVerifyPageRoutingModule {}
