import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PopoverMenuPage } from './popover-menu.page';

const routes: Routes = [
  {
    path: '',
    component: PopoverMenuPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PopoverMenuPageRoutingModule {}
