import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/auth/auth.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';
import { ToastService } from 'src/app/services/toast.service';
import { tutorialService } from 'src/app/services/tutorial.service';

@Component({
  selector: 'app-tutorials',
  templateUrl: './tutorials.page.html',
  styleUrls: ['./tutorials.page.scss'],
})
export class TutorialsPage implements OnInit {
  tutorial:any = {}
  showSteps:boolean = false
  attachToOnOptions:any = ["","auto","auto-start","auto-end","top","top-start","top-end","bottom","bottom-start","bottom-end","right","right-start","right-end","left","left-start","left-end"]

  constructor(
    private firestore:FirestoreService,
    private translate:TranslateService,
    private auth:AuthService,
    public media:MediaService,
    public icon:IconsService,
    public tutorialService:tutorialService,
    private toast:ToastService,
    private modalService:ModalService,
    private nav:NavService
  ) { }

  ngOnInit() {
  }

  select(tutorial:any){
    this.tutorial = tutorial
  }

  copy(){
    this.toast.showLoader()
    let newTutorial = JSON.parse(JSON.stringify(this.tutorial))
    newTutorial.title = newTutorial.title + " - Copy"
    newTutorial.active = false
    delete newTutorial.id
    this.firestore.create('tutorials', newTutorial,(result:any)=>{
      setTimeout(() => {
        this.toast.hideLoader()
        let tutorial = this.tutorialService.getTutorialById(result.id)
        this.select(tutorial)
      }, 300);
    })
  }

  add(){

  }

  addStep(step?:any){
    if(!step){
      step = JSON.parse(JSON.stringify(this.tutorialService.defaultStep))
    }
    this.tutorial.steps.push(step)
    this.update('steps')
  }
  update(field:string,arrayOnPurpose:boolean = false){

    let obj:any = {}
    obj[field] = this.tutorial[field]
    this.firestore.update('tutorials', this.tutorial.id, obj)
  }


  editHtml(text:string,step_index:number){
    this.modalService.editHtmlItem({value:text},(result:any)=>{
      console.log(result)
      if(result.data){
        this.tutorial.steps[step_index].text = result.data.value
        this.update('steps')
      }
    })
  }

  async upload(step_index:number){
    this.media.selectedFile = await this.media.selectFile()
    this.media.uploadImage(this.media.selectedFile,(result:any) => {
      if(result?.result){
        this.tutorial.steps[step_index].video = ''
        this.tutorial.steps[step_index].photo = result.result.url
        this.update('steps')
      }
    })
  }

  async uploadVideo(step_index:number){
    this.media.selectVideo((result:any) => {
      console.log(result)
      if(result?.url){
        this.tutorial.steps[step_index].photo = ''
        this.tutorial.steps[step_index].video = result.url.split('raw-videos%2F')[1]
        this.update('steps')
      }
    })
  }

  moveStep(step_index:number,direction:number){
    let step = this.tutorial.steps[step_index]
    this.tutorial.steps.splice(step_index,1)
    if(direction == -1){
      this.tutorial.steps.splice(step_index-1,0,step)
    }else{
      this.tutorial.steps.splice(step_index+1,0,step)
    }
    this.update('steps')
  }

  deleteStep(step_index:number){
    this.modalService.showConfirmation('Are you sure you want to delete this step?').then((result:boolean)=>{
      if(result){
        this.tutorial.steps.splice(step_index,1)
        this.update('steps')
      }
    })
  }

  copyStep(step_index:number){
    let step = JSON.parse(JSON.stringify(this.tutorial.steps[step_index]))
    this.tutorial.steps.splice(step_index,0,step)
    this.update('steps')
  }

  async startTranslation(tutorial?:any){
    let id = ''
    if(!tutorial?.id){
      if(!this.tutorial.id){
        this.toast.show('Selecteer een casus')
        return
      }
      id = this.tutorial.id
    }
    else{
      id = tutorial.id
    }
    console.log(tutorial)
    let list:any[] = []
    this.nav.langList.forEach((lang)=>{
      list.push({
        value:lang,
        title:this.translate.instant('languages.'+lang),
        icon:'faGlobeEurope'
      })
    })
    this.modalService.inputFields('Selecteer de originele taal','',[{
      type:'select',
      placeholder:'Selecteer de originele taal',
      value:this.translate.currentLang,
      optionKeys:list
    }],(result:any)=>{
      console.log(result)
      if(result.data){
        this.firestore.update('tutorials',id!,{original_language:result.data[0].value,translate:false})
        setTimeout(() => {
          this.firestore.update('tutorials',id!,{original_language:result.data[0].value,translate:true})
        }, 1000);
        this.toast.show('Translation started')
      }
    })
     
  }

}
