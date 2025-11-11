import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CaseCardPage } from './case-card.page';

const routes: Routes = [
  {
    path: '',
    component: CaseCardPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CaseCardPageRoutingModule {}
