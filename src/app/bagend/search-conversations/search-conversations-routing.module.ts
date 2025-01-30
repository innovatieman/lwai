import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SearchConversationsPage } from './search-conversations.page';

const routes: Routes = [
  {
    path: '',
    component: SearchConversationsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SearchConversationsPageRoutingModule {}
