import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PublicInfoPage } from './public-info.page';

const routes: Routes = [
  {
    path: '',
    component: PublicInfoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PublicInfoPageRoutingModule {}
