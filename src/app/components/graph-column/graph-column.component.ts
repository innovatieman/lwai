import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import * as Highcharts from 'highcharts';

@Component({
  selector: 'app-graph-column',
  templateUrl: './graph-column.component.html',
  styleUrls: ['./graph-column.component.scss'],
})
export class GraphColumnComponent implements OnInit, OnChanges {
  @Input() xCategories: string[] = []; // bijv. ['01-11', '02-11', '03-11']
  @Input() yMin: number = 0;
  @Input() yMax: number = 100;
  @Input() data: number[] = []; // kolomwaarden
  @Input() height: string = '240px';
  @Input() title: any = null;
  @Input() color: string = '#2b6cf5'; 
  @Input() showLegend: boolean = false; // standaard geen legenda

  Highcharts: typeof Highcharts = Highcharts;
  chartConstructor: string = 'chart';
  chartOptions: any = null;

  chart: Highcharts.Chart | null = null;

  chartCallback: Highcharts.ChartCallbackFunction = (chart) => {
    this.chart = chart;
  };

  constructor() {}

  ngOnInit(): void {
    this.initChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.chart) {
      this.chart.series[0].setData(this.data, true);
    }

    if (changes['xCategories'] && this.chart) {
      this.chart.xAxis[0].setCategories(this.xCategories, true);
    }
  }

  private initChart() {
    this.chartOptions = {
      chart: {
        type: 'column',
        backgroundColor: 'transparent',
        height: this.height,
      },
      title: {
        text: this.title || null,
      },
      credits: {
        enabled: false,
      },
      legend: {
        enabled: this.showLegend
      },
      xAxis: {
        categories: this.xCategories,
        title: {
          text: null,
        },
      },
      yAxis: {
        min: this.yMin,
        max: this.yMax,
        title: {
          text: null,
        },
      },
      series: [{
        name: 'Waarde',
        type: 'column',
        data: this.data,
        color: this.color,
      }],
    };
  }
}