import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MailflowPageRoutingModule } from './mailflow-routing.module';

import { MailflowPage } from './mailflow.page';
import { ComponentsModule } from 'src/app/components/components.module';
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MailflowPageRoutingModule,
    ComponentsModule,
    TranslateModule.forChild(),
    FontAwesomeModule
  ],
  declarations: [MailflowPage]
})
export class MailflowPageModule {}
