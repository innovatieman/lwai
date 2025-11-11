import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DesignMailPage } from './design-mail.page';

const routes: Routes = [
  {
    path: '',
    component: DesignMailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DesignMailPageRoutingModule {}
