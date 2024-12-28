import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TrainerCasesPage } from './trainer-cases.page';

const routes: Routes = [
  {
    path: '',
    component: TrainerCasesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TrainerCasesPageRoutingModule {}
