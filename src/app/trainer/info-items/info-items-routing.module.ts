import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { InfoItemsPage } from './info-items.page';

const routes: Routes = [
  {
    path: '',
    component: InfoItemsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class InfoItemsPageRoutingModule {}
