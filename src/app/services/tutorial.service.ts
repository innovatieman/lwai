import { Injectable } from '@angular/core';
import { ShepherdService } from 'angular-shepherd';
import { FirestoreService } from './firestore.service';
import { color } from 'highcharts';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../auth/auth.service';
import { MediaService } from './media.service';

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
  [x:string]: any;
  allTutorials:any = []
  tutorialsPerPage:any = {};
  tutorialsLoaded:boolean = false;
  activeTutorial:any
  
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
    buttons: [
      'cancel',
      'back',
      'next'
    ],
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
      type: "back"
    },
    cancel: {
      classes: "saveButton",
      secondary: true,
      text: this.translate.instant('buttons.exit'),
      action: ()=>{
        this.exit()
      }
    },
    next: {
      classes: "saveButton",
      text: this.translate.instant('buttons.next'),
      type: "next"
    },
    complete: {
      classes: "saveButton",
      text: this.translate.instant('buttons.complete'),
      action: ()=>{
        this.complete()
      }
    }
  };

  constructor(
    private shepherdService: ShepherdService,
    private firestore:FirestoreService,
    private translate:TranslateService,
    private auth:AuthService,
    private media:MediaService,
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
    console.log(this.tutorialsPerPage)
    this.tutorialsLoaded = true
  }
  


  getTutorials(){
    this.firestore.get('tutorials').subscribe((tutorials:any)=>{
      this.allTutorials = tutorials.map((tutorial:any)=>{
        return {
          ...tutorial.payload.doc.data(),
          id:tutorial.payload.doc.id
        }
      })
      this.organizeTutorials()
    })
  }

  triggerTutorial(page:string,trigger:string,restart?:boolean){
    let count:number = 0;
    let checkInterval = setInterval(()=>{
      count++
      if(count>2000){
        clearInterval(checkInterval)
      }
      if(this.tutorialsLoaded && this.auth.userInfo.uid){
        clearInterval(checkInterval)

        // if((this.auth.userInfo?.tutorials&&this.auth.userInfo?.tutorials[page]&&this.auth.userInfo?.tutorials[page][trigger]&&!restart) || !this.tutorialsPerPage[page][trigger].active){
        if(!this.tutorialsPerPage[page][trigger].active){
          return
        }
        this.startTutorial(page,trigger)
      }
    },100)
  }

  startTutorial(page:string,trigger:string){
    if(this.tutorialsPerPage[page]&&this.tutorialsPerPage[page][trigger]&&!this.activeTutorial){
      this.activeTutorial = this.tutorialsPerPage[page][trigger]
      this.shepherdService.defaultStepOptions = defaultStepOptions;
      this.shepherdService.modal = true;
      let steps = this.tutorialSteps(this.tutorialsPerPage[page][trigger].steps)
      this.shepherdService.addSteps(steps);
      this.shepherdService.start();
    }
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
    let newSteps:any[] = []
    steps.forEach((step:any)=>{
      
      let buttons:any[] = []
      step.buttons.forEach((button:any)=>{
        buttons.push(this.STEPS_BUTTONS[button])
      })

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
          show: () => {
            console.log('show step');
          },
          hide: () => {
            console.log('hide step');
          }
        }
      })
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
    let userTutorials = this.auth.userInfo.tutorials
    if(!userTutorials){
      userTutorials = {}
    }
    if(!userTutorials[this.activeTutorial.page]){
      userTutorials[this.activeTutorial.page] = {}
    }
    userTutorials[this.activeTutorial.page][this.activeTutorial.trigger] = true
    console.log(userTutorials)
    this.firestore.update('users',this.auth.userInfo.uid,{tutorials:userTutorials})
    this.activeTutorial = null
    console.log(this.activeTutorial) 
  }

  complete(){
    console.log('complete',this.activeTutorial)
    this.shepherdService.complete();
    this.exit(true)
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
