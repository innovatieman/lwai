import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AgentPage } from './agent.page';

const routes: Routes = [
  {
    path: '',
    component: AgentPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AgentPageRoutingModule {}
