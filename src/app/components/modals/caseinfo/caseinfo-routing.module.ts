import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CaseinfoPage } from './caseinfo.page';

const routes: Routes = [
  {
    path: '',
    component: CaseinfoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CaseinfoPageRoutingModule {}
