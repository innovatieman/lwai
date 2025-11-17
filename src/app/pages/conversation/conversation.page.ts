import { ChangeDetectorRef, Component, ElementRef, HostListener, NgZone, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CasesService } from 'src/app/services/cases.service';
import { NavService } from 'src/app/services/nav.service';
import * as Highcharts from 'highcharts';
import highchartsMore from 'highcharts/highcharts-more';
import solidGauge from 'highcharts/modules/solid-gauge';
import { Subscription,fromEvent } from 'rxjs';
import { ConversationService } from 'src/app/services/conversation.service';
import { IconsService } from 'src/app/services/icons.service';
import { ModalService } from 'src/app/services/modal.service';
import { InfoService } from 'src/app/services/info.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { MediaService } from 'src/app/services/media.service';
import { RecordService } from 'src/app/services/record.service';
import { Gesture, GestureController, ItemReorderEventDetail, PopoverController } from '@ionic/angular';
import { DndDropEvent } from 'ngx-drag-drop';
import { FirestoreService } from 'src/app/services/firestore.service';
import { AuthService } from 'src/app/auth/auth.service';
import { MenuPage } from 'src/app/components/menu/menu.page';
import { SelectMenuService } from 'src/app/services/select-menu.service';
import { TranslateService } from '@ngx-translate/core';
import { ToastService } from 'src/app/services/toast.service';
import { tutorialService } from 'src/app/services/tutorial.service';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import * as moment from 'moment';
// import { HeyGenApiService } from 'src/app/services/heygen.service';
import { debounceTime } from 'rxjs/operators';

highchartsMore(Highcharts);
solidGauge(Highcharts);

@Component({
  selector: 'app-conversation',
  templateUrl: './conversation.page.html',
  styleUrls: ['./conversation.page.scss'],
})
export class ConversationPage implements OnInit {
  // @HostListener('window:resize', ['$event'])
  // onResize(){
  //   this.media.setScreenSize()
  //   this.rf.detectChanges()
  // }
  @ViewChild('draggableElement', { static: false }) draggableElement!: ElementRef;
  [x: string]: any;
  position:any = { x: this.media.screenWidth - 210, y: 10 }; // Startpositie van de div
  startingCredits:any = null;
  private gesture!: Gesture;
  hideDisclaimer:boolean = false;
  Highcharts: typeof Highcharts = Highcharts;
  chartConstructor: string = 'chart';
  updateSubscription:Subscription = new Subscription()
  activeStream:boolean = false; 
  showLastMessage:boolean = true;
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
  showDetails:boolean = false;
  showGoals:boolean = false;
  conversationTitle:string = ''
  case_id:string = ''
  question:string = ''
  started:boolean = false;
  interaction:string='chat'
  private resizeSubscription: Subscription | undefined;

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
  showDetailsPhases:boolean = false;
  transcript:string = ''
  rating_comment:string = ''
  isSpeaking:boolean = false;
  constructor(
    private route:ActivatedRoute,
    public nav:NavService,
    public cases:CasesService,
    public conversation:ConversationService,
    private zone: NgZone,
    private rf:ChangeDetectorRef,
    public icon:IconsService,
    public modalService:ModalService,
    public info:InfoService,
    public helpers:HelpersService,
    public media:MediaService,
    public record:RecordService,
    private gestureCtrl: GestureController,
    private firestore:FirestoreService,
    public auth:AuthService,
    private popoverController:PopoverController,
    private selectMenuservice:SelectMenuService,
    public translate:TranslateService,
    private toast:ToastService,
    private tutorial:tutorialService,
    private functions: AngularFireFunctions,
    
  ) { 

    // this.record.transcript$.subscribe((text) => {
    //   // this.transcript += text + ' ';
    //   this.question = text;
    //   // console.log(this.transcript);
    // });
  }

  firstMessagesLoaded:boolean = false;
  ngOnInit() {
    // setTimeout(() => {
    //   this.conversation.fullRecording = true
    // }, 3000);
    if(localStorage.getItem('hideDisclaimer')){
      let hideDisclaimer = localStorage.getItem('hideDisclaimer')
      if(moment.unix(hideDisclaimer?parseInt(hideDisclaimer):0).isAfter(moment().subtract(14, 'days'))){
        this.hideDisclaimer = true
      }
      else{
        this.hideDisclaimer = false
        localStorage.removeItem('hideDisclaimer')
      }
    }

    this.conversation.activeStream.subscribe((active:boolean)=>{
      // console.log(active)
      this.activeStream = active
      this.rf.detectChanges()
      if(!active){
        setTimeout(() => {
          this.toggleVideo(true)
        }, 1000);
      }
    })

    this.conversation.speaking.subscribe((speaking:boolean)=>{
      this.isSpeaking = speaking
      this.rf.detectChanges()
    })

    this.conversation.analysisReady.subscribe((ready:boolean)=>{
      // console.log('analysis ready',ready)
      this.firstMessagesLoaded = true
      this.rf.detectChanges()
      if(ready){
        this.busyAnalyzing = false
      }
      else{
        this.busyAnalyzing = true
      }
    })

    this.conversation.updateAchievements.subscribe((newGoal:any)=>{
      this.completeGoal()
    })

    // this.conversation.subCollectionUpdated.subscribe((data:any)=>{
    //   console.log('subCollectionUpdated',data)
    //   this.rf.detectChanges()
    // })

    this.tutorial.action.subscribe((action:any)=>{
      let actions = action.split('.')
      if(actions[0]=='conversation'){
        this[actions[1]]()
      }
    })

    this.route.params.subscribe(params=>{

      if(!params['case']){
        if(this.conversation.originUrl){
          this.nav.go(this.conversation.originUrl)
        }
        else{
          this.nav.go('start')
        }
        return
      }
      this.updateSubscription = this.conversation.update.subscribe(()=>{
        setTimeout(() => {
          if(this.chart?.series&&this.chart?.series[0]){
            const series = this.chart.series[0]; 
            series.setData([this.conversation.attitude], true);
            this.conversation.reloadAttitude();
            this.rf.detectChanges();
          }
        }, 300);
        if(this.conversation.activeConversation.voice_on && this.conversation.activeConversation.voice){
          this.interaction = 'voice'
        }
        else if(this.conversation.activeConversation.video_on){
          this.interaction = 'chat'
        }
        else{
          this.interaction = 'chat'
        }
      })

      this.rf.detectChanges()
      
      // this.conversationTitle = params['conversation']
      this.case_id = params['case']

      if(localStorage.getItem('activatedCase')==params['case']){
        
        if(localStorage.getItem('personalCase')){
          let personalCase = JSON.parse(localStorage.getItem('personalCase')||'{}')
          if(personalCase.id==params['case']){
            // console.log('personal case',JSON.parse(JSON.stringify(personalCase)))
            this.startConversation(personalCase,true)
          }
        }
        else{
         this.startConversation(params['case'])
        }

      }
      else if(!this.started&&!localStorage.getItem('continueConversation')){
        //
        // console.log('not activated')
        this.nav.go('start')
      }

    })
    setTimeout(() => {
      // this.continueConversation()
    }, 2000);
  }

