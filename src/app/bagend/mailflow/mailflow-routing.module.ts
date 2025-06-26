import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MailflowPage } from './mailflow.page';

const routes: Routes = [
  {
    path: '',
    component: MailflowPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MailflowPageRoutingModule {}
