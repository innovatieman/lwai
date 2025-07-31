import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AiOrganisationPage } from './ai-organisation.page';

const routes: Routes = [
  {
    path: '',
    component: AiOrganisationPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AiOrganisationPageRoutingModule {}
