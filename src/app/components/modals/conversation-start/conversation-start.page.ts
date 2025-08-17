import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/auth/auth.service';
import { ConversationService } from 'src/app/services/conversation.service';
import { IconsService } from 'src/app/services/icons.service';
import { InfoService } from 'src/app/services/info.service';
import { MediaService } from 'src/app/services/media.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-conversation-start',
  templateUrl: './conversation-start.page.html',
  styleUrls: ['./conversation-start.page.scss'],
})
export class ConversationStartPage implements OnInit {
  @Input() caseItem:any = {}
  step = -1
  promptChecked:boolean = false
  pageLoaded:boolean = false
  showGoal:any = {
    attitude: false,
    phases: false,
    free: false
  }
  directStart:boolean = false
  caseItemOriginal:any = {}
  requiredPerPage: any = {
    0: ['role','title'],
    1: [],
    2: ['attitude','steadfastness'],
    3: [],
    4: [],
    5: ['openingMessage'],
    6: []

  }
  constructor(
    public modalCtrl:ModalController,
    public icon:IconsService,
    private toast:ToastService,
    public media:MediaService,
    public translate:TranslateService,
    public info:InfoService,
    public auth:AuthService,
    private route:ActivatedRoute,
    private conversationService:ConversationService,
    
  ) { }

