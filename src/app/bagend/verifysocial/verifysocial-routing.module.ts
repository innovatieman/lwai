import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { VerifysocialPage } from './verifysocial.page';

const routes: Routes = [
  {
    path: '',
    component: VerifysocialPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VerifysocialPageRoutingModule {}
