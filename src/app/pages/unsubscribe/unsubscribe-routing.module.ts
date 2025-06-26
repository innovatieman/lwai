import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { UnsubscribePage } from './unsubscribe.page';

const routes: Routes = [
  {
    path: '',
    component: UnsubscribePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UnsubscribePageRoutingModule {}
