import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AiOrganisationPageRoutingModule } from './ai-organisation-routing.module';

import { AiOrganisationPage } from './ai-organisation.page';
import { ComponentsModule } from 'src/app/components/components.module';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AiOrganisationPageRoutingModule,
    ComponentsModule,
    PipesModule,
    FontAwesomeModule,
    NgxDatatableModule,
    TranslateModule.forChild()
  ],
  declarations: [AiOrganisationPage]
})
export class AiOrganisationPageModule {}
