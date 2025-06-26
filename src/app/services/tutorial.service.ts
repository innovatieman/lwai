import { EventEmitter, Injectable, Output } from '@angular/core';
import { ShepherdService } from 'angular-shepherd';
import { FirestoreService } from './firestore.service';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../auth/auth.service';
import { MediaService } from './media.service';
import { NavService } from './nav.service';

const defaultStepOptions = {
  classes: "tutorialPop",
  scrollTo: true,
  cancelIcon: {
    enabled: true
  }
};

@Injectable({
  providedIn: 'root'
})
export class tutorialService {
  @Output() action: EventEmitter<string> = new EventEmitter();
  
  [x:string]: any;
  allTutorials:any = []
  tutorialsPerPage:any = {};
  tutorialsLoaded:boolean = false;
  activeTutorial:any
  
  defaultTutorial:any = {
    title: '',
    trigger: '',
    page: '',
    active: false,
    desktop: true,
    mobile: true,
    steps: [],
    style:''
  }


  defaultStep:any = {
    title: this.translate.instant('tutorials.step_title_default'),
    content: '',
    scrolledTo: false,
    target: '.tutorialPop',
    attachTo: {
      element: '',
      on: 'bottom'
    },
    classes: '',
    buttons: {
      back: true,
      cancel: false,
      no_thanks: false,
      next: true,
      complete: false,
      please: false,
    },
    cancelIcon: {
      enabled: true
    },
    photo: '',
    video: '',
  }
  

  STEPS_BUTTONS:any = {
    back: {
      classes: "saveButton",
      secondary: true,
      text: this.translate.instant('buttons.back'),
      type: "back",
    },
    cancel: {
      classes: "saveButton",
      secondary: true,
      text: this.translate.instant('buttons.exit'),
      action: ()=>{
        this.exit()
      },
    },
    no_thanks: {
      classes: "saveButton",
      secondary: true,
      text: this.translate.instant('buttons.no_thanks'),
      action: ()=>{
        this.exit()
      },
    },
    next: {
      classes: "saveButton",
      text: this.translate.instant('buttons.next'),
      type: "next",
    },
    complete: {
      classes: "saveButton",
      text: this.translate.instant('buttons.complete'),
      action: ()=>{
        this.complete()
      },
    },
    please: {
      classes: "saveButton",
      text: this.translate.instant('buttons.please'),
      type: "next",
    },
    moveToStart:{
      classes: "saveButton",
      text: this.translate.instant('buttons.complete'),
      action: ()=>{
        this.moveToStart()
      },
    }
    
  };

  constructor(
    private shepherdService: ShepherdService,
    private firestore:FirestoreService,
    private translate:TranslateService,
    private auth:AuthService,
    private media:MediaService,
    private nav:NavService
  ) {
    this.getTutorials()
  }


  organizeTutorials(){
    this.allTutorials.forEach((tutorial:any)=>{
      if(!this.tutorialsPerPage[tutorial.page]){
        this.tutorialsPerPage[tutorial.page] = {}
      }
        this.tutorialsPerPage[tutorial.page][tutorial.trigger] = tutorial
    })
    // console.log(this.tutorialsPerPage)
    this.tutorialsLoaded = true
  }
  
  get allButtons(){
    let buttons:any[] = []
    for(let button in this.STEPS_BUTTONS){
      let buttonData:any = this.STEPS_BUTTONS[button]
      buttonData.id = button
      if(button == 'moveToStart'){
        buttonData.nextMove = 'Naar start'
      }
      buttons.push(buttonData)
    }
    return buttons
  }


  getTutorials(){
    this.firestore.get('tutorials').subscribe((tutorials:any)=>{
      this.allTutorials = tutorials.map((tutorial:any)=>{
        return {
          ...tutorial.payload.doc.data(),
          id:tutorial.payload.doc.id,
          languages:{}
        }
      })
      // get all tutorials languages as subcollection
      this.allTutorials.forEach((tutorial:any)=>{
        this.firestore.getSub('tutorials',tutorial.id,'translations').subscribe((languages:any)=>{
          languages.map((language:any)=>{
            tutorial.languages[language.payload.doc.id] = language.payload.doc.data()
          })
        }
        )
      })
      // console.log(this.allTutorials)
      this.organizeTutorials()
    })
  }

  triggerTutorial(page:string,trigger:string,restart?:boolean){
    this.auth.userInfo$.subscribe(userInfo => {
      if (userInfo) {
        let count:number = 0;
        let checkInterval = setInterval(()=>{
          count++
          if(count>2000){
            clearInterval(checkInterval)
          }
          if(this.tutorialsLoaded && this.auth.userInfo.uid){
            clearInterval(checkInterval)
    
            if((this.auth.tutorials.tutorials&&this.auth.tutorials.tutorials[page]&&(this.auth.tutorials.tutorials[page][trigger] || this.auth.tutorials.tutorials[page][trigger.replace('_mobile','')])&&!restart) || (!this.tutorialsPerPage[page] || !this.tutorialsPerPage[page][trigger] || !this.tutorialsPerPage[page][trigger].active)){
              return
            }
            if(!this.tutorialsPerPage[page][trigger].desktop && !this.media.smallDevice){
              return
            }
            if(!this.tutorialsPerPage[page][trigger].mobile && this.media.smallDevice){
              return
            }
            // console.log('start tutorial')
            this.startTutorial(page,trigger)
          }
        },100)
      }
    })
  }

