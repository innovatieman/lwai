import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BackupModalPage } from './backup-modal.page';

const routes: Routes = [
  {
    path: '',
    component: BackupModalPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BackupModalPageRoutingModule {}
