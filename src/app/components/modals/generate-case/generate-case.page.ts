import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/auth/auth.service';
import { IconsService } from 'src/app/services/icons.service';
import { InfoService } from 'src/app/services/info.service';
import { MediaService } from 'src/app/services/media.service';
import { ToastService } from 'src/app/services/toast.service';
import { InputFieldsPage } from '../input-fields/input-fields.page';
import { TrainerService } from 'src/app/services/trainer.service';
import { InfoModalPage } from '../info-modal/info-modal.page';
import { NavService } from 'src/app/services/nav.service';
import { FirestoreService } from 'src/app/services/firestore.service';

@Component({
  selector: 'app-generate-case',
  templateUrl: './generate-case.page.html',
  styleUrls: ['./generate-case.page.scss'],
})
export class GenerateCasePage implements OnInit {
  @Input() caseItem:any = {}
  step = -1
  promptChecked:boolean = false
  showExtraQuestions:boolean = false
  showOtherCommunicationStyle:boolean = false
  showGoal:any = {
    attitude: false,
    phases: false,
    free: false
  }
  caseItemOriginal:any = {}
  requiredPerPage: any = {
    0: ['role'],
    1: [],
    2: [],
    3: [],
  }

  specificQuestions:any = {
    "application":2,
    "assessment":2,
    "client":2,
    "coaching":1,
    "complaint_conversation":2,
    "conflict":2,
    "consultation":1,
    "customer":2,
    "debate":2,
    "feedback":2,
    "introduction":1,
    "negotiation":2,
    "personal":2,
    "sales":2,
    "transformative":2,
    "deep":2,
    "work":2,
    "expert":2,
  }
  specificQuestionsOutput:any=[]
  
  communicationSkills:any = [
    {id:'blunt',selected:false},
    {id:'long_winded',selected:false},
    {id:'interested',selected:false},
    {id:'reserved',selected:false},
    {id:'friendly',selected:false},
    {id:'neutral',selected:false},
    {id:'angry',selected:false},
    {id:'upset',selected:false},
    {id:'scared',selected:false},
    {id:'unsure',selected:false},
    {id:'confident',selected:false},
    {id:'directive',selected:false},
    {id:'compliant',selected:false},
    {id:'hesitant',selected:false},
    {id:'intimidating',selected:false},
    {id:'aggressive',selected:false},
    {id:'in_love',selected:false},
    {id:'rejecting',selected:false},
    {id:'wait_and_see',selected:false},
    // {id:'other',selected:false},
  ]


  constructor(
    public modalCtrl:ModalController,
    public icon:IconsService,
    private toast:ToastService,
    public media:MediaService,
    public translate:TranslateService,
    public info:InfoService,
    public auth:AuthService,
    public infoService:InfoService,
    public trainerService:TrainerService,
    private modalController: ModalController,
    private nav:NavService,
    private firestore: FirestoreService,
  ) { }

  ngOnInit() {
    if(this.caseItem){
      if(this.caseItem.goals){
        this.caseItem.goalsItems = JSON.parse(JSON.stringify(this.caseItem.goals))
        delete this.caseItem.goals
      }
      if(!this.caseItem.editable_by_user.agents){
        this.caseItem.editable_by_user.agents = {
          choices:true,
          facts:true,
          background:true,
          undo:true,
        }
      }
      if(!this.caseItem.category_specifics){
        this.caseItem.category_specifics = {}
      }
      if(!this.caseItem.communicationSkills){
        for(let i=0;i<this.communicationSkills.length;i++){
          if(this.caseItem.communicationSkills?.includes(this.communicationSkills[i].id)){
            this.communicationSkills[i].selected = true
          }
        }
      }

      if(this.caseItem.openingMessage){
        this.caseItem.openingMessage = this.caseItem.openingMessage.replace('[name]',this.auth.userInfo.displayName).replace('[naam]',this.auth.userInfo.displayName).replace('[role]',this.caseItem.role).replace('[rol]',this.caseItem.role)
      }

      this.caseItemOriginal = JSON.parse(JSON.stringify(this.caseItem))
      this.getSpecificQuestions(this.caseItem.conversation)
    }
    else{
      this.modalCtrl.dismiss()
    }
    if(!this.caseItem.admin&&!this.inputEmpty()){
      this.promptChecked = true
    }
    if(this.caseItem.admin&&this.caseItem.existing){
      this.promptChecked = true
    }
    if(this.caseItem.goalsItems.attitude){
      this.showGoal.attitude = true
    }
    if(this.caseItem.goalsItems.phases?.length>0){
      this.showGoal.phases = true
    }
    if(this.caseItem.goalsItems.free){
      this.showGoal.free = true
    }
    this.slide(0,false,true)
  }

