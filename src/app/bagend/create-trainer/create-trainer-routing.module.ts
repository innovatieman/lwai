import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CreateTrainerPage } from './create-trainer.page';

const routes: Routes = [
  {
    path: '',
    component: CreateTrainerPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CreateTrainerPageRoutingModule {}
