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
import { StarRatingComponent } from './star-rating/star-rating.component';
import { TooltipDirective } from './directives/tooltip.directive';
// import { MenuPage } from './menu.page';

@NgModule({
  imports: [ 
    CommonModule,
    FormsModule,
    IonicModule,
    HighchartsChartModule,

  ],
  declarations: [HeaderComponent,MainComponent,BadgeComponent,LoaderComponent,GraphGaugeComponent,StarRatingComponent,TooltipDirective],
  exports:[HeaderComponent,MainComponent,BadgeComponent,LoaderComponent,GraphGaugeComponent,StarRatingComponent,TooltipDirective]
})
export class ComponentsModule {}
