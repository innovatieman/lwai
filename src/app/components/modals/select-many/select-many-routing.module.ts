import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SelectManyPage } from './select-many.page';

const routes: Routes = [
  {
    path: '',
    component: SelectManyPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SelectManyPageRoutingModule {}
