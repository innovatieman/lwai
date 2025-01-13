import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TooltipPage } from './tooltip.page';

const routes: Routes = [
  {
    path: '',
    component: TooltipPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TooltipPageRoutingModule {}
