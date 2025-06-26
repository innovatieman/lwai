import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MarketplacePage } from './marketplace.page';

const routes: Routes = [
  {
    path: '',
    component: MarketplacePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MarketplacePageRoutingModule {}