  doNothing(){}

  async slide(nr:number,back?:boolean,start?:boolean){
    this.toast.hideTooltip()
    let checkNr = nr-1
    if(back){checkNr = nr +1}

    if(!start&&this.requiredPerPage[checkNr].length != 0){
      this.requiredPerPage[checkNr].forEach((field:string) => {
        if(!this.caseItem[field]){
          this.errorMessage('error_messages.no_'+field)
          nr = checkNr
          return
        }
      });
      
    }

    if(this.caseItem.id && !this.showStep(nr)){
      if(nr==3){
        this.close()
        return
      }
      if(back){
        if(nr==0){
          this.modalCtrl.dismiss()
          return
        }
        this.slide(nr-1,true)
      }
      else{
        this.slide(nr+1)
      }
      return
    }
    
    this.step = nr
    // this.promptChecked = true
    if(nr === 3){
      if((!this.caseItem.admin&&!this.caseItem.editable_by_user.casus&&!this.changesMade())){
        if(back){
          this.slide(2,true)
        }
        else{
          this.slide(4)
        }
      }
      else{
        if(!this.promptChecked&&!this.caseItem.casus&&!this.inputEmpty()&&!this.caseItem.existing){
          this.caseItemOriginal = JSON.parse(JSON.stringify(this.caseItem))
          if(!this.caseItem.admin){
            this.promptChecked = true
          }
          else{
            this.promptChecked = true
          }
        }
      }
    }
  }

  editCasus(event:Event){
    event.preventDefault()
    event.stopPropagation()
    this.inputFields('Edit casus','',[{
      type:'html',
      value:this.caseItem.casus
    }],(result:any)=>{
      if(result.data){
        this.caseItem.casus = result.data[0].value
        this.update('casus')
      }
    })
  }
  
public async inputFields(title:string,text:string,fields:any[],callback:Function,extraData?:any){
    const modalItem = await this.modalCtrl.create({
      component:InputFieldsPage,
      componentProps:{
        text:text,
        fields:fields,
        title:title,
        extraData:extraData
      },
      cssClass:'infoModal',
    })
    modalItem.onWillDismiss().then(result=>{
      callback(result)
    })
    return await modalItem.present()
  }


  close(){
    this.toast.hideTooltip()
    let communicationSkills = []
    for(let i=0;i<this.communicationSkills.length;i++){
      if(this.communicationSkills[i].selected){
        communicationSkills.push(this.communicationSkills[i].id)
      }
    }
    this.caseItem.communicationSkills = communicationSkills
    this.modalCtrl.dismiss(this.caseItem)
  }

  update(field?:string,isArray:boolean = false){
    let caseItem = this.caseItem
    console.log('update',field,caseItem)
      if(field){
        this.firestore.setSub('trainers',this.nav.activeOrganisationId,'cases',caseItem.id,caseItem[field],field,()=>{
        },isArray)
      }
  }


