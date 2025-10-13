import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { StreamCasePage } from './stream-case.page';

const routes: Routes = [
  {
    path: '',
    component: StreamCasePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StreamCasePageRoutingModule {}
