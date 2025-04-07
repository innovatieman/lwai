import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CaseinfoPageRoutingModule } from './caseinfo-routing.module';

import { CaseinfoPage } from './caseinfo.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { ComponentsModule } from '../../components.module';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CaseinfoPageRoutingModule,
    FontAwesomeModule,
    PipesModule,
    ComponentsModule,
    TranslateModule.forChild()
  ],
  declarations: [CaseinfoPage]
})
export class CaseinfoPageModule {}
