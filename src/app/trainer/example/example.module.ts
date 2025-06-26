import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ExamplePageRoutingModule } from './example-routing.module';

import { ExamplePage } from './example.page';
import { ComponentsModule } from 'src/app/components/components.module';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ExamplePageRoutingModule,
    ComponentsModule,
    PipesModule,
    FontAwesomeModule,
    TranslateModule,
  ],
  declarations: [ExamplePage]
})
export class ExamplePageModule {}
