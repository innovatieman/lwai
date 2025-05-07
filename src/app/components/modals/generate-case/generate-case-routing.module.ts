import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { GenerateCasePage } from './generate-case.page';

const routes: Routes = [
  {
    path: '',
    component: GenerateCasePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GenerateCasePageRoutingModule {}
