import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EditHtmlPage } from './edit-html.page';

const routes: Routes = [
  {
    path: '',
    component: EditHtmlPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EditHtmlPageRoutingModule {}
