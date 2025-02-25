import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PhotoGeneratorPage } from './photo-generator.page';

const routes: Routes = [
  {
    path: '',
    component: PhotoGeneratorPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PhotoGeneratorPageRoutingModule {}
