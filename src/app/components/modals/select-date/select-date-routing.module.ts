import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SelectDatePage } from './select-date.page';

const routes: Routes = [
  {
    path: '',
    component: SelectDatePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SelectDatePageRoutingModule {}