  generateReadableText(): string {
    console.log('generateReadableText',this.caseItem)
    if (!this.caseItem) {
      return "Er is geen case-informatie beschikbaar.";
    }
  
    let readableText = `
      **${this.translate.instant('generate_case.case_details')}**:
  
      **${this.translate.instant('generate_case.role')}:** ${this.caseItem.role}
      _${this.translate.instant('generate_case.role_question')}_

      `
      
      if(this.caseItem.name_ai){
        readableText += this.translate.instant('generate_case.name_ai') + `: ${this.caseItem.name_ai}
         _${this.translate.instant('generate_case.name_ai_question')}_
  
        ` 
      }

      if(this.caseItem.user_role){
        readableText += this.translate.instant('generate_case.role_user') + `: ${this.caseItem.user_role}
         _${this.translate.instant('generate_case.role_user_question')}_
  
        ` 
      }

      if(this.caseItem.category_specifics){
        if(this.caseItem.category_specifics[0]){
          readableText += `**${this.translate.instant('generate_case.specifics.'+this.caseItem.conversation+'_question_1')}:** ${this.caseItem.category_specifics[0]}
          _${this.translate.instant('generate_case.specifics.'+this.caseItem.conversation+'_help_1')}_
  
          `
        }
        if(this.caseItem.category_specifics[1]){
          readableText += `**${this.translate.instant('generate_case.specifics.'+this.caseItem.conversation+'_question_2')}:** ${this.caseItem.category_specifics[1]}
          _${this.translate.instant('generate_case.specifics.'+this.caseItem.conversation+'_help_2')}_
  
          `
        }
      }
      
      let selected = []
      for(let j=0;j<this.communicationSkills.length;j++){
        if(this.communicationSkills[j].selected){
            selected.push(this.translate.instant('generate_case.communication_style.'+this.communicationSkills[j].id))
        }
      }
      if(this.caseItem.other_communication_style){
        selected.push(this.caseItem.other_communication_style)
      }
      if(selected.length>0){
        readableText += `**${this.translate.instant('generate_case.communication_style')}:** ${selected.join(', ')}
        _${this.translate.instant('generate_case.communication_style_question')}_

        `
      }

      if(this.caseItem.externalFactors){
        
        readableText += `**${this.translate.instant('generate_case.external_factors_title')}:** ${this.caseItem.externalFactors}
        _${this.translate.instant('generate_case.external_factors_')}_
  
        `
      }
      if(this.caseItem.history){
        readableText += `**${this.translate.instant('generate_case.history_title')}:** ${this.caseItem.history}
        _${this.translate.instant('generate_case.history_')}_  
        `

      }
      // if(this.caseItem.attitude){
      //   readableText += `**${this.translate.instant('generate_case.attitude')}:** ${this.infoService.getAttitude(this.caseItem.attitude).title}
      //   _${this.translate.instant('generate_case.attitude_question')}_

      //   `
      // }
      // if(this.caseItem.steadfastness){
      //   readableText += `**${this.translate.instant('generate_case.steadfastness')}:** ${this.caseItem.steadfastness || 50}
      //   _${this.translate.instant('generate_case.steadfastness_question')}_
      //   `
      // }
  
    return readableText.trim();
  }

