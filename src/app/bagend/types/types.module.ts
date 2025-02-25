import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TypesPageRoutingModule } from './types-routing.module';

import { TypesPage } from './types.page';
import { ComponentsModule } from 'src/app/components/components.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TypesPageRoutingModule,
    ComponentsModule,
    FontAwesomeModule,
    PipesModule,
    TranslateModule.forChild()
  ],
  declarations: [TypesPage]
})
export class TypesPageModule {}
