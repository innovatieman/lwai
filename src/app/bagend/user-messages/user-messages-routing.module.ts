import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { UserMessagesPage } from './user-messages.page';

const routes: Routes = [
  {
    path: '',
    component: UserMessagesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UserMessagesPageRoutingModule {}
