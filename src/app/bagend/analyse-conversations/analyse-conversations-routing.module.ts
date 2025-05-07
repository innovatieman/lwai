import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AnalyseConversationsPage } from './analyse-conversations.page';

const routes: Routes = [
  {
    path: '',
    component: AnalyseConversationsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AnalyseConversationsPageRoutingModule {}
