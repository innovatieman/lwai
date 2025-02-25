import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TokenAnalysisPage } from './token-analysis.page';

const routes: Routes = [
  {
    path: '',
    component: TokenAnalysisPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TokenAnalysisPageRoutingModule {}
