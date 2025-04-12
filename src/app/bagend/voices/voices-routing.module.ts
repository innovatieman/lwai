import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { VoicesPage } from './voices.page';

const routes: Routes = [
  {
    path: '',
    component: VoicesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VoicesPageRoutingModule {}
