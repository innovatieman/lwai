import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SalesTrainingsPage } from './sales-trainings.page';

const routes: Routes = [
  {
    path: '',
    component: SalesTrainingsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SalesTrainingsPageRoutingModule {}
