import { ChangeDetectorRef, Component, ElementRef, HostListener, NgZone, OnInit, ViewChild } from '@angular/core';
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
// import { HeyGenApiService } from 'src/app/services/heygen.service';

highchartsMore(Highcharts);
solidGauge(Highcharts);

@Component({
  selector: 'app-conversation',
  templateUrl: './conversation.page.html',
  styleUrls: ['./conversation.page.scss'],
})
export class ConversationPage implements OnInit {
  @HostListener('window:resize', ['$event'])
  onResize(){
    this.media.setScreenSize()
    this.rf.detectChanges()
  }
  @ViewChild('draggableElement', { static: false }) draggableElement!: ElementRef;
  [x: string]: any;
  position:any = { x: this.media.screenWidth - 210, y: 10 }; // Startpositie van de div

  private gesture!: Gesture;

  Highcharts: typeof Highcharts = Highcharts;
  chartConstructor: string = 'chart';
  updateSubscription:Subscription = new Subscription()
  activeStream:boolean = false; 
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

  ngOnInit() {

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

    this.conversation.updateAchievements.subscribe((newGoal:any)=>{
      this.completeGoal()
    })

    this.tutorial.action.subscribe((action:any)=>{
      let actions = action.split('.')
      if(actions[0]=='conversation'){
        this[actions[1]]()
      }
    })

    this.route.params.subscribe(params=>{

      if(!params['case']){
        this.nav.go('start')
        return
      }
      this.updateSubscription = this.conversation.update.subscribe(()=>{
        setTimeout(() => {
          if(this.chart?.series&&this.chart?.series[0]){
            const series = this.chart.series[0]; 
            series.setData([this.conversation.attitude], true);
            this.rf.detectChanges();
          }
        }, 300);
        
        if(this.conversation.activeConversation.video_on){
          this.interaction = 'combination'
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
  }

  ngAfterViewInit() {
    this.rating_comment = ''

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
    console.log('start conversation')
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
            this.interaction = 'combination'
          }
          setTimeout(() => {
            if (this.draggableElement) {
              this.createDragGesture();
            } else {
              console.error('Draggable element is not available');
            }
          }, 1);
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

      this.conversation.startConversation(caseItem)
      if(caseItem.avatarName){
        this.interaction = 'combination'
      }
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
      console.log(response)
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

  ionViewDidEnter(){
    if(localStorage.getItem('continueConversation')){
      localStorage.removeItem('continueConversation')
      console.log('continue')
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
    if(!localStorage.getItem('conversation')){
      return
    }
    this.started = true
    
    this.createDragGesture();


    let conversation = JSON.parse(localStorage.getItem('conversation')||'{}')
    if(conversation.avatarName){
      this.interaction = 'combination'
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

  showImpact(obj:any){
    let text = '';
    text = text + '<b>Score Totaal:</b> ' + obj.score + '<br>'
    text = text + '<b>Score user:</b> ' + obj.score_user + '<br>'
    text = text + '<b>Score '+this.conversation.caseItem.role+':</b> ' + obj.score_assistant + '<br><br>'
    text = text + obj.feedback
    this.modalService.showText(text,obj.title)

  }

  endConversation(){
    if(this.conversation.activeConversation.closed){
      if(this.conversation.activeConversation.courseId){
        this.nav.go('course/'+this.conversation.activeConversation.courseId)
        return
      }
      else{
        this.nav.go('start')
        return
      }
    }


    this.modalService.showVerification(
      this.translate.instant('buttons.close'),
      this.translate.instant('conversation.close_text'),
      [
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

      }]
    ).then(response=>{
      
      if(response=='end'){
        this.conversation.closing = true
        this.conversation.closeConversation(()=>{
        })
      }
      else if(response=='pause'){
        if(this.conversation.activeConversation.courseId){
          this.nav.go('course/'+this.conversation.activeConversation.courseId)
          return
        }
        else{
          this.nav.go('start')
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
        this.nav.go('start')
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

        this.modalService.showEvaluation({closing:this.conversation.activeConversation.close[0].content,skills:this.conversation.activeConversation.skills[0].content,title: 'Afsluiting',buttons:[{text:'Gelezen',value:true,color:'secondary'}],firstTime:firstTime,conversation_level:this.conversation.activeConversation.level,conversation:this.conversation.activeConversation,exportPdf:'conversation'},async ()=>{

          
          
        
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
              if(firstTime){
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
    if(this.interaction=='combination' || off){
      this.conversation.heyGen.disconnect('avatar_video')
      this.firestore.updateSub('users',this.auth.userInfo.uid,'conversations',this.conversation.activeConversation.conversationId,{video_on:false})
      let tempConversation = JSON.parse(localStorage.getItem('conversation')||'{}')
      tempConversation.video_on = false
      localStorage.setItem('conversation',JSON.stringify(tempConversation))
      this.interaction = 'chat'
    }
    else if(this.interaction=='chat'){
      this.interaction = 'combination'
      this.createDragGesture()
      this.conversation.restartAvatar()
      this.firestore.updateSub('users',this.auth.userInfo.uid,'conversations',this.conversation.activeConversation.conversationId,{video_on:true})
      let tempConversation = JSON.parse(localStorage.getItem('conversation')||'{}')
      tempConversation.video_on = true
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
  startRecording(event:Event) {
    event.preventDefault();
    event.stopPropagation();
    this.record.recording = true;
    this.transcript = '';
    this.record.startRecording('audioToText',this.conversation.activeConversation.conversationId,(response:any)=>{
      if(response){
        if(response=='error'){
          this.toast.show(this.translate.instant('conversation.sound_error'))
        }
        else{
          this.loadingTextFromAudio = false;
          this.question = this.question ? this.question + ' ' + response : response;
          this.record.analyzing = false;
          this.rf.detectChanges();
        }
      }
    })
    // this.voiceSessionId = this.auth.userInfo.uid+'_'+this.conversation.activeConversation.conversationId+'_'+Date.now()
    // this.record.startRecording(this.voiceSessionId);
    // this.voiceSubscription = this.firestore.getDoc('transcriptions',this.voiceSessionId).subscribe((data:any)=>{
    //   if (data.payload.data()?.transcript?.length) {
    //     this.question = data.payload.data().transcript[data.payload.data().transcript.length - 1];
    //   }
    // });

  }

  stopRecording(event:Event) {
    event.preventDefault();
    event.stopPropagation();
    this.record.recording = false;
    this.record.analyzing = true;
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

  showFeedbackModal(index:number){
    // {content:conversation.getFeedbackChat(index,'feedback'),title:'Feedback',feedback:{type:'feedback',conversationId:conversation.activeConversation.conversationId,caseId:conversation.activeConversation.caseId}}

    console.log(this.conversation.getFeedbackChat(index,'id'))

    this.modalService.showInfo(
      {
        content:this.conversation.getFeedbackChat(index,'feedback'),
        title:this.translate.instant('feedback.title'),
        feedback:{
          type:'feedback',
          conversationId:this.conversation.activeConversation.conversationId,
          caseId:this.conversation.activeConversation.caseId,
          userId:this.auth.userInfo.uid,
          feedbackId:this.conversation.getFeedbackChat(index,'id')
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
}
