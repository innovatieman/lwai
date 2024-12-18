import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { InfoModalPage } from './info-modal.page';

const routes: Routes = [
  {
    path: '',
    component: InfoModalPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class InfoModalPageRoutingModule {}
