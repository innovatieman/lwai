import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ExamplePageRoutingModule } from './example-routing.module';

import { ExamplePage } from './example.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ExamplePageRoutingModule,
    PipesModule,
    FontAwesomeModule,
    TranslateModule,
  ],
  declarations: [ExamplePage]
})
export class ExamplePageModule {}