  startTutorial(page:string,trigger:string){
    // console.log(this.tutorialsPerPage[page],this.tutorialsPerPage[page][trigger],!this.activeTutorial)
    if(this.tutorialsPerPage[page]&&this.tutorialsPerPage[page][trigger]&&!this.activeTutorial){
      this.activeTutorial = this.tutorialsPerPage[page][trigger]
      this.shepherdService.defaultStepOptions = defaultStepOptions;
      this.shepherdService.modal = true;
      let steps = this.tutorialSteps(this.tutorialsPerPage[page][trigger].languages[this.translate.currentLang].steps)
      console.log(steps)
      this.shepherdService.addSteps(steps);
      this.shepherdService.start();
    }
  }

  getContent(page:string,trigger:string,step:number,field:string){
    let steps = this.tutorialSteps(this.tutorialsPerPage[page][trigger].languages[this.translate.currentLang].steps)
    let stepData = steps[step]
    if(stepData){
      if(stepData[field]){
        return stepData[field]
      }
    }
    return ''
  }


  // createdButtons(buttons:any[]){

  //   let newButtons:any[] = []
  //   buttons.forEach((button:any)=>{     
  //     newButtons.push({
  //       classes: button.classes,
  //       text: button.text,
  //       type: button.type,
  //     })
  //   })
  //   return newButtons
  // }

  tutorialSteps(steps:any){
    // console.log(steps)
    let newSteps:any[] = []
    steps.forEach((step:any)=>{
      
      let buttons:any[] = []
      // this.STEPS_BUTTONS.forEach((button:any)=>{
      //   if(step.buttons[button]){
      //     buttons.push(this.STEPS_BUTTONS[button])
      //   }
      // })
      // console.log(step)
      for(let button in this.STEPS_BUTTONS){
        let buttonData:any = this.STEPS_BUTTONS[button]
        if(step.buttons[button]){
          buttons.push(buttonData)
        }
      }


      let text = ''
      if(step.photo){
        text = '<div class="inner-photo"><img src="'+step.photo+'" class="tutorialPhoto" /></div>'
      }
      if(step.video){
        text = '<div class="inner-video"><video src="'+this.media.videoUrl(step.video)+'" class="tutorialVideo" controls autoplay></video></div>'
      }
      text = text+ '<div class="inner-content">'+step.text+'</div>'

      newSteps.push({
        attachTo: {
          element: step.attachTo.element,
          on: step.attachTo.on
        },
        buttons: buttons,
        classes: step.classes,
        cancelIcon: {
          enabled: step.cancelIcon.enabled
        },
        id: step.id,
        title: step.title,
        scrolledTo: step.scrolledTo,
        text: text,
        when: {
          cancel: () => {
            this.exit(true)
            this.activeTutorial = null
          },
          hide: () => {
            console.log('hide')
            if(step.onhide){
              this.action.emit(step.onhide)
            }
          },
          show: () => {
            if(step.onshow){

              this[step.onshow]()
            }
          }
        }
      })
      if(!step.attachTo?.element){
        delete newSteps[newSteps.length-1].attachTo
      }
            
      // console.log(newSteps)
    })
    return newSteps
  }

  getTutorialById(id:string){
    return this.allTutorials.find((tutorial:any)=>tutorial.id == id)
  }
  getTutorialByPageTrigger(page:string,trigger:string){
    if(this.tutorialsPerPage[page]&&this.tutorialsPerPage[page][trigger]){
      return this.tutorialsPerPage[page][trigger]
    }
    return null
  }
  
  exit(completed?:boolean){
    if(!completed){
      this.shepherdService.cancel();
    }
    let userTutorials = this.auth.tutorials.tutorials
    if(!userTutorials){
      userTutorials = {}
    }
    if(!userTutorials[this.activeTutorial.page]){
      userTutorials[this.activeTutorial.page] = {}
    }
    userTutorials[this.activeTutorial.page][this.activeTutorial.trigger.replace('_mobile','')] = true
    console.log(userTutorials)
    this.firestore.setSub('users',this.auth.userInfo.uid,'tutorials','tutorials',{tutorials:userTutorials})
    this.activeTutorial = null
    // console.log(this.activeTutorial) 
  }

  complete(){
    this.shepherdService.complete();
    this.exit(true)
  }
  
  moveToStart(){
    console.log('moveToStart')
    this.shepherdService.complete();
    this.exit(true)
    this.nav.go('start')
  }

  showAction(action:any){
    console.log(action)
    this[action]()
  }

  hideAction(action:any){
    console.log(action)
    this[action]()
  }
}
