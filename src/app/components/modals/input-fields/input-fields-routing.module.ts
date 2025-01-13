import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { InputFieldsPage } from './input-fields.page';

const routes: Routes = [
  {
    path: '',
    component: InputFieldsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class InputFieldsPageRoutingModule {}
