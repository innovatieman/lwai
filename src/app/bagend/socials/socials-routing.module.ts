import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SocialsPage } from './socials.page';

const routes: Routes = [
  {
    path: '',
    component: SocialsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SocialsPageRoutingModule {}
