import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import * as Highcharts from 'highcharts';
import highchartsMore from 'highcharts/highcharts-more';
import solidGauge from 'highcharts/modules/solid-gauge';

highchartsMore(Highcharts);
solidGauge(Highcharts);

@Component({
  selector: 'app-graph-gauge',
  templateUrl: './graph-gauge.component.html',
  styleUrls: ['./graph-gauge.component.scss'],
})
export class GraphGaugeComponent implements OnInit, OnChanges {
  @Input() value:number = 0
  @Input() height:string = '150px'
  Highcharts: typeof Highcharts = Highcharts;
  chartConstructor: string = 'chart';
  chartOptions: any = null

  chart: Highcharts.Chart | null = null;
  
  chartCallback: Highcharts.ChartCallbackFunction = (chart) => {
    this.chart = chart;
  };

  constructor() {
    this.chartOptions = {
      chart: {
        type: 'gauge',
        backgroundColor: 'transparent',
    },
    title: {
        text: ''
    },
    
    credits:{
      enabled:false
    },
    pane: {
        startAngle: -90,
        endAngle: 90,
        background: [{
            backgroundColor: 'transparent',
            borderWidth: 0
        }]
    },

    yAxis: {
        min: 0,
        max: 100,

        minorTickInterval: 0,
        tickColor: 'transparent',
        tickLength: 40,
        tickPixelInterval: 40,
        tickWidth: 2,
        lineWidth: 0,
        title: {
            text: ''
        },
        labels: {
            enabled: false
        },

        plotBands: [
          {
            from: 1,
            to: 35,
            color: '#DF5353',
            innerRadius: '82%',
            borderRadius: '50%'
        }, 
        {
            from: 25,
            to: 50,
            color: 'orange',
            innerRadius: '82%',
            zIndex: 1
        },
        {
            from: 50,
            to: 75,
            color: '#DDDF0D',
            innerRadius: '82%',
            zIndex: 1
        }, {
            from: 60,
            to: 99,
            color: '#55BF3B',
            innerRadius: '82%',
            borderRadius: '50%'
        }]
    },
    series: [{
      name: 'Attitude',
      type: 'gauge',
      data: [0],
      dataLabels: {
          enabled: false,

      },

    }]
    }
    setTimeout(() => {
      if(this.chart&&this.chart.series){
        const series = this.chart.series[0]; 
        series.setData([this.value], true);
      }
    }, 300);
  }

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges): void {
  if (changes['value'] && this.chart && this.chart.series) {
    const newValue = changes['value'].currentValue;
    this.chart.series[0].setData([newValue], true);
  }
}

}
