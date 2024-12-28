import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ConversationStartPage } from './conversation-start.page';

const routes: Routes = [
  {
    path: '',
    component: ConversationStartPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ConversationStartPageRoutingModule {}
