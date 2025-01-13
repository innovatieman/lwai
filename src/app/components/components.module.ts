import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { HeaderComponent } from './header/header.component';
import { MainComponent } from './main/main.component';
import { BadgeComponent } from './badge/badge.component';
import { LoaderComponent } from './loader/loader.component';
import { GraphGaugeComponent } from './graph-gauge/graph-gauge.component';
import { HighchartsChartModule } from 'highcharts-angular';
// import { MenuPage } from './menu.page';

@NgModule({
  imports: [ 
    CommonModule,
    FormsModule,
    IonicModule,
    HighchartsChartModule,

  ],
  declarations: [HeaderComponent,MainComponent,BadgeComponent,LoaderComponent,GraphGaugeComponent],
  exports:[HeaderComponent,MainComponent,BadgeComponent,LoaderComponent,GraphGaugeComponent]
})
export class ComponentsModule {}
