import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MailflowPageRoutingModule } from './mailflow-routing.module';

import { MailflowPage } from './mailflow.page';
import { ComponentsModule } from 'src/app/components/components.module';
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PipesModule } from 'src/app/pipes/pipes.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MailflowPageRoutingModule,
    ComponentsModule,
    TranslateModule.forChild(),
    FontAwesomeModule,
    PipesModule
  ],
  declarations: [MailflowPage]
})
export class MailflowPageModule {}