  ngOnDestroy(){
    this.conversation.heyGen.disconnect('avatar_video')
    this.resizeSubscription?.unsubscribe();
  }


  ngAfterViewInit() {
    this.rating_comment = ''
    this.resizeSubscription = fromEvent(window, 'resize')
    .pipe(debounceTime(200))
    .subscribe(() => {
      this.media.setScreenSize();
      this.rf.detectChanges();
    });

  }

  px2Nr(px:string){
    return parseInt(px.replace('px',''))
  }

  async createDragGesture() {
    
    if(!this.media.smallDevice){
      return
    }


    // console.log('create drag gesture')
    let count = 0
    let dragInterval = setInterval(() => {
      count++
      if(count>50){
        clearInterval(dragInterval)
      }
      if(this.draggableElement){
        clearInterval(dragInterval)
        this.createDragGestureNow()
      }
    },200)
  }

  createDragGestureNow(){
    const element = this.draggableElement.nativeElement;
  
    // Initialize the element’s position in the DOM
    element.style.position = 'absolute';
    element.style.top = `${this.position.y}px`;
    element.style.left = `${this.position.x}px`;
  
    this.gesture = this.gestureCtrl.create({
      el: element,
      gestureName: 'drag',
      threshold: 0,
      onMove: (event) => {
        // Calculate new position
        let newX = this.position.x + event.deltaX;
        let newY = this.position.y + event.deltaY;
  
        // Get viewport dimensions
        const viewportWidth = window.innerWidth-10;
        const viewportHeight = window.innerHeight-10;
  
        // Get element dimensions
        const elementRect = element.getBoundingClientRect();
        const elementWidth = elementRect.width;
        const elementHeight = elementRect.height;
  
        // Constrain newX and newY within screen bounds
        newX = Math.max(0, Math.min(newX, viewportWidth - elementWidth));
        newY = Math.max(0, Math.min(newY, viewportHeight - elementHeight));
  
        // Apply the constrained position to the element visually
        element.style.left = `${newX}px`;
        element.style.top = `${newY}px`;
      },
      onEnd: (event) => {
        // Calculate the final position with constraints
        let finalX = this.position.x + event.deltaX;
        let finalY = this.position.y + event.deltaY;
  
        const viewportWidth = window.innerWidth -10;
        const viewportHeight = window.innerHeight -100;
  
        const elementRect = element.getBoundingClientRect();
        const elementWidth = elementRect.width;
        const elementHeight = elementRect.height;
  
        // Constrain the final position within screen bounds
        finalX = Math.max(10, Math.min(finalX, viewportWidth - elementWidth));
        finalY = Math.max(10, Math.min(finalY, viewportHeight - elementHeight));
  
        // Update stored position
        this.position.x = finalX;
        this.position.y = finalY;
  
        // Apply the final constrained position to the element
        element.style.left = `${finalX}px`;
        element.style.top = `${finalY}px`;
      },
    });
  
    this.gesture.enable(true);
  }
  
