import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CasesService } from 'src/app/services/cases.service';
import { NavService } from 'src/app/services/nav.service';
import * as Highcharts from 'highcharts';
import highchartsMore from 'highcharts/highcharts-more';
import solidGauge from 'highcharts/modules/solid-gauge';
import { Subscription } from 'rxjs';
import { ConversationService } from 'src/app/services/conversation.service';
import { IconsService } from 'src/app/services/icons.service';
import { ModalService } from 'src/app/services/modal.service';
import { InfoService } from 'src/app/services/info.service';
import { HelpersService } from 'src/app/services/helpers.service';
// import { HeyGenApiService } from 'src/app/services/heygen.service';

highchartsMore(Highcharts);
solidGauge(Highcharts);

@Component({
  selector: 'app-conversation',
  templateUrl: './conversation.page.html',
  styleUrls: ['./conversation.page.scss'],
})
export class ConversationPage implements OnInit {
  Highcharts: typeof Highcharts = Highcharts;
  chartConstructor: string = 'chart';
  updateSubscription:Subscription = new Subscription()
  chartOptions: Highcharts.Options = {
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
    data: [this.conversation.attitude],
    dataLabels: {
        enabled: false,

    },

  }]
  }
  showFeedback:boolean = false;
  showFact:boolean = false;


chart: Highcharts.Chart | null = null;
chartCallback: Highcharts.ChartCallbackFunction = (chart) => {
  this.chart = chart;
};

conversationTitle:string = ''
case_id:string = ''
question:string = ''
started:boolean = false
interaction:string='chat'
cipherTerm:any = {
  "0": "Onbekend",
  "1": "Slecht",
  "2": "Zeer matig",
  "3": "Onvoldoende",
  "4": "Zwak",
  "5": "Matig",
  "6": "Voldoende",
  "7": "Ruim voldoende",
  "8": "Goed",
  "9": "Zeer goed",
  "10": "Perfect"
}
  

  constructor(
    private route:ActivatedRoute,
    public nav:NavService,
    public cases:CasesService,
    public conversation:ConversationService,
    private zone: NgZone,
    private rf:ChangeDetectorRef,
    public icon:IconsService,
    private modal:ModalService,
    public info:InfoService,
    public helpers:HelpersService
  ) { }


  ngOnInit() {

    this.route.params.subscribe(params=>{

      if(!params['conversation']||!params['case']){
        this.nav.go('start')
        return
      }
      this.updateSubscription = this.conversation.update.subscribe(()=>{
        setTimeout(() => {
          if(this.chart){
            const series = this.chart.series[0]; 
            series.setData([this.conversation.attitude], true);
            this.rf.detectChanges();
          }
        }, 300);
      })

      this.conversationTitle = params['conversation']
      this.case_id = params['case']
      
      if(localStorage.getItem('activatedCase')==params['case']){
        
        if(localStorage.getItem('personalCase')){
          let personalCase = JSON.parse(localStorage.getItem('personalCase')||'{}')
          if(personalCase.id==params['case']){
            this.startConversation(personalCase,true)
          }
        }
        else{
         this.startConversation(this.cases.single(params['case']))
        }

      }
      else{
      }

    })
    setTimeout(() => {
      this.continueConversation()
    }, 2000);
  }

  ngOnDestroy(){
    this.conversation.heyGen.disconnect('avatar_video')
  }

  startConversation(caseItem:any,personal?:boolean){
    this.started = true
    let countTries = 0
    if(!personal){
      let interval = setInterval(()=>{
        countTries++
        if(this.cases.single(caseItem)){
          clearInterval(interval)
          localStorage.removeItem('activatedCase')
          console.log(this.cases.single(caseItem))
          if(this.cases.single(caseItem).avatarName){
            this.interaction = 'video'
          }
          this.conversation.startConversation(this.cases.single(caseItem))
        }
        if(countTries>10){
          clearInterval(interval)
        }
      },500)
    }
    else{
      this.conversation.startConversation(caseItem)
    }
  }
    



  ionViewDidEnter(){
    if(localStorage.getItem('continueConversation')){
      localStorage.removeItem('continueConversation')
      this.continueConversation()
    }
  }

  selectOption(option:string){
    this.zone.run(() => {
      this.question = option;
    })
  }

  startOver(){
    console.log('start over')
    this.started = true
    this.conversation.startConversation(this.cases.single(this.case_id))
  }

  continueConversation(){
    console.log('continue')
    if(!localStorage.getItem('conversation')){
      return
    }
    this.started = true
    let conversation = JSON.parse(localStorage.getItem('conversation')||'{}')
    if(conversation.avatarName){
      this.interaction = 'video'
    }
    this.conversation.loadConversation(conversation.conversationId,conversation)
    // setTimeout(() => {
      this.conversation.reloadAtitude()
    // }, 1000);
  }

  get savedConversation(){
    return localStorage.getItem('conversation')
  }

  showInfo(type:string,infoType:string,title:string){
    console.log(type,infoType,this.info.public_info)
    console.log(this.conversation.caseItem)
    let text = ''
    text = text + this.info.getInfo(type)['intro_'+infoType] + '<br><br>'

    if(infoType=='phases'){
      this.info.getInfo(type)['phases'].forEach((phase:any) => {
        text = text + '<b>'+phase.title+ ' ('+phase.short +')' + '</b><br>'+phase.description+'<br><br>'
      });
    }

   this.modal.showText(text,title)
  }

  showChoices(){
    let options:any = this.conversation.latestAssistantItem(this.conversation.activeConversation.choices)
    options = this.conversation.parseChoicesToJSON(options)
    this.modal.options(options,'Help','Hier zijn enkele mogelijke reacties om je op weg te helpen',null,true,(response:any)=>{
      if(response.data){
        this.selectOption(response.data)
      }
    })
  }

  showImpact(obj:any){
    let text = '';
    text = text + '<b>Score Totaal:</b> ' + obj.score + '<br>'
    text = text + '<b>Score user:</b> ' + obj.score_user + '<br>'
    text = text + '<b>Score '+this.conversation.caseItem.role+':</b> ' + obj.score_assistant + '<br><br>'
    text = text + obj.feedback
    this.modal.showText(text,obj.title)

  }

}
