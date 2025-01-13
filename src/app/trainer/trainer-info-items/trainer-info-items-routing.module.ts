import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TrainerInfoItemsPage } from './trainer-info-items.page';

const routes: Routes = [
  {
    path: '',
    component: TrainerInfoItemsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TrainerInfoItemsPageRoutingModule {}
