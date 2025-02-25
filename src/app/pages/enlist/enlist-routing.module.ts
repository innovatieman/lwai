import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EnlistPage } from './enlist.page';

const routes: Routes = [
  {
    path: '',
    component: EnlistPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EnlistPageRoutingModule {}
