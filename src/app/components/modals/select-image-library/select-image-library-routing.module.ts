import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SelectImageLibraryPage } from './select-image-library.page';

const routes: Routes = [
  {
    path: '',
    component: SelectImageLibraryPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SelectImageLibraryPageRoutingModule {}
