import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CasesPageRoutingModule } from './cases-routing.module';

import { CasesPage } from './cases.page';
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ComponentsModule } from 'src/app/components/components.module';
import { PipesModule } from 'src/app/pipes/pipes.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CasesPageRoutingModule,
    TranslateModule.forChild(),
    FontAwesomeModule,
    ComponentsModule,
    PipesModule
  ],
  declarations: [CasesPage]
})
export class CasesPageModule {}
