import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { OptionsModalPage } from './options-modal.page';

const routes: Routes = [
  {
    path: '',
    component: OptionsModalPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OptionsModalPageRoutingModule {}