  ngOnInit() {

    // console.log(location.pathname.substring(1))
    console.log('conversation start page',this.caseItem)
    if(this.caseItem){
      if(this.caseItem.goals){
        this.caseItem.goalsItems = JSON.parse(JSON.stringify(this.caseItem.goals))
        delete this.caseItem.goals
      }
      if(!this.caseItem.editable_by_user){
        this.caseItem.editable_by_user = {
          goals:{
            phases:false,
            free:true,
            attitude:false,
          },
          openingMessage:true,
          agents:{
            choices:true,
            facts:true,
            background:true,
            undo:true,
          }
        }
      }
      if(!this.caseItem.editable_by_user.agents){
        this.caseItem.editable_by_user.agents = {
          choices:true,
          facts:true,
          background:true,
          undo:true,
        }
      }

      if(this.caseItem.openingMessage){
        this.caseItem.openingMessage = this.caseItem.openingMessage.replace('[name]',this.auth.userInfo.displayName).replace('[naam]',this.auth.userInfo.displayName).replace('[role]',this.caseItem.role).replace('[rol]',this.caseItem.role)
      }

      this.caseItemOriginal = JSON.parse(JSON.stringify(this.caseItem))
      console.log(this.caseItem)
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

  ionViewDidEnter() {
    this.pageLoaded = true
  }

  async slide(nr:number,back?:boolean,start?:boolean){
    this.toast.hideTooltip()
    let checkNr = nr-1
    if(back){checkNr = nr +1}
    // console.log('nr',nr,'checkNr',checkNr,start)
    if(!start&&this.requiredPerPage[checkNr].length != 0){
      this.requiredPerPage[checkNr].forEach((field:string) => {
        if(!this.caseItem[field]){
          this.errorMessage('error_messages.no_'+field)
          nr = checkNr
          return
        }
      });
      
    }
    // console.log('hier')
    if((this.caseItem.id || this.caseItem.caseId) && !this.showStep(nr)){
      if(nr==5){
        this.directStart = true
        let checkLoaded = setInterval(() => {
          if(this.pageLoaded){
            clearInterval(checkLoaded)
            this.close()
          }
        },20)
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
    // console.log('step',nr)
    this.step = nr
    // this.promptChecked = true
    if(nr === 3){
      if((!this.caseItem.admin&&!this.caseItem.editable_by_user.casus&&!this.changesMade())){
        // console.log('rebuild prompt')
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
            // let text = this.generateReadableText()
            // let output = await this.getPromptOpenAI(text)
            // this.caseItem.casus = output
            this.promptChecked = true
          }
          else{
            this.promptChecked = true
          }
        }
      }
    }
  }

  close(){
    if(this.caseItem.minimum_goals<0||!this.caseItem.minimum_goals){
      this.caseItem.minimum_goals = 0
    }
    else if(this.caseItem.minimum_goals>3){
      this.caseItem.minimum_goals = 3
    }
    if(!this.caseItem.title){
      this.caseItem.title = this.caseItem.role
    }
    if(this.caseItem.avatarName){
      this.caseItem.video_on = true
    }
    if(!this.caseItem.avatarName){
      this.caseItem.avatarName = ''
    }
    if(!this.caseItem.photo){
      this.caseItem.photo = ''
    }
    if(this.caseItem.actionsBetweenConversations){
      this.caseItem.actionsBetweenConversationsQuestion = this.translate.instant('conversation.actions_between_conversations')
    }

    this.toast.hideTooltip()
    
    if(location.pathname.substring(1).includes('my_trainings') || location.pathname.substring(1).includes('my_organisation')){
      this.conversationService.originUrl = location.pathname.substring(1)
    }
    else{
      this.conversationService.originUrl = ''
    }
    console.log('caseItem',this.caseItem)
    this.modalCtrl.dismiss(this.caseItem)
  }

  generateReadableText(): string {
    if (!this.caseItem) {
      return "Er is geen case-informatie beschikbaar.";
    }
  
    let readableText = `
      **Case Details**:
  
      **Rol:** ${this.caseItem.role || "Niet ingevuld"}
      _Wie is de gesprekspartner in deze casus en wordt dus gespeeld door de AI-assistent?_
  
      `
      if(this.caseItem.description){
        readableText += `**Beschrijving:** ${this.caseItem.description}
        _Beschrijf de casus / issue. Zo gedetailleerd mogelijk._
  
        `
      }
      if(this.caseItem.user_role){
        readableText += `Rol Gebruiker: ${this.caseItem.user_role}
        _Beschrijf vanuit welke rol de gebruiker het gesprek aangaat._
  
        ` 

      }
      if(this.caseItem.function){
        readableText += `**Functie:** ${this.caseItem.function}
        _Wat is de functie van de persoon en welke rol vervult deze in relatie tot het probleem?_
  
        `
      }
      if(this.caseItem.vision){
        readableText += `**Visie:** ${this.caseItem.vision}
        _Hoe kijkt deze persoon tegen het issue/de casus aan?_
  
        `
      }
      if(this.caseItem.interests){
        readableText += `**Interesses:** ${this.caseItem.interests}
        _Wat is voor deze persoon belangrijk in relatie tot het probleem? Heeft deze specifieke vragen en/of zorgen?_
  
        `
      }
      if(this.caseItem.communicationStyle){
        readableText += `**Communicatiestijl:** ${this.caseItem.communicationStyle}
        _Hoe ervaar jij de communicatiestijl van deze persoon?_
  
        `
      }
      if(this.caseItem.externalFactors){
        readableText += `**Externe factoren:** ${this.caseItem.externalFactors}
        _Zijn er externe factoren die van invloed zijn op de houding van de persoon?_
  
        `
      }
      if(this.caseItem.history){
        readableText += `**Historie:** ${this.caseItem.history}
        _Zijn er andere onderwerpen waar je deze persoon recent over hebt gesproken? Zo ja, waarover en hoe verliepen deze?_
  
        `
      }
      if(this.caseItem.attitude){
        readableText += `**Houding:** ${this.caseItem.attitude}
        _Hoe is de kwaliteit van jouw relatie met deze persoon?_
  
        `
      }
      if(this.caseItem.steadfastness){
        readableText += `**Standvastigheid:** ${this.caseItem.steadfastness}
        _Hoe standvastig is deze persoon (0% = Vindt alles wat jij vindt, 100% = Zal nooit iets anders vinden)?_
  
        `
      }
  
    return readableText.trim();
  }

  async getPromptOpenAI(input: string) {
    this.promptChecked = false
    try {
      const response = await fetch("https://case-prompt-p2qcpa6ahq-ew.a.run.app", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: this.auth.userInfo.uid,
          content: input,
          instructionType:'case_prompter',
          categoryId: this.caseItem.conversation || this.caseItem.conversationType,
        }),
      });
  
      if (!response.ok) {
        console.error("Request failed:", response.status, response.statusText);
        return;
      }
  
      // Response uitlezen
      const data = await response.json();
      // console.log("Complete response:", data.content); // De volledige tekst in één keer
      return data.content;
    } catch (error) {
      console.error("Error tijdens fetch:", error);
      throw error;
    }
  }

  async rebuildPrompt(){
    if(this.inputEmpty()){
      this.toast.show(this.translate.instant('error_messages.no_input'),3000,'middle')
      return
    }
    this.caseItemOriginal = JSON.parse(JSON.stringify(this.caseItem))
    let text = this.generateReadableText()
    let output = await this.getPromptOpenAI(text)
    this.caseItem.casus = output
    this.promptChecked = true
  }

  errorMessage(item:string){
    if(!item || item === this.translate.instant(item)){
      item = 'error_messages.required'
    }
    this.toast.show(this.translate.instant(item),3000,'middle')
  }

  phaseGoalsFilled(){
    let filled = true
    if(this.caseItem.phaseGoals.length === 0){
      filled = false
    }
    return filled
  }

  showStep(step:number){
    // console.log(step)
    if(this.caseItem.admin){
      console.log('admin conversation')
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
      case 4:
        return this.caseItem.editable_by_user.goals.phases||this.caseItem.editable_by_user.goals.free||this.caseItem.editable_by_user.goals.attitude
      case 5:
        return this.caseItem.editable_by_user.openingMessage
      
      default:
        return false;
    }
  }

  changesMade(){
    let changed = false
    
    if(
      this.caseItem.role !== this.caseItemOriginal.role||
      this.caseItem.description !== this.caseItemOriginal.description||
      this.caseItem.function !== this.caseItemOriginal.function||
      this.caseItem.vision !== this.caseItemOriginal.vision||
      this.caseItem.interests !== this.caseItemOriginal.interests||
      this.caseItem.communicationStyle !== this.caseItemOriginal.communicationStyle||
      this.caseItem.externalFactors !== this.caseItemOriginal.externalFactors||
      this.caseItem.history !== this.caseItemOriginal.history||
      this.caseItem.attitude !== this.caseItemOriginal.attitude||
      this.caseItem.steadfastness !== this.caseItemOriginal.steadfastness
    ){
      changed = true
    }
    return changed
  }
  inputEmpty(){
    let empty = true
    if(
      this.caseItem.role||
      this.caseItem.description||
      this.caseItem.function||
      this.caseItem.vision||
      this.caseItem.interests||
      this.caseItem.communicationStyle||
      this.caseItem.externalFactors||
      this.caseItem.history
    ){
      empty = false
    }
    return empty
  }

  setPhasesStart(){
    if(!this.caseItem.goalsItems.phases){
      this.caseItem.goalsItems.phases = []
    }
    for(let i = 0; i<this.caseItem.conversationInfo.phaseList.length; i++){
      if(!this.caseItem.goalsItems.phases[i]){
        this.caseItem.goalsItems.phases[i] = 0;
      }
    
    }
  }

}
