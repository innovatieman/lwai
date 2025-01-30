import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SearchConversationsPageRoutingModule } from './search-conversations-routing.module';

import { SearchConversationsPage } from './search-conversations.page';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ComponentsModule } from 'src/app/components/components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SearchConversationsPageRoutingModule,
    ComponentsModule,
    PipesModule,
    FontAwesomeModule,
  ],
  declarations: [SearchConversationsPage]
})
export class SearchConversationsPageModule {}