  startConversation(caseItem:any,personal?:boolean){
    // console.log('start conversation',JSON.parse(JSON.stringify(caseItem)),personal)
    if(caseItem.stream){
      localStorage.setItem('streamCase','true')
      this.startingCredits = caseItem.startingCredits || null;
      // console.log('starting credits for stream case:',this.startingCredits)
    }
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
            this.interaction = 'chat'
          }
          if(this.cases.single(caseItem).voice&&this.cases.single(caseItem).voice_on!== false){
            console.log('voice interaction')
            this.interaction = 'voice'
          }
          setTimeout(() => {
            if (this.draggableElement) {
              this.createDragGesture();
            } else {
              console.error('Draggable element is not available');
            }
          }, 1);
          console.log('personal conversation', caseItem);
          this.conversation.startConversation(this.cases.single(caseItem))
        }
        if(countTries>10){
          clearInterval(interval)
        }
      },500)
    }
    else{
      localStorage.removeItem('activatedCase')
      this.createDragGesture();
      // console.log('personal conversation', JSON.parse(JSON.stringify(caseItem)));
      if(caseItem.voice && caseItem.voice_on!== false){
        this.interaction = 'voice'
        this.conversation.voiceActive = true
      }
      else{
        this.interaction = 'chat'
        this.conversation.voiceActive = false
      }
      this.conversation.startConversation(caseItem)
      // if(caseItem.avatarName){
      //   this.interaction = 'chat'
      // }
    }
  }
    
  noCredits(event?:any){
    if(event){
      event.detail.target.blur()
    }
    this.modalService.showInfo({
      title:this.translate.instant('credits.no_credits'),
      content:this.translate.instant('credits.no_credits_conversation'),
      buttons:[
        {text:this.translate.instant('buttons.back'),value:'',color:'secondary',fill:'outline'},
        {text:this.translate.instant('credits.buy_credits'),value:'credits',color:'primary',fill:'solid'},
      ]
    },(response:any)=>{
      // console.log(response)
      if(response.data=='credits'){
        this.toggleVideo(true)
        this.nav.go('account/credits')
      }
    })
  }
  
  doNothing(){
    // console.log('do nothing')
    return
  }

  ionViewWillEnter() {
    this.conversation.messages = [];
  }

  ionViewDidEnter(){
    if(localStorage.getItem('continueConversation')){
      localStorage.removeItem('continueConversation')
      this.continueConversation()
    }
    else if(!this.started && !localStorage.getItem('activatedCase')){
      if(localStorage.getItem('conversation')){
        let localConversation = JSON.parse(localStorage.getItem('conversation')||'{}')
        if(localConversation.courseId){
          this.nav.go('course/'+localConversation.courseId)
          return
        }
        else{
          this.nav.go('start')
        }
      }
    }
  }

  sendQuestion(){
    if(!this.question || this.question.trim()==''){
      return
    }
    this.conversation.tempTextUser=this.question;
    this.question='';
    setTimeout(() => {
      this.conversation.addMessage(this.conversation.tempTextUser)
    }, 100);
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
    // console.log('continue')
    this.conversation.firstLoadMessages = false;
    if(!localStorage.getItem('conversation')){
      return
    }
    this.started = true
    
    this.createDragGesture();

    let conversation = JSON.parse(localStorage.getItem('conversation')||'{}')
    // console.log('continue conversation',conversation)
    if(conversation.avatarName){
      this.interaction = 'chat'
    }
    if(conversation.voice && conversation.voice_on){
      this.interaction = 'voice'
      if(conversation.voice_on){
        this.conversation.voiceActive = true
        console.log('voice active')
      }
    }
    this.conversation.loadConversation(conversation.conversationId,conversation,true)
    
    // setTimeout(() => {
    //   console.log(this.conversation.activeConversation)
    // }, 2000);


    this.conversation.reloadAttitude()
    // setTimeout(() => {
    //   console.log(this.conversation) 
    //   console.log(this.interaction)
    // }, 1000);


  }

  get savedConversation(){
    return localStorage.getItem('conversation')
  }

  async showInfo(type:string,infoType:string,title:string,content?:string){
    // console.log(type,infoType,this.info.public_info)
    // console.log(this.conversation.activeConversation)
    this.toast.showLoader()
    
    let text = ''
    if(type&&infoType){
      text = text + this.translate.instant('modal_intros.info_phases') + '<br><br>'
    }
    else if(content){
      text = content
    }

    if(infoType=='phases'){

      let info:any = await this.info.loadPublicInfo('categories',type,'phaseList')
      if(info?.result&&info.status==200){
        info.result.forEach((phase:any) => {
          text = text + '<b>'+phase.title+ ' ('+phase.short +')' + '</b><br>'+phase.description+'<br><br>'
        });
      }
    }
    this.toast.hideLoader()
    this.modalService.showText(text,title)
  }

  showChoices(){
    let options:any = this.conversation.latestAssistantItem(this.conversation.activeConversation.choices)
    options = this.conversation.parseChoicesToJSON(options)
    this.modalService.options(options,this.translate.instant('conversation.help'),this.translate.instant('conversation.choices_text'),null,true,(response:any)=>{
      if(response.data){
        this.selectOption(response.data)
      }
    })
  }

  stopVoice(){
    this.conversation.audioVoice.pause();
    this.conversation.audioVoice.currentTime = 0;
    this.isSpeaking = false;
    this.conversation.isSpeaking = false;
    this.record.isSpeaking = false;
  }

  pauseVoice(){
    this.conversation.audioVoice.pause();
  }

  showImpact(obj:any){
    let text = '';
    text = text + '<b>Score Totaal:</b> ' + obj.score + '<br>'
    text = text + '<b>Score user:</b> ' + obj.score_user + '<br>'
    text = text + '<b>Score '+this.conversation.caseItem.role+':</b> ' + obj.score_assistant + '<br><br>'
    text = text + obj.feedback
    this.modalService.showText(text,obj.title)

  }

  endConversation(){
    
    // console.log('end conversation',this.conversation.originUrl)
    if(this.conversation.activeConversation.closed){
      if(this.conversation.originUrl){
        this.nav.go(this.conversation.originUrl)
        return
      }
      else if(this.conversation.activeConversation.courseId){
        this.nav.go('course/'+this.conversation.activeConversation.courseId)
        return
      }
      else{
        this.nav.go('start')
        return
      }
    }

    
    let buttons = [
        {
          text:this.translate.instant('buttons.continue_now'),
          value:false,
          color:'dark',
          fill:'outline'
        },
        {
        text:this.translate.instant('buttons.continue_later'),
        value:'pause',
        color:'warning',
        fill:'outline'
      },
      {
        text:this.translate.instant('buttons.end'),
        value:'end',
        color:'success',
        fill:'solid',
        full:true

      },
      {
        text:this.translate.instant('conversation.delete_conversation'),
        value:'delete',
        color:'medium',
        fill:'clear',
        full:true,
        fullWidth:true
      }
    ]
    if(this.conversation.activeConversation.stream || localStorage.getItem('streamCase')){
      buttons = [{
        text:this.translate.instant('buttons.continue_now'),
        value:false,
        color:'dark',
        fill:'outline'
      },
      {
        text:this.translate.instant('buttons.end'),
        value:'end',
        color:'success',
        fill:'solid',
        full:true

      }]
    }

    let btnsClosText = this.translate.instant('conversation.close_text')
    if(this.conversation.activeConversation.stream || localStorage.getItem('streamCase')){
      btnsClosText = this.translate.instant('conversation.close_stream_text')
    }
    this.modalService.showVerification(
      this.translate.instant('buttons.close'),
      btnsClosText,
      buttons
    ).then(response=>{
      
      if(response=='end'){
        if(this.conversation.activeConversation?.hide?.evaluation){
          this.conversation.closeConversationWithoutEvaluation(()=>{
            this.toast.show(this.translate.instant('conversation.conversation_closed'))
            if(this.conversation.originUrl){
              this.nav.go(this.conversation.originUrl)
              return
            }
            else{
              this.nav.go('start')
              return
            }
          })
        }
        else{
          this.conversation.closing = true
          this.conversation.closeConversation(()=>{})
        }
      }
      else if(response=='delete'){
        this.modalService.showConfirmation(this.translate.instant('confirmation_questions.delete')).then((confirmed:boolean)=>{
          if(confirmed){
            if(this.conversation.originUrl){
              this.nav.go(this.conversation.originUrl)
              this.firestore.deleteSub('users',this.auth.userInfo.uid,'conversations',this.conversation.activeConversation.conversationId).then(()=>{
                console.log('conversation deleted')
              })
              return
            }
            // else if(this.conversation.activeConversation.courseId){
            //   this.nav.go('course/'+this.conversation.activeConversation.courseId)
            //   this.firestore.deleteSub('users',this.auth.userInfo.uid,'conversations',this.conversation.activeConversation.conversationId).then(()=>{
            //     console.log('conversation deleted')
            //   })
            //   return
            // }
            else{
              this.nav.go('start')
              this.firestore.deleteSub('users',this.auth.userInfo.uid,'conversations',this.conversation.activeConversation.conversationId).then(()=>{
                console.log('conversation deleted')
              })
              return
            }

            
          }
        })

      }
      else if(response=='pause'){
        console.log('originUrl',this.conversation.originUrl)
        if(this.conversation.originUrl){
          this.nav.go(this.conversation.originUrl)
          return
        }
        else if(this.conversation.activeConversation.courseId){
          this.nav.go('course/'+this.conversation.activeConversation.courseId)
          return
        }
        else{
          this.nav.go('start')
          return
        }
      }
    })
  }

  

  showLatestFact(){
    this.conversation.getExtraInfo('facts')
    this.modalService.showText(JSON.parse(this.conversation.latestAssistantItem(this.conversation.activeConversation.facts)).new_fact,'Feitje')
  }

  // async showRating(){
  //   await this.modalService.showRating('Evaluatie','',{type:'conversationId',value:this.conversation.activeConversation.conversationId},[
              
  //     {question:'Hoe waarschijnlijk is het dat je deze app aanbeveelt bij vrienden of bekenden?',value:0,type:'stars',starAmount:10},
  //     {question:'Wat vond je het meest nuttig aan dit gesprek?',value:'',type:'radio',other:'',
  //       options:[
  //         {value:'secure',text:'Ik voel me zekerder in gesprekken door de oefening.'},
  //         {value:'communicate',text:'Ik heb geleerd hoe ik effectiever kan communiceren.'},
  //         {value:'feedback',text:'De feedback was specifiek en direct toepasbaar'},
  //         {value:'swot',text:'Ik heb mijn sterke en zwakke punten beter leren kennen.'},
  //         {value:'nothing',text:'Ik heb helaas niets nieuws geleerd.'},
  //         {value:'other',text:'Anders, namelijk:'},
  //     ]},
  //     {question:'Wat zou je in het volgende gesprek willen leren?',value:'',type:'text'},

    
  //   ])
  //   .then((response:any)=>{
  //     console.log(response)
  //     if(response&&response.conversationId){
  //       this.conversation.activeConversation.rating2 = response.rating
  //       this.firestore.updateSub('users', this.auth.userInfo.uid, 'conversations', response.conversationId, {rating2:this.conversation.activeConversation.rating2})
  //       let obj = {
  //         useful:response.rating[1].value,
  //         futureLearnings:response.rating[2].value,
  //         caseId:this.conversation.activeConversation.caseId,
  //         nps:response.rating[0].value,
  //         realism:this.conversation.activeConversation.rating2.step1Filled?this.conversation.activeConversation.rating2.realism:0,
  //         addition:this.conversation.activeConversation.rating2.step1Filled?this.conversation.activeConversation.rating2.comment:'',
  //       }
  //       this.functions.httpsCallable('processLearnings')({learnings:obj}).subscribe(()=>{})
  //       // this.firestore.createSub('users', this.auth.userInfo.uid, 'learnings', {useful:this.conversation.activeConversation.rating2})
        
  //     }
  //   })
  // }


  showEvaluation(firstTime?:boolean){
    let countTries = 0
    // console.log('show evaluation')
    let closeInterval = setInterval(() => {
      countTries++
      if(countTries>300){
        // console.log('clearing interval')
        clearInterval(closeInterval)
        this.toast.show(this.translate.instant('conversation.end_error'))
        if(this.conversation.originUrl){
          this.nav.go(this.conversation.originUrl)
        }
        else{
          this.nav.go('start')
        }
        return
      }
      // console.log(this.conversation?.activeConversation?.close,this.conversation?.activeConversation?.skills)
      // if(this.conversation?.activeConversation?.close&&this.conversation?.activeConversation?.close[0]){
      if(this.conversationHasBeenAnalyzed()){
        // if(this.conversation?.activeConversation?.close&&this.conversation?.activeConversation?.close[0] && this.conversation?.activeConversation?.skills&&this.conversation?.activeConversation?.skills[0]){
        // console.log('closing')
        this.conversation.closing = false

        clearInterval(closeInterval)
        // console.log(this.conversation.activeConversation.skills[0])

        // let skills = JSON.parse(this.conversation.activeConversation.skills[0].content)
        // console.log(skills)

        this.modalService.showEvaluation({closing:this.conversation.activeConversation.close[0].content,skills:this.conversation.activeConversation.stream ? '' : this.conversation.activeConversation.skills[0].content,title: 'Afsluiting',buttons:[{text:'Gelezen',value:true,color:'secondary'}],firstTime:firstTime,conversation_level:this.conversation.activeConversation.level,conversation:this.conversation.activeConversation,exportPdf:'conversation'},async ()=>{

          if(this.conversation.activeConversation.stream || localStorage.getItem('streamCase')){
            this.auth.logout('stream-case/finished')
            return
          }
          
          
        
          // this.modalService.showText(this.conversation.activeConversation.close[0].content, 'Afsluiting',false,[{text:'Gelezen',value:true,color:'secondary'}],false,()=>{
          if(firstTime || !this.conversation.activeConversation.rating?.step1Filled){

            await this.modalService.showRating('Evaluatie','',{type:'conversationId',value:this.conversation.activeConversation.conversationId},[
              
              {question:'Hoe waarschijnlijk is het dat je deze app aanbeveelt bij vrienden of bekenden?',value:0,type:'stars',starAmount:10},
              {question:'Wat vond je het meest nuttig aan dit gesprek?',value:'',type:'radio',other:'',
                options:[
                  {value:'secure',text:'Ik voel me zekerder in gesprekken door de oefening.'},
                  {value:'communicate',text:'Ik heb geleerd hoe ik effectiever kan communiceren.'},
                  {value:'feedback',text:'De feedback was specifiek en direct toepasbaar'},
                  {value:'swot',text:'Ik heb mijn sterke en zwakke punten beter leren kennen.'},
                  {value:'nothing',text:'Ik heb helaas niets nieuws geleerd.'},
                  {value:'other',text:'Anders, namelijk:'},
              ]},
              {question:'Wat zou je in het volgende gesprek willen leren?',value:'',type:'text'},

            
            ])
            .then((response:any)=>{
              if(response&&response.conversationId){
                this.conversation.activeConversation.rating2 = response.rating
                this.firestore.updateSub('users', this.auth.userInfo.uid, 'conversations', response.conversationId, {rating2:this.conversation.activeConversation.rating2})
                let obj = {
                  useful:response.rating[1].value,
                  futureLearnings:response.rating[2].value,
                  caseId:this.conversation.activeConversation.caseId,
                  nps:response.rating[0].value,
                  realism:this.conversation.activeConversation.rating2.step1Filled?this.conversation.activeConversation.rating2.realism:0,
                  addition:this.conversation.activeConversation.rating2.step1Filled?this.conversation.activeConversation.rating2.comment:'',
                }
                this.functions.httpsCallable('processLearnings')({learnings:obj}).subscribe(()=>{})
                // this.firestore.createSub('users', this.auth.userInfo.uid, 'learnings', {useful:this.conversation.activeConversation.rating2})
                
              }
            })

            

            if(this.conversation.activeConversation.courseId){
              this.nav.go('course/'+this.conversation.activeConversation.courseId)
              return
            }
            else{
              if(this.conversation.originUrl){
                this.nav.go(this.conversation.originUrl)
              }
              else if(firstTime){
                // localStorage.setItem('showNewScore','true')
                this.nav.go('start/score')
              }
              else{
                this.nav.go('start')
              }
            }
            
          }
        })
      }
      // console.log('checking close')
    }, 200);

  }
  busyAnalyzing:boolean = true
  conversationHasBeenAnalyzed(){
    return (this.conversation?.activeConversation?.close&&this.conversation?.activeConversation?.close[0] && this.conversation?.activeConversation?.skills&&this.conversation?.activeConversation?.skills[0])
  }

  tempRating_realism:number = 0;
  updatingStars:boolean = false
  onRatingChanged(rating: number,field:string): void {
    if(!this.conversation.activeConversation.rating){
      this.conversation.activeConversation.rating = {}
    }
    this.conversation.activeConversation.rating[field] = rating;
    this.conversation.activeConversation.rating.comment = this.rating_comment
    this['tempRating_'+field] = rating
    this.updatingStars = true
    this.firestore.updateSub('users', this.auth.userInfo.uid, 'conversations', this.conversation.activeConversation.conversationId, {rating:this.conversation.activeConversation.rating})
    .then(()=>{
      this.updatingStars = false
    })
  }

  saveRating(step:number){
    if(!this.conversation.activeConversation.rating){
      this.conversation.activeConversation.rating = {}
    }
    this.conversation.activeConversation.rating['step'+step+'Filled'] = true;
    this.conversation.activeConversation.rating.comment = this.rating_comment

    this.firestore.updateSub('users', this.auth.userInfo.uid, 'conversations', this.conversation.activeConversation.conversationId, {rating:this.conversation.activeConversation.rating})
    if(step==1){
      this.showEvaluation(true)
    }
  }


  toggleVideo(off?:boolean){
    console.log(this.interaction)
    if(this.interaction=='chat' || off){
      this.conversation.heyGen.disconnect('avatar_video')
      this.firestore.updateSub('users',this.auth.userInfo.uid,'conversations',this.conversation.activeConversation.conversationId,{video_on:false})
      let tempConversation = JSON.parse(localStorage.getItem('conversation')||'{}')
      tempConversation.video_on = false
      localStorage.setItem('conversation',JSON.stringify(tempConversation))
      this.interaction = 'chat'
    }
    else if(this.interaction=='chat'){
      this.interaction = 'chat'
      this.createDragGesture()
      this.conversation.restartAvatar()
      this.firestore.updateSub('users',this.auth.userInfo.uid,'conversations',this.conversation.activeConversation.conversationId,{video_on:true})
      let tempConversation = JSON.parse(localStorage.getItem('conversation')||'{}')
      tempConversation.video_on = true
      localStorage.setItem('conversation',JSON.stringify(tempConversation))
    }

  }

  toggleVoice(off?:boolean){
    if(this.interaction=='voice' || off){
      this.conversation.messages = JSON.parse(JSON.stringify(this.conversation.activeConversation.messages)) 
      this.conversation.voiceActive = false
      this.firestore.updateSub('users',this.auth.userInfo.uid,'conversations',this.conversation.activeConversation.conversationId,{voice_on:false})
      let tempConversation = JSON.parse(localStorage.getItem('conversation')||'{}')
      tempConversation.voice_on = false
      localStorage.setItem('conversation',JSON.stringify(tempConversation))
      this.interaction = 'chat'
    }
    else if(this.interaction=='chat'){
      this.interaction = 'voice'
      this.firestore.updateSub('users',this.auth.userInfo.uid,'conversations',this.conversation.activeConversation.conversationId,{voice_on:true})
      let tempConversation = JSON.parse(localStorage.getItem('conversation')||'{}')
      tempConversation.voice_on = true
      this.conversation.voiceActive = true
      localStorage.setItem('conversation',JSON.stringify(tempConversation))
    }

  }

  // startRecordingAudio(){
  //   this.record.startRecording('audioToText',(response:any)=>{
  //     if(response){
  //       this.loadingTextFromAudio = false
  //       if(this.question==''){
  //         this.question = response
  //       }
  //       else{
  //         this.question = this.question + ' ' + response
  //       }
  //       this.rf.detectChanges()
  //     }
  //   })
  // }
  // stopRecordingAudio(){
  //   this.loadingTextFromAudio = true
  //   this.record.stopRecording(()=>{
  //     this.rf.detectChanges()
  //   })
  // }

  recordingTimeout: any;
  maxRecordingTime = 60000; // 1 minuut
  loadingTextFromAudio:boolean = false


  recording:boolean = false


  // startRecordingAudio() {
  //   console.log('start recording')
  //   if (!this.record.recording) {
  //     this.record.startRecording('audioToText', this.conversation.activeConversation.conversationId, (response: any) => {
  //       if (response) {
  //         this.loadingTextFromAudio = false;
  //         this.question = this.question ? this.question + ' ' + response : response;
  //         this.rf.detectChanges();
  //       }
  //     });

  //     // Stel een timeout in om de opname automatisch te stoppen na 1 minuut
  //     this.recordingTimeout = setTimeout(() => {
  //       this.stopRecordingAudio();
  //     }, this.maxRecordingTime);
  //   }
  // }

  // stopRecordingAudio() {
  //   console.log('stop recording')
  //   if (this.record.recording) {
  //     this.loadingTextFromAudio = true;
  //     this.record.stopRecording(() => {
  //       this.rf.detectChanges();
  //     });

  //     // Reset de timeout
  //     if (this.recordingTimeout) {
  //       clearTimeout(this.recordingTimeout);
  //     }
  //   }
  // }

  voiceSubscription:Subscription = new Subscription()
  voiceSessionId:string = ''
  // startRecording(event:Event) {
  //   event.preventDefault();
  //   event.stopPropagation();
  //   this.record.recording = true;
  //   this.transcript = '';
  //   this.record.startRecording('audioToText',this.conversation.activeConversation.conversationId,(response:any)=>{
  //     if(response){
  //       if(response=='error'){
  //         this.toast.show(this.translate.instant('conversation.sound_error'))
  //       }
  //       else{
  //         this.loadingTextFromAudio = false;
  //         this.question = this.question ? this.question + ' ' + response : response;
  //         this.record.analyzing = false;
  //         this.rf.detectChanges();
  //       }
  //     }
  //   })
  // }

  startRecording(event?: Event,noText?:boolean) {
    if(this.isSpeaking){
      return
    }
    this.record.listening = false;
    if(event){
      event.preventDefault();
      event.stopPropagation();
    }
    if(noText){
      this.conversation.fullRecording = true;
    }
    else{
      this.conversation.fullRecording = false;
    }
    this.transcript = '';
    this.record.recording = true;
    this.rf.detectChanges();
    // console.log('waiting for speech')

    // if(this.conversation.fullRecording){
    //   this.record.waitForSpeech((stream: MediaStream) => {
    //     this.record.startRecordingWithStream(stream, 'audioToText', this.conversation.activeConversation.conversationId, (response: any) => {
    //       if (response === 'error') {
    //         this.toast.show(this.translate.instant('conversation.sound_error'));
    //       } else if (response) {
    //         this.loadingTextFromAudio = false;
    //         this.question = this.question ? this.question + ' ' + response : response;
    //         this.record.analyzing = false;
    //         this.record.recording = false;
    //         if(this.question){
    //           console.log('question from audio',this.question)
    //           if(noText&&!this.record.noUpload){
    //             this.sendQuestion()
    //             setTimeout(() => {
    //               this.record.listening = false;
    //               this.startRecording(event,noText);
    //             }, 2000);

    //           }
    //           else if(this.record.noUpload){
    //             this.record.noUpload = false;
    //           }
    //           this.rf.detectChanges();
    //         }
    //         // this.rf.detectChanges();
    //       }
    //     });
    //   });
    // }
    if(this.conversation.fullRecording){
        this.record.startSmartRecording(this.conversation.activeConversation.conversationId, (response: any) => {
          if (response === 'error') {
            this.toast.show(this.translate.instant('conversation.sound_error'));
          } else if (response) {
            this.loadingTextFromAudio = false;
            this.question = this.question ? this.question + ' ' + response : response;
            this.record.analyzing = false;
            this.record.recording = false;
            if(this.question){
              console.log('question from audio',this.question)
              console.log('noText',noText,this.record.noUpload)
              if(noText&&!this.record.noUpload){
                this.sendQuestion()
                setTimeout(() => {
                  console.log('record.listening false and restart')
                  this.record.listening = false;
                  this.startRecording(event,noText);
                }, 2000);

              }
              else if(this.record.noUpload){
                this.record.noUpload = false;
                console.log('no upload this time')
              }
              this.rf.detectChanges();
            }
            else if(this.record.noUpload){
              this.record.noUpload = false;
              console.log('no upload this time')
            }
            this.rf.detectChanges();
            // this.rf.detectChanges();
          }
        });
    }
    else{
      this.record.stopSmartRecording();
      this.record.startRecordingSolo('audioToText', this.conversation.activeConversation.conversationId, (response: any) => {
        if (response === 'error') {
          this.toast.show(this.translate.instant('conversation.sound_error'));
        } else if (response) {
          this.loadingTextFromAudio = false;
          this.question = this.question ? this.question + ' ' + response : response;
          this.record.analyzing = false;
          this.record.recording = false;
          if(this.question){
            this.rf.detectChanges();
          }
        }
      });
    }
  }

  stopRecording(event:Event) {
    if(this.isSpeaking){
      return
    }
    event.preventDefault();
    event.stopPropagation();
    if(this.conversation.fullRecording){
      this.conversation.fullRecording = false;
      this.record.noUpload = true;
    }
    this.record.recording = false;
    // this.record.analyzing = true;
    this.record.stopRecording();



    // setTimeout(() => {
    //   this.voiceSubscription.unsubscribe();
    //   this.firestore.delete('transcriptions',this.voiceSessionId)
    // }, 10000);
  }

  shortMenu:any
  helpMenu:any = []
  helpMenuClosed:any = [
    // {
    //   title:'Hoe zijn de gespreksfases gegaan?',
    //   icon:'faSlidersH',
    //   id:'phases',
    // },
    {
      title:this.translate.instant('conversation.menu_evaluation'),
      icon:'faUserGraduate',
      id:'showEvaluation',
    },
    // {
    //   title:'Verwijder dit gesprek',
    //   icon:'faTrashAlt',
    //   id:'delete',
    // },
  ]

  async toggleHelp(){
    let menuList:any = []//JSON.parse(JSON.stringify(this.helpMenu))
    if(this.conversation.activeConversation.agentsSettings.choices){
      menuList.push({
        title:this.translate.instant('conversation.menu_choices'),
        icon:'faList',
        id:'choices',
      })
    }
    if(this.conversation.activeConversation.agentsSettings.facts){
      menuList.push({
        title:this.translate.instant('conversation.menu_facts'),
        icon:'faUserGraduate',
        id:'factschecker',
      })
    }
    if(this.conversation.activeConversation.agentsSettings.background){
      menuList.push({
        title:this.translate.instant('conversation.menu_background'),
        icon:'faInfoCircle',
        id:'background',
      })
    }
    if(this.media.smallDevice){
      menuList.splice(1,0,{
        title:this.translate.instant('conversation.menu_level'),
        icon:'faSlidersH',
        id:'phases',
      })
      menuList.push({
        title:this.translate.instant('conversation.menu_goal'),
        icon:'faBullseye',
        id:'goals',
      })
    }
    if(this.conversation.activeConversation.closed){
      menuList = JSON.parse(JSON.stringify(this.helpMenuClosed))
      if(this.conversation.activeConversation?.hide?.evaluation){
        menuList = menuList.filter((m:any)=>m.id!='showEvaluation')
      }
      if(this.media.smallDevice){
        menuList.push({
          title:this.translate.instant('conversation.menu_phases'),
          icon:'faSlidersH',
          id:'phases',
        })
        menuList.push({
          title:this.translate.instant('conversation.menu_goal'),
          icon:'faBullseye',
          id:'goals',
        })
      }

    }

    menuList.push({
      title:this.translate.instant('buttons.export_pdf'),
      icon:'faPrint',
      id:'export2Pdf',
    })

    menuList.push({
      title:this.translate.instant('menu.feedback_title'),
      icon:'faComment',
      id:'user_feedback',
    })

    this.shortMenu = await this.popoverController.create({
      component: MenuPage,
      componentProps:{
        customMenu:true,
        pages:menuList,
        listShape:true
      },
      cssClass: 'customMenu',
      event: event,
      translucent: false,
    });
    this.shortMenu.shadowRoot.lastChild.lastChild['style'].cssText = 'border-radius: 24px !important;';

    await this.shortMenu.present()
    await this.shortMenu.onWillDismiss();


    if(this.selectMenuservice.selectedItem){
      // console.log(this.selectMenuservice.selectedItem)
      if(this.selectMenuservice.selectedItem.id=='choices'){
        this.getChoices()
      } 
      else if(this.selectMenuservice.selectedItem.id=='phases'){
        this.showDetails = true
      }
      else if(this.selectMenuservice.selectedItem.id=='goals'){
        this.showGoals = true
      }
      else if(this.selectMenuservice.selectedItem.id=='factschecker'){
        this.checkFacts()
      }
      else if(this.selectMenuservice.selectedItem.id=='background'){
        this.getBackgroundInfo()
      }
      else if(this.selectMenuservice.selectedItem.id=='restart'){
        this.startOver()
      }
      else if(this.selectMenuservice.selectedItem.id=='evaluation'){
        this.endConversation()
      }
      else if(this.selectMenuservice.selectedItem.id=='delete'){
        console.log('delete')
      }
      else if(this.selectMenuservice.selectedItem.id=='showEvaluation'){
        this.showEvaluation()
      }
      else if(this.selectMenuservice.selectedItem.id=='undo'){
        this.conversation.undoLastMove()
      }
      else if(this.selectMenuservice.selectedItem.id=='export2Pdf'){
        this.conversation.export2Pdf()
      }
      else if(this.selectMenuservice.selectedItem.id=='user_feedback'){
        this.openFeedback()
      }
      this.selectMenuservice.selectedItem = null
    }
  }



  showCheckmark = false;
  isAnimating = false;
  completeGoal() {
    this.showCheckmark = true;
    this.isAnimating = true;
  }
  onAnimationEnd() {
    this.isAnimating = false;
    // this.conversation.completedGoal = {goal:'attitude',explanation:'Je hebt de gewenste houding bereikt.'}
    this.conversation.activeConversation.accomplishments.push('attitude')
    this.conversation.activeConversation.accomplishmentList.push(this.conversation.completedGoal)
    this.firestore.updateSub('users', this.auth.userInfo.uid, 'conversations', this.conversation.activeConversation.conversationId, {accomplishments:this.conversation.activeConversation.accomplishments,accomplishmentList:this.conversation.activeConversation.accomplishmentList})
    this.showCheckmark = false;
    this.conversation.completedGoal = null
  }

  analyzing:boolean = false

  getBackgroundInfo(){
    this.analyzing = true
    this.conversation.getExtraInfo('background')
    let count = 0
    setTimeout(() => {
      let interval = setInterval(() => {
        count++
        // console.log('nog bezig')
        if(count>150){
          this.toast.show(this.translate.instant('conversation.background_error'))
          clearInterval(interval)
        }
        if(!this.conversation.isLoading('background')){
          if(!this.conversation.isLoading('facts') && !this.conversation.isLoading('choices')){
            this.analyzing = false
          }
          clearInterval(interval)
          let background:any = JSON.parse(this.conversation.latestAssistantItem(this.conversation.activeConversation.background))
          this.modalService.showText(background.background,'Achtergrond informatie')
        }
      }, 200);
      
    }, 300);
  }

  checkFacts(){
    this.analyzing = true
    this.conversation.getExtraInfo('facts')
    let count = 0
    setTimeout(() => {
      let interval = setInterval(() => {
        count++
        if(count>150){
          this.toast.show(this.translate.instant('conversation.facts_error'))
          clearInterval(interval)
        }
        if(!this.conversation.isLoading('facts')){
          if(!this.conversation.isLoading('background') && !this.conversation.isLoading('choices')){
            this.analyzing = false
          }
          clearInterval(interval)
          let fact:any = JSON.parse(this.conversation.latestAssistantItem(this.conversation.activeConversation.facts))
          this.modalService.showText(fact.new_fact,'Feiten check')
        }
      }, 200);
      
    }, 300);
  }

  getChoices(){
    this.analyzing = true
    this.conversation.getExtraInfo('choices')
    let count = 0
    setTimeout(() => {
      let interval = setInterval(() => {
        count++
        if(count>150){
          this.toast.show(this.translate.instant('conversation.choices_error'))
          this.analyzing = false
          clearInterval(interval)
        }
        if(!this.conversation.isLoading('choices')){
          if(!this.conversation.isLoading('background') && !this.conversation.isLoading('facts')){
            this.analyzing = false
          }
          clearInterval(interval)
          this.showChoices()
        }
      }, 200);
      
    }, 300);
  }

  showFeedbackModal(index:number,messageId:string){
    // {content:conversation.getFeedbackChat(index,'feedback'),title:'Feedback',feedback:{type:'feedback',conversationId:conversation.activeConversation.conversationId,caseId:conversation.activeConversation.caseId}}

    // console.log(this.conversation.getFeedbackChat(index,'id',messageId))

    this.modalService.showInfo(
      {
        content:this.conversation.getFeedbackChat(index,'feedback',messageId),
        title:this.translate.instant('feedback.title'),
        feedback:{
          type:'feedback',
          conversationId:this.conversation.activeConversation.conversationId,
          caseId:this.conversation.activeConversation.caseId,
          userId:this.auth.userInfo.uid,
          feedbackId:this.conversation.getFeedbackChat(index,'id',messageId)
        }
      }
    )


  }


  async openFeedback(){
    let fields = [
      {
        title:this.translate.instant('menu.feedback_type'),
        type:'select',
        required:true,
        value:'feedback',
        optionKeys:[
          {value:'feedback',title:this.translate.instant('menu.feedback')},
          {value:'question',title:this.translate.instant('menu.feedback_question')},
          {value:'remark',title:this.translate.instant('menu.feedback_remark')},
        ]
      },
      {
        title:this.translate.instant('menu.feedback_subject'),
        type:'text',
        required:true,
        value:'',
      },
      {
        title:this.translate.instant('menu.feedback_message'),
        type:'textarea',
        required:true,
        value:'',
      }
    ]

    this.modalService.inputFields(this.translate.instant('menu.feedback'),this.translate.instant('menu.feedback_text'),fields,(result:any)=>{

        if(result.data){
          this.firestore.create('user_messages',{
            type:result.data[0].value,
            subject:result.data[1].value,
            message:result.data[2].value,
            user:this.auth.userInfo.uid,
            displayName:this.auth.userInfo.displayName,
            email:this.auth.userInfo.email,
            date:new Date(),
            timestamp:new Date().getTime(),
            read:false,
            archived:false,
            caseId:this.conversation.activeConversation.caseId,
            conversationId:this.conversation.activeConversation.conversationId,
            url:window.location.href
          })
          this.toast.show(this.translate.instant('menu.feedback_sent'))
        }
      })
  }

  hideDisclaimerText(){
    this.hideDisclaimer = true
    localStorage.setItem('hideDisclaimer', moment().unix().toString());
  }
  
  
}