  async getPromptOpenAI(input: string) {
    this.toast.showLoader(this.translate.instant('generate_case.generating_case'))
    this.promptChecked = false
    try {
      const response = await fetch("https://europe-west1-lwai-3bac8.cloudfunctions.net/case_prompt_gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: this.auth.userInfo.uid,
          content: input,
          instructionType:'case_prompter',
          categoryId: this.caseItem.conversation,
        }),
      });
  
      if (!response.ok) {
        console.error("Request failed:", response.status, response.statusText);
        this.toast.hideLoader()
        this.toast.show(this.translate.instant('error_messages.error'),3000,'middle')
        return;
      }
  
      // Response uitlezen
      let data = await response.json();
      data.content = data.content.split('```html').join('').split('```').join('').split('html').join('')
      // console.log("Complete response:", data.content); // De volledige tekst in één keer
      this.toast.hideLoader()
      return data.content;
    } catch (error) {
      console.error("Error tijdens fetch:", error);
      throw error;
    }
  }

  async rebuildPrompt(nextSlide?:boolean){
    if(this.inputEmpty()){
      this.toast.show(this.translate.instant('error_messages.no_input'),3000,'middle')
      return
    }
    this.caseItemOriginal = JSON.parse(JSON.stringify(this.caseItem))
    let text = this.generateReadableText()
    console.log('text',text)
    let output = await this.getPromptOpenAI(text)
    this.caseItem.casus = output
    this.promptChecked = true
    if(nextSlide){
      this.slide(3)
    }
  }

  errorMessage(item:string){
    if(!item || item === this.translate.instant(item)){
      item = 'error_messages.required'
    }
    this.toast.show(this.translate.instant(item),3000,'middle')
  }


  showStep(step:number){
    if(this.caseItem.admin){
      return true
    }
    switch(step){
      case 0:
        return this.caseItem.editable_by_user.role||this.caseItem.editable_by_user.description||this.caseItem.editable_by_user.function||this.caseItem.editable_by_user.vision||this.caseItem.editable_by_user.interests
      case 1:
        return this.caseItem.editable_by_user.communicationStyle||this.caseItem.editable_by_user.externalFactors||this.caseItem.editable_by_user.history;
      case 2:
        return this.caseItem.editable_by_user.attitude||this.caseItem.editable_by_user.steadfastness;
      case 3:
        if(this.showStep(0)||this.showStep(1)||this.showStep(2)){
          return true
        }
        return this.caseItem.editable_by_user.casus

      default:
        return false;
    }
  }

  changesMade(){
    let changed = false
    
    if(
      this.caseItem.role !== this.caseItemOriginal.role||
      this.caseItem.name_ai !== this.caseItemOriginal.naam_ai||
      this.caseItem.role_user !== this.caseItemOriginal.role_user||
      this.caseItem.communicationStyle !== this.caseItemOriginal.communicationStyle||
      this.caseItem.externalFactors !== this.caseItemOriginal.externalFactors||
      this.caseItem.history !== this.caseItemOriginal.history||
      (this.caseItem.category_specifics &&
        (
          this.caseItem.category_specifics[1] !== this.caseItemOriginal.category_specifics[1] ||
          this.caseItem.category_specifics[2] !== this.caseItemOriginal.category_specifics[2]
        )
      )
    ){
      changed = true
    }
    return changed
  }
  inputEmpty(){
    let empty = true
    if(
      this.caseItem.role||
      this.caseItem.name_ai||
      this.caseItem.role_user||
      (this.caseItem.category_specifics &&
        (
          this.caseItem.category_specifics[1] ||
          this.caseItem.category_specifics[2]
        )
      )||
      this.caseItem.communicationStyle||
      this.caseItem.externalFactors||
      this.caseItem.history
    ){
      empty = false
    }
    return empty
  }

  showTipInfo(name:string){
    console.log(name)
  }



  getSpecificQuestions(category:string){
    let questions = this.specificQuestions[category]
    let questionList = []
    for(let i=0;i<questions;i++){
      let question = {
        question: this.translate.instant('generate_case.specifics.'+category+'_question_'+(i+1)),
        help: this.translate.instant('generate_case.specifics.'+category+'_help_'+(i+1)),
      }
      if(question.help === 'generate_case.specifics.'+category+'_help_'+(i+1)){
        question.help = ''
      }
      questionList.push(question)
    }
    this.specificQuestionsOutput = questionList
  }

  public async showText(content:string,title?:string,video?:boolean,buttons?:any[],backdropDismiss?:boolean,callback?:any,btnsClass?:string,extraData?:any,image?:boolean){
    let options:any = {
      content:content,
      title:title,
      video:video,
      buttons:buttons,
      btnsClass:btnsClass,
      extraData:extraData,
      image:image
    }
    
    
    if(backdropDismiss==undefined){options.backdropDismiss = true}
    this.showInfo(options,callback)
  }

  public async showInfo(options:any,callback?:any){
      if(options.backdropDismiss==undefined){options.backdropDismiss = true}
      const modalItem = await this.modalController.create({
        component:InfoModalPage,
        componentProps:{
          options:options
        },
        backdropDismiss:options.backdropDismiss,
        cssClass:'infoModal',
      })
      if(callback){
        modalItem.onWillDismiss().then(data=>{
          callback(data)
        })
      }
      return await modalItem.present()
    }

    activateOtherCommunicationStyle(){
      this.showOtherCommunicationStyle = true
      setTimeout(() => {
        let input:any = document.querySelector('#otherCommunicationStyle')
        console.log('input',input)
        if(input){
          input.setFocus()
        }
      }, 100);
    }
}
