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
  

  constructor(
    private route:ActivatedRoute,
    public nav:NavService,
    public cases:CasesService,
    public conversation:ConversationService,
    private zone: NgZone,
    private rf:ChangeDetectorRef,
    public icon:IconsService,
    public modal:ModalService,
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
    private toast:ToastService
  ) { }

  ngOnInit() {

    this.conversation.activeStream.subscribe((active:boolean)=>{
      // console.log(active)
      this.activeStream = active
      this.rf.detectChanges()
    })

    this.conversation.updateAchievements.subscribe((newGoal:any)=>{
      this.completeGoal()
    })

    this.route.params.subscribe(params=>{

      if(!params['conversation']||!params['case']){
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
         this.startConversation(params['case'])
        }

      }
      else if(!this.started&&!localStorage.getItem('continueConversation')){
        //
        console.log('not activated')
        // this.nav.go('start')
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
    



  ionViewDidEnter(){
    if(localStorage.getItem('continueConversation')){
      localStorage.removeItem('continueConversation')
      console.log('continue')
      this.continueConversation()
    }
    else if(!this.started && !localStorage.getItem('activatedCase')){
      this.nav.go('start')
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

  endConversation(){
    this.modal.showConfirmation('Weet je zeker dat je de conversatie wilt beëindigen?').then(response=>{
      // console.log(response)
      if(response){
        this.conversation.closing = true
        let countTries = 0
        this.conversation.closeConversation(()=>{
          let closeInterval = setInterval(() => {
            countTries++
            if(countTries>20){
              // console.log(this.conversation.activeConversation)
              // console.log('clear interval')
              clearInterval(closeInterval)

              // this.modal.showText('De conversatie is afgesloten','Afsluiting',false,[],false,()=>{
                // this.nav.go('start')
              // })
            }
            if(this.conversation?.activeConversation?.close&&this.conversation?.activeConversation?.close[0]){
              clearInterval(closeInterval)
              this.modal.showText(this.conversation.activeConversation.close[0].content, 'Afsluiting',false,[{text:'Gelezen',value:true,color:'secondary'}],false,()=>{
                this.nav.go('start')
                this.conversation.closing = false
              })
            }
            console.log('checking close')
          }, 200);
        })
      }
    })
  }

  showLatestFact(){
    this.conversation.getExtraInfo('facts')
    this.modal.showText(JSON.parse(this.conversation.latestAssistantItem(this.conversation.activeConversation.facts)).new_fact,'Feitje')
  }

  showEvaluation(){
    this.modal.showText(this.conversation.activeConversation.close[0].content,'Evaluatie')
  }
  
  toggleVideo(){
    console.log(this.interaction)
    if(this.interaction=='combination'){
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

  startRecordingAudio(){
    this.record.startRecording('audioToText',(response:any)=>{
      if(response){
        this.loadingTextFromAudio = false
        if(this.question==''){
          this.question = response
        }
        else{
          this.question = this.question + ' ' + response
        }
        this.rf.detectChanges()
      }
    })
  }
  loadingTextFromAudio:boolean = false
  stopRecordingAudio(){
    this.loadingTextFromAudio = true
    this.record.stopRecording(()=>{
      this.rf.detectChanges()
    })
  }

  shortMenu:any
  helpMenu:any = [
    {
      title:'Geef me wat suggesties om te zeggen',
      icon:'faList',
      id:'choices',
    },
    {
      title:'Facts checker',
      icon:'faUserGraduate',
      id:'factschecker',
    },
    {
      title:'Geef me wat achtergrond informatie',
      icon:'faInfoCircle',
      id:'background',
    },
    {
      title:'Maak het laatste bericht ongedaan',
      icon:'faStepBackward',
      id:'undo',
    },
    {
      title:'Start helemaal opnieuw',
      icon:'faFastBackward',
      id:'restart',
    },
    {
      title:'Afsluiten en evalueren',
      icon:'faDoorOpen',
      id:'evaluation',
    },
    {
      title:'Verwijder dit gesprek',
      icon:'faTrashAlt',
      id:'delete',
    },
  ]

  helpMenuClosed:any = [
    {
      title:'Hoe zijn de gespreksfases gegaan?',
      icon:'faSlidersH',
      id:'phases',
    },
    {
      title:'Bekijk de eindevaluatie',
      icon:'faUserGraduate',
      id:'showEvaluation',
    },
    {
      title:'Verwijder dit gesprek',
      icon:'faTrashAlt',
      id:'delete',
    },
  ]

  async toggleHelp(){
    let menuList = JSON.parse(JSON.stringify(this.helpMenu))
    if(this.media.smallDevice){
      menuList.splice(1,0,{
        title:'Hoe staat het met het gesprek?',
        icon:'faSlidersH',
        id:'phases',
      })
    }
    if(this.conversation.activeConversation.closed){
      menuList = this.helpMenuClosed

    }
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
    // this.shortMenu.shadowRoot.lastChild.lastChild['style'].cssText = 'border-radius: 24px !important;';

    await this.shortMenu.present()
    await this.shortMenu.onWillDismiss();


    if(this.selectMenuservice.selectedItem){
      console.log(this.selectMenuservice.selectedItem)
      if(this.selectMenuservice.selectedItem.id=='choices'){
        this.getChoices()
      } 
      else if(this.selectMenuservice.selectedItem.id=='phases'){
        this.showDetails = true
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
      this.selectMenuservice.selectedItem = null
    }
  }



  showCheckmark = false;//false; // Toont het vinkje in het midden
  isAnimating = false; // Start de animatie
  // completedGoals: any[] = []; // Bevat de vinkjes in de header
  // completedGoal:any
  // Start de animatie
  completeGoal() {
    // this.completedGoal = goal
    this.showCheckmark = true;
    this.isAnimating = true;
  }

  // Animatie-einde callback
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
          this.toast.show('Er is iets misgegaan bij het ophalen van de achtergrond informatie. Probeer het later nog eens.')
        }
        if(!this.conversation.isLoading('background')){
          if(!this.conversation.isLoading('facts') && !this.conversation.isLoading('choices')){
            this.analyzing = false
          }
          clearInterval(interval)
          let background:any = JSON.parse(this.conversation.latestAssistantItem(this.conversation.activeConversation.background))
          this.modal.showText(background.background,'Achtergrond informatie')
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
          this.toast.show('Er is iets misgegaan bij het ophalen van de achtergrond informatie. Probeer het later nog eens.')
        }
        if(!this.conversation.isLoading('facts')){
          if(!this.conversation.isLoading('background') && !this.conversation.isLoading('choices')){
            this.analyzing = false
          }
          clearInterval(interval)
          let fact:any = JSON.parse(this.conversation.latestAssistantItem(this.conversation.activeConversation.facts))
          this.modal.showText(fact.new_fact,'Feiten check')
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
          this.toast.show('Er is iets misgegaan bij het ophalen van de mogelijke opties. Probeer het later nog eens.')
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
}
