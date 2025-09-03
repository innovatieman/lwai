import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MarketplacePageRoutingModule } from './marketplace-routing.module';

import { MarketplacePage } from './marketplace.page';
import { ComponentsModule } from 'src/app/components/components.module';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { CodeInputModule } from 'angular-code-input';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MarketplacePageRoutingModule,
    ComponentsModule,
    PipesModule,
    FontAwesomeModule,
    TranslateModule.forChild(),
    CodeInputModule.forRoot({
      codeLength: 6,
      isCharsCode: true,
      code: ''
    }),
  ],
  declarations: [MarketplacePage]
})
export class MarketplacePageModule {}
