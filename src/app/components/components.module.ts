import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { HeaderComponent } from './header/header.component';
import { MainComponent } from './main/main.component';
import { BadgeComponent } from './badge/badge.component';
// import { MenuPage } from './menu.page';

@NgModule({
  imports: [ 
    CommonModule,
    FormsModule,
    IonicModule,
  ],
  declarations: [HeaderComponent,MainComponent,BadgeComponent],
  exports:[HeaderComponent,MainComponent,BadgeComponent]
})
export class ComponentsModule {}
