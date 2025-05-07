import { EventEmitter, Injectable, OnDestroy, OnInit, Output } from '@angular/core';
import { ConnectService } from './connect.service';
import { UserService } from './user.service';
import { LevelsService } from './levels.service';
import { AuthService } from '../auth/auth.service';
import { FirestoreService } from './firestore.service';
import { Subscription } from 'rxjs';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { HeyGenApiService } from './heygen.service';
import { ModalService } from './modal.service';
import { CleanReactionPipe } from '../pipes/clean-reaction.pipe';
import { RecordService } from './record.service';
import { HelpersService } from './helpers.service';
import { InfoService } from './info.service';
import { jsPDF } from "jspdf";
import { ToastService } from './toast.service';
import { tutorialService } from './tutorial.service';
import { MediaService } from './media.service';
import { TranslateService } from '@ngx-translate/core';


@Injectable({
  providedIn: 'root'
})
export class ConversationService implements OnDestroy {
  @Output() update: EventEmitter<boolean> = new EventEmitter();
  @Output() updateAchievements: EventEmitter<boolean> = new EventEmitter();
  @Output() activeStream: EventEmitter<boolean> = new EventEmitter();
  @Output() activateVideoScreen: EventEmitter<boolean> = new EventEmitter();
  attitude:number = 0
  tempText:string = ''
  tempTextUser:string = ''
  attitudeSet:boolean = false
  messageTemp:any = {'role':'assistant','content':''}
  messages:any = []
  message:string = ''
  dialog_role:string = ''
  activeConversation:any = {};
  waiting = false;
  caseItem:any = {}
  extraTemp:any = {}
  loadReady:boolean = false;
  closing:boolean = false;

  allLoaded:boolean = false;

  private conversationSub!: Subscription;
  private subCollectionSubs: Subscription[] = [];
  private subCollections = ['messages', 'feedback', 'facts','choices','loading','phases','close','tokens','goals','background','skills'];

  constructor(
    public levels:LevelsService,
    private auth:AuthService,
    private firestoreService:FirestoreService,
    private firestore: AngularFirestore,
    public heyGen:HeyGenApiService,
    private modalService:ModalService,
    private cleanReactionPipe:CleanReactionPipe,
    private record:RecordService,
    public helper:HelpersService,
    private infoService:InfoService,
    private toast:ToastService,
    private tutorial: tutorialService,
    private media:MediaService,
    private translate:TranslateService

  ) { 
    this.heyGen.active.subscribe((active:boolean)=>{
      this.activeStream.emit(active)
    })
  }

  async startConversation(caseItem:any){
    console.log(caseItem)
    this.caseItem = caseItem
    this.caseItem.conversationType = caseItem.conversation
    // userId, conversationId, categoryId, caseId, instructionType, attitude
    this.dialog_role = caseItem.role;
    this.waiting = true;
    let conversationId = ''
    let openingMessage = caseItem.openingMessage || ''
    this.tempTextUser = openingMessage
    let steadFastness = caseItem.steadFastness || 0
    let agentsSettings = caseItem.editable_by_user?.agents || {
      choices:true,
      facts:true,
      background:true,
      undo:true,
    }
    let conversationObj:any = {
      caseId:caseItem.id,
      timestamp: new Date().getTime(),
      title:caseItem.title,
      role:caseItem.role,
      attitude:caseItem.attitude,
      conversationType:caseItem.conversation,
      openingMessage:openingMessage,
      steadFastness:steadFastness,
      goalsItems:caseItem.goalsItems,
      max_time:caseItem.max_time,
      minimum_goals:caseItem.minimum_goals,
      avatarName:caseItem.avatarName,
      photo:caseItem.photo,
      video_on:caseItem.avatarName?true:false,
      agentsSettings:agentsSettings,
      free_question:caseItem.free_question || '',
      free_answer:caseItem.free_answer || '',
    }
    if(caseItem.trainerId){
      conversationObj.trainerId = caseItem.trainerId
    }
    if(caseItem.trainingId){
      conversationObj.trainingId = caseItem.trainingId
    }

    await this.firestoreService.createSub('users', this.auth.userInfo.uid, 'conversations',conversationObj,async (response:any)=>{
      conversationId = response.id
      let tempCaseItem = JSON.parse(JSON.stringify(caseItem))
      for(let key in tempCaseItem){
        if(tempCaseItem[key]==null || tempCaseItem[key]==undefined){
          delete tempCaseItem[key]
        }
      }
      await this.firestoreService.set(`users/${this.auth.userInfo.uid}/conversations/${conversationId}/caseItem`,'caseItem', tempCaseItem)
      localStorage.setItem('conversation',JSON.stringify({conversationId, ...caseItem}))
      this.loadConversation(conversationId)
      setTimeout(() => {
        console.log('trigger tutorial')
        if(this.media.smallDevice){
        this.tutorial.triggerTutorial('conversation','onload_mobile')
        }
        else{
          this.tutorial.triggerTutorial('conversation','onload')
        }
      }, 1000);
    })

    // let obj:any = {
    //   userId:this.auth.userInfo.uid,
    //   conversationId:conversationId,
    //   categoryId:caseItem.conversation,
    //   caseId:caseItem.id,
    //   instructionType:'reaction',
    //   attitude:this.caseItem.attitude,
    //   openingMessage:openingMessage,
    //   steadFastness:steadFastness
    // }
    // this.startLoading('reaction')
    // this.startLoading('facts')
    // this.getExtraInfo('facts',conversationId)
    // this.openai_chat(obj)

  }

  async loadConversation(conversationId: string,caseItem?:any,continuing?:boolean): Promise<void> {
    // console.log(`users/${this.auth.userInfo.uid}/conversations/${conversationId}`)
    

    this.conversationSub = await this.firestore
      .doc(`users/${this.auth.userInfo.uid}/conversations/${conversationId}`)
      .valueChanges({ idField: 'conversationId' })
      .subscribe((conversation:any) => {
        // console.log(conversation)
        this.activeConversation = { ...conversation };
        setTimeout(() => {
          console.log(this.activeConversation)
        }, 2000);
          // console.log(this.attitude)
          if(this.activeConversation.attitude!=undefined && this.activeConversation.attitude!=this.attitude){
            this.attitude = this.activeConversation.attitude
            this.update.emit(true);
          }
          if(!this.activeConversation.rating){
            this.activeConversation.rating = {}
          }
        this.loadSubCollections(conversationId);
      })
    if(caseItem){
      this.caseItem = caseItem
      this.dialog_role = caseItem.role;
    }
    console.log(this.caseItem)
    let avatarName = this.activeConversation.avatarName || this.caseItem.avatarName

    let video_on = this.activeConversation.video_on
    if(video_on===undefined){
      video_on = this.caseItem.video_on
    }
    if(video_on===undefined){
      video_on = this.caseItem.avatarName?true:false
    }
    this.update.emit(true);
    if(avatarName&&video_on&&!this.activeConversation.closed){
      this.activateVideoScreen.emit(true)
      
      this.loadReady = true;
      this.heyGen.initializeAvatar(avatarName,'avatar_video',()=>{
        if(this.latestAssistantItem(this.activeConversation.messages) && !this.isLoading('reaction')){
          // console.log('speak')
          this.heyGen.speakText(this.cleanReactionPipe.transform(this.latestAssistantItem(this.activeConversation.messages)));
        }
      })
    }
    else{
      this.loadReady = true;
    }
    if(!continuing){
      let checkInt = setInterval(() => {
        if(this.activeConversation?.role){
          clearInterval(checkInt)
          this.startLoading('reaction')
          // this.startLoading('facts')
          // this.getExtraInfo('facts',conversationId)
          let obj:any = {
            userId:this.auth.userInfo.uid,
            userEmail:this.auth.userInfo.email,
            training:{
              trainerId: this.activeConversation.trainer_id,
              trainingId: this.activeConversation.trainingId,
            },
            conversationId:conversationId,
            categoryId:this.caseItem.conversation,
            caseId:this.caseItem.id,
            instructionType:'reaction',
            attitude:this.caseItem.attitude,
            openingMessage:this.caseItem.openingMessage,
            steadFastness:this.caseItem.steadFastness
          }
          if(this.caseItem.trainerId){
            obj.trainerId = this.caseItem.trainerId
          }
          this.openai_chat(obj)
        }
      },100);
    }

  }

  restartAvatar(){
    if(!this.activeConversation.closed){
      this.heyGen.disconnect('avatar_video')
      this.heyGen.initializeAvatar(this.caseItem.avatarName,'avatar_video',()=>{
        this.loadReady = true;
      })
    }
  }

  loadSubCollections(conversationId: string): void {
    // Unsubscribe oude listeners
    this.subCollectionSubs.forEach((sub) => sub.unsubscribe());
    this.subCollectionSubs = [];

    this.subCollections.forEach((collectionName) => {
      try {
        const subCollectionSub = this.firestore
          .collection(`users/${this.auth.userInfo.uid}/conversations/${conversationId}/${collectionName}`)
          .valueChanges({ idField: 'id' })
          .subscribe(
            (subCollectionData:any) => {
              this.activeConversation = {
                ...this.activeConversation,
                [collectionName]: subCollectionData,
              };
              if(collectionName == 'messages'){
                this.scrollChatToBottom()
                this.reloadAttitude()
              }
              if(collectionName == 'loading'){
                let allLoaded = true
                for(let i=0;i<subCollectionData.length;i++){
                  if(subCollectionData[i].loading){
                    allLoaded = false
                  }
                }
                if(allLoaded&&subCollectionData.length>=5){
                  this.allLoaded = true;
                  this.checkGoal('free')
                }
                this.checkAllBasicGoals()
              }
             // sorteer de messages op timestamp
                this.activeConversation[collectionName] = this.activeConversation[collectionName].sort((a:any, b:any) => a.timestamp - b.timestamp);
            },
            (error) => {
              console.warn(`Subcollectie '${collectionName}' kon niet worden geladen:`, error);
            }
          );

        this.subCollectionSubs.push(subCollectionSub);
      } catch (error) {
        console.warn(`Fout bij het verwerken van subcollectie '${collectionName}':`, error);
      }
    });
    if(!this.caseItem.avatarName){
      this.loadReady = true;
    }
  }



  ngOnDestroy(): void {
    // Unsubscribe alle listeners
    if (this.conversationSub) {
      this.conversationSub.unsubscribe();
    }
    this.subCollectionSubs.forEach((sub) => sub.unsubscribe());
  }

  cleanTempText(){
    let temp = this.tempText.split(', reaction:')
    if(temp.length>1){
      this.messageTemp.content = this.clearStringChars(temp[1] + this.messageTemp.content)
    }
  }

  setAttitude(){
    console.log('setAttitude:',this.tempText)
    this.attitudeSet = true
    let attitudeString = ''
    if(this.tempText.includes('reaction:')){
      attitudeString = this.tempText.replace('newAttitude:','').split(', reaction:')[0]
      
      this.attitude = parseInt(this.clearStringNumbers(attitudeString))
      this.update.emit(true);
    }
  }

  clearStringNumbers(input: string) {
    return input.split('{').join('').split('}').join('')
  }
  clearStringChars(input: string) {
    return input.split('{').join('').split('}').join('')
  }

  reloadAttitude(){
    let attitudeString = ''
    if(this.latestAssistantItem(this.activeConversation.messages).includes('newAttitude:')){
      attitudeString = this.latestAssistantItem(this.activeConversation.messages).replace('newAttitude:','').split(', reaction:')[0]
      this.attitude = parseInt(this.clearStringNumbers(attitudeString))
      this.update.emit(true);
    }
  }

  

 


  async openai_chat(obj:any) {
    // console.log(obj)
    this.messages.push({role:'user',content:this.message})
    this.attitude = obj.attitude
    obj.language = this.translate.currentLang
    obj.training = {
      trainerId: this.activeConversation.trainer_id,
      trainingId: this.activeConversation.trainingId,
    }
    console.log(obj)
    this.update.emit(true);
    // setTimeout(() => {
    //   this.tempTextUser = ""
    // }, 10000);
    // const response = await fetch("https://chatai-p2qcpa6ahq-ew.a.run.app", {
    const response = await fetch("https://chatgemini-p2qcpa6ahq-ew.a.run.app", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(obj),
    });
    this.message = ''
    if (!response.ok) {
      console.error("Request failed:", response.status, response.statusText);
      return;
    }
    if (!response.body) {
      throw new Error("Response body is null");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let done = false;

    let buffer = ''; // Buffer om incomplete zinnen op te slaan

    while (!done) {
      this.tempTextUser = ""
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (value) {
        const chunk = decoder.decode(value);

        // Als de tempText nog steeds ", reaction:" niet bevat, voeg de chunk toe
        if (!this.tempText.includes(', reaction:')) {
          this.tempText += chunk;

          // Controleer of we nu de volledige reactie hebben ontvangen
          if (this.tempText.includes(', reaction:')) {
            this.cleanTempText(); // Verwerk het deel tot aan ", reaction:"
            this.setAttitude();   // Stel attitude in of voer andere acties uit
          }
        } else {
          // We zijn voorbij het ", reaction:"-deel en verwerken de rest
          buffer += chunk; // Voeg de chunk toe aan de buffer

          // Zoek naar het laatste leesteken (einde van een zin)
          let lastSentenceEndIndex = -1;
          ['.', '!', '?'].forEach(punctuation => {
            const index = buffer.lastIndexOf(punctuation);
            if (index > lastSentenceEndIndex) {
              lastSentenceEndIndex = index;
            }
          });

          // Als er een volledige zin is, stuur die door
          if (lastSentenceEndIndex !== -1) {
            const completeSentence = buffer.slice(0, lastSentenceEndIndex + 1); // Volledige zin
            buffer = buffer.slice(lastSentenceEndIndex + 1); // Rest in buffer laten

            // Stuur de zin door naar HeyGen
            if (this.heyGen.streamingAvatar) {
              this.heyGen.speakText(completeSentence); // Avatar spreekt volledige zin uit
            }

            // Voeg de zin toe aan de UI of interne opslag
            this.messageTemp.content += completeSentence;
            this.scrollChatToBottom();
          }
        }
      }
    }

    // while (!done) {
    //   const { value, done: readerDone } = await reader.read();
    //   done = readerDone;
    
    //   if (value) {
    //     const chunk = decoder.decode(value);
        
    //     // Stap 1: Controleer of we al voorbij ", reaction:" zijn
    //     if (!this.tempText.includes(', reaction:')) {
    //       this.tempText += chunk;
    
    //       if (this.tempText.includes(', reaction:')) {
    //         this.cleanTempText();
    //         this.setAttitude();
    //       }
    //     } else {
    //       // Stap 2: We verwerken de zinnen in de buffer
    //       buffer += chunk;
    
    //       // Zoek naar volledige zinnen met regex
    //       const sentenceRegex = /[^.!?]+[.!?]/g;  // Herkent volledige zinnen
    //       let match;
    //       let sentences = [];
    
    //       while ((match = sentenceRegex.exec(buffer)) !== null) {
    //         sentences.push(match[0]); // Voeg volledige zin toe
    //       }
    
    //       // Verwijder de verwerkte zinnen uit de buffer
    //       if (sentences.length > 0) {
    //         buffer = buffer.slice(sentenceRegex.lastIndex);
    //       }
    
    //       // Stap 3: Stuur de zinnen in volgorde naar HeyGen
    //       for (let sentence of sentences) {
    //         if (this.heyGen.streamingAvatar) {
    //           this.heyGen.speakText(sentence.trim()); // Avatar spreekt uit
    //         }
    //         this.messageTemp.content += sentence.trim();
    //         this.scrollChatToBottom();
    //       }
    //     }
    //   }
    // }
    this.waiting = false;
    // this.messages.push({'role':'assistant','content':this.messageTemp.content})
    this.messageTemp = {'role':'assistant','content':''}
    this.tempText = ''
    // this.tempTextUser = ''
    this.attitudeSet = false
    // this.getExtraInfo('choices')
    this.getExtraInfo('phases')
    this.getExtraInfo('feedback')
  }


  addMessage(message:string){
    if(!message){
      return;
    }
    // this.getExtraInfo('facts')

    this.message = message;
    this.waiting = true;

    let obj:any = {
      userId:this.auth.userInfo.uid,
      userEmail:this.auth.userInfo.email,
      conversationId:this.activeConversation.conversationId,
      categoryId:this.caseItem.conversation || this.activeConversation.conversationType,
      caseId:this.activeConversation.caseId,
      instructionType:'reaction',
      attitude:this.attitude,
      prompt:message
    }
    // console.log(obj)
    this.tempTextUser = message
    console.log(this.tempTextUser)
    this.scrollChatToBottom()
    this.startLoading('reaction')
    // this.startLoading('choices')
    this.startLoading('feedback')
    this.openai_chat(obj)
  }


  getExtraInfo(topic:string,conversationId?:string){
    if(this.activeConversation.conversationId){
      conversationId = this.activeConversation.conversationId
    }
    let obj:any = {
      userId:this.auth.userInfo.uid,
      userEmail:this.auth.userInfo.email,
      conversationId:conversationId,
      instructionType:topic,
      role:this.dialog_role,
      categoryId:this.caseItem.conversation || this.activeConversation.conversationType,
    }
    // console.log(obj)
    this.startLoading(topic)
    this.openai_extra_save(obj)
  }

  async openai_extra_save(obj:any) {
    let url = ''
    // let url = 'https://conversationAIDirect-p2qcpa6ahq-ew.a.run.app'
    if(obj.instructionType == 'facts'){
      // url = 'https://factsai-p2qcpa6ahq-ew.a.run.app'
      url = 'https://factsGemini-p2qcpa6ahq-ew.a.run.app'
    }
    else if(obj.instructionType == 'phases'){
      // url = 'https://phasesai-p2qcpa6ahq-ew.a.run.app'
      url = 'https://phasesgemini-p2qcpa6ahq-ew.a.run.app'
    }
    else if(obj.instructionType == 'feedback'){
      // url = 'https://feedbackai-p2qcpa6ahq-ew.a.run.app'
      url = 'https://feedbackgemini-p2qcpa6ahq-ew.a.run.app'
    }
    else if(obj.instructionType == 'choices'){
      // url = 'https://choicesai-p2qcpa6ahq-ew.a.run.app'
      url = 'https://choicesgemini-p2qcpa6ahq-ew.a.run.app'
    }
    else if(obj.instructionType == 'goals'){
      // url = 'https://goalai-p2qcpa6ahq-ew.a.run.app'
      url = 'https://goalgemini-p2qcpa6ahq-ew.a.run.app'
    }
    else if(obj.instructionType == 'background'){
      // url = 'https://backgroundai-p2qcpa6ahq-ew.a.run.app'
      url = 'https://backgroundgemini-p2qcpa6ahq-ew.a.run.app'
    }
    if(!url){
      console.error('No url found')
      return;
    }
    obj.language = this.translate.currentLang
    obj.training = {
      trainerId: this.activeConversation.trainer_id,
      trainingId: this.activeConversation.trainingId,
    }
    console.log(obj)
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(obj),
    });
    if (!response.ok) {
      console.error("Request failed:", response.status, response.statusText);
      return;
    }
    // console.log(response)
    this.update.emit(true);
    // console.log(this.extraTemp[obj.instructionType][extraTempIndex])
  }

  // async openai_extra(obj:any) {
  //   console.log(obj)
  //   const response = await fetch("https://conversationAI-p2qcpa6ahq-ew.a.run.app", {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify(obj),
  //   });
  //   if (!response.ok) {
  //     console.error("Request failed:", response.status, response.statusText);
  //     return;
  //   }
  //   if (!response.body) {
  //     throw new Error("Response body is null");
  //   }
  //   let extraTempIndex = 0
  //   if(!this.extraTemp[obj.instructionType]){
  //     this.extraTemp[obj.instructionType] = []
  //   }
  //   else{
  //     extraTempIndex = this.extraTemp[obj.instructionType].length
  //   }
  //   this.extraTemp[obj.instructionType][extraTempIndex] = ''

  //   const reader = response.body.getReader();
  //   const decoder = new TextDecoder("utf-8");
  //   let done = false;
  
  //   while (!done) {
  //     const { value, done: readerDone } = await reader.read();
  //     done = readerDone;
  
  //     if (value) {
  //       const chunk = decoder.decode(value);
  //       this.extraTemp[obj.instructionType][extraTempIndex] =  this.extraTemp[obj.instructionType][extraTempIndex] + chunk
  //     }
  //   }
  //   console.log("Stream complete");
  //   setTimeout(() => {
  //     console.log(this.activeConversation)
  //     console.log(this.latestAssistantItem(this.activeConversation.choices))
  //     console.log(this.parseChoicesToJSON(this.latestAssistantItem(this.activeConversation.choices)))
  //   }, 1000);
  //   // console.log(this.extraTemp[obj.instructionType][extraTempIndex])
  // }

  parseChoicesToJSON(input: string, length?: number): { choice: string; description: string }[] {
    if (!input) {
        return [];
    }
    try {
      return JSON.parse(input);
      // console.log(input)
      //   const choices: { choice: string; description: string }[] = [];
      //   // Match each Choice block using a regular expression
      //   const choiceRegex = /{Choice \d+:.*?\[(.*?)\]\[(.*?)\]}/gs;
      //   let match;

      //   while ((match = choiceRegex.exec(input)) !== null) {
      //       const choice = match[1].trim().replace(/^"/, '').replace(/"$/, '');
      //       const description = match[2].trim().replace(/^"/, '').replace(/"$/, '');
      //       console.log(choice,description)
      //       choices.push({ choice, description });
      //   }

      //   // Respect the length condition
      //   if (length && choices.length >= length) {
      //       return choices;
      //   }
      //   return choices; // Always return an array
    } catch (error) {
        console.error('Error parsing Choices:', error);
        return [];
    }
  }





  latestAssistantItem(messages:any){
    if(!messages||messages.length<1){
      return '';
    }
    let newMessages = messages.filter((message:any) => message.role === 'assistant');
    messages = messages.sort((a:any, b:any) => a.timestamp - b.timestamp);

    if(newMessages.length>0){
      return newMessages[newMessages.length-1].content;
    }
    return '';
  }

  latestUserItem(messages:any){
    if(!messages||messages.length<1){
      return '';
    }
    let newMessages = messages.filter((message:any) => message.role === 'user');
    messages = messages.sort((a:any, b:any) => a.timestamp - b.timestamp);

    if(newMessages.length>0){
      return newMessages[newMessages.length-1].content;
    }
    return '';
  }

  startLoading(topic:string){
    this.firestoreService.setSubSub('users', this.auth.userInfo.uid, 'conversations', this.activeConversation.conversationId, 'loading', topic, {loading:true})
  }

  isLoading(topic:string){
    if(this.activeConversation.loading){
      for(let i=0;i<this.activeConversation.loading.length;i++){
        if(this.activeConversation.loading[i].loading && this.activeConversation.loading[i].id == topic){
          return true
        }
      }
    }
    return false
  }

  scrollChatToBottom() {
    let chatDiv:any
    setTimeout(() => {
      chatDiv = document.getElementById('innerChatDiv');
      if (chatDiv) {
          chatDiv.scrollTop = chatDiv.scrollHeight;
      }
    }, 50);
  }

  avarageCipher(){
    let total = 0;
    let count = 0;
    if(!this.activeConversation.feedback||this.activeConversation.feedback.length<1){
      return 0;
    }
    for(let i=0;i<this.activeConversation.feedback.length;i++){
      // console.log(this.activeConversation.feedback[i])
      if(this.activeConversation.feedback[i].role === 'assistant'){
        count++;
        let feedback = JSON.parse(this.activeConversation.feedback[i].content)
        total += feedback.feedbackCipher;
      }
    }
    if(count<1){
      return 0;
    }
    return Math.round((total/count)*10) / 10;
  }

  getAttitude(index:number){
    // console.log(index)
    if(!this.activeConversation.messages||this.activeConversation.messages.length<1){
      return 0;
    }
    let messages = JSON.parse(JSON.stringify(this.activeConversation.messages))
    let assistantMessage = messages[index].content
    // console.log(index,messages,assistantMessage)
    let attitude = 0
    let attitudeString = ''
    if(assistantMessage.includes('reaction:')){
      attitudeString = assistantMessage.replace('newAttitude:','').split(', reaction:')[0]
      attitude = parseInt(this.clearStringNumbers(attitudeString))
    }
    return attitude;
  }

  getFeedbackChat(index:number,type:string){
    let messages = JSON.parse(JSON.stringify(this.activeConversation.messages))
    let userMessages = []
    for(let i=0;i<messages.length;i++){
      if(messages[i].role == 'user'){
        messages[i].index = i
        userMessages.push(messages[i])
      }
    }
    let newIndex = -1
    for(let i=0;i<userMessages.length;i++){
      if(userMessages[i].index == index){
        newIndex = i
      }
    }

    if(newIndex<0 || !this.activeConversation.feedback || this.activeConversation.feedback.length<1 || !this.activeConversation.feedback[newIndex]){
      return '';
    }
    let feedback:any = {}
    if(this.activeConversation.feedback[newIndex].content.substring(0,1) != '{'){
      // let feedback:any = {}
      feedback= this.activeConversation.feedback[newIndex].content.split('```json').join('').split('```').join('')
    }
    else{
      feedback = JSON.parse(this.activeConversation.feedback[newIndex].content)
    } 
    if(typeof feedback =='string'){
      feedback = JSON.parse(feedback)
    }
    
    if(type=='id'){
      return this.activeConversation.feedback[newIndex].id
    }
    return feedback[type];
  }


  getFeedbackChat2(index:number,type:string){
    let messages = JSON.parse(JSON.stringify(this.activeConversation.messages))
    let userMessages = []
    for(let i=0;i<messages.length;i++){
      if(messages[i].role == 'user'){
        messages[i].index = i
        userMessages.push(messages[i])
      }
    }
    console.log(userMessages)
    let newIndex = -1
    for(let i=0;i<userMessages.length;i++){
      if(userMessages[i].index == index){
        newIndex = i
      }
    }
    if(newIndex<0 || !this.activeConversation.feedback || this.activeConversation.feedback.length<1 || !this.activeConversation.feedback[newIndex]){
      return '';
    }
    let feedback = JSON.parse(this.activeConversation.feedback[newIndex].content)
    return feedback[type];
  }

  undoLastMove(){
    this.modalService.showConfirmation('Weet je zeker dat je de laatste zet ongedaan wilt maken?').then((response:any)=>{
      if(response){
        this.deleteLastMoves('messages',2)
        this.deleteLastMoves('feedback',1)
        this.deleteLastMoves('phases',1)
        this.deleteLastMoves('choices',2)
      }
    })
  }

  deleteLastMoves(topic:string,amount:number){
    let count = 0;
    let items = this.activeConversation[topic]
    let length = items.length
    for(let i=1;i<=amount;i++){
      this.firestoreService.deleteSubSub('users', this.auth.userInfo.uid, 'conversations', this.activeConversation.conversationId, topic, items[length-i].id)
    }
  }

  async closeConversation(callback:Function) {
    this.startLoading('close')
    this.startLoading('skills')
    // console.log(obj)

    let objSkills:any = {
      conversationId:this.activeConversation.conversationId,
      userId:this.auth.userInfo.uid,
      userEmail:this.auth.userInfo.email,
      training:{
        trainerId: this.activeConversation.trainer_id,
        trainingId: this.activeConversation.trainingId,
      },
      instructionType:'skills',
      categoryId:this.caseItem.conversation || this.activeConversation.conversationType,
    }
    const responseSkills = fetch("https://skillsgemini-p2qcpa6ahq-ew.a.run.app", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(objSkills),
    });

    let obj:any = {
      conversationId:this.activeConversation.conversationId,
      userId:this.auth.userInfo.uid,
      userEmail:this.auth.userInfo.email,
      training:{
        trainerId: this.activeConversation.trainer_id,
        trainingId: this.activeConversation.trainingId,
      },
      instructionType:'close',
      categoryId:this.caseItem.conversation || this.activeConversation.conversationType,
    }
    const response = await fetch("https://closinggemini-p2qcpa6ahq-ew.a.run.app", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(obj),
    });


    
    
    // if (!response.ok) {
    //   console.error("Request failed:", response.status, response.statusText);
    //   return;
    // }
    // if (!response.body) {
    //   throw new Error("Response body is null");
    // }

    callback()
    
  }

  get usedTokens(){
    let usage:any = {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    }

    if(this.activeConversation.tokens){
      for(let i=0;i<this.activeConversation.tokens.length;i++){
          usage.prompt_tokens += this.activeConversation.tokens[i].usage.prompt_tokens
          usage.completion_tokens += this.activeConversation.tokens[i].usage.completion_tokens
          usage.total_tokens += this.activeConversation.tokens[i].usage.total_tokens
      }
    }
    return usage;
  }

  checkAllBasicGoals(){
    this.checkGoal('attitude')
    this.checkGoal('phases')
    this.checkGoal('freeTest')
  }

  completedGoal:any = {}
  async checkGoal(type:string){
    return;


    if(type=='attitude'&&this.activeConversation?.goalsItems&&this.activeConversation.goalsItems[type]){
      if(this.activeConversation.goalsItems[type]<=this.attitude){
        if(!this.activeConversation.accomplishments){
          this.activeConversation.accomplishments = []
          this.activeConversation.accomplishmentList = []
        }
        if(!this.activeConversation.accomplishments.includes('attitude')){
          this.completedGoal = {goal:'attitude',explanation:'Je hebt de gewenste houding bereikt.'}

          this.record.playSound('achievement')
          this.updateAchievements.emit(true)
        }
      }
    }
    //(conversation.activeConversation?.phases | lastestAssistantItem | parseJSON)?.element_levels
    else if(type=='phases'&&this.activeConversation?.goalsItems&&this.activeConversation.goalsItems[type]&&this.latestAssistantItem(this.activeConversation.phases)){
      let elementLevels = JSON.parse(this.latestAssistantItem(this.activeConversation.phases)).element_levels
      let goals = this.activeConversation.goalsItems[type]
      let count = 0
      for(let i=0;i<elementLevels.length;i++){
        if(elementLevels[i].score>=goals[i]){
          count++
        }
      }
      if(count==elementLevels.length){
        if(!this.activeConversation.accomplishments){
          this.activeConversation.accomplishments = []
          this.activeConversation.accomplishmentList = []
        }
        if(!this.activeConversation.accomplishments.includes('phases')){
          this.completedGoal = {goal:'phases',explanation:'Je hebt alle fases van het gesprek naar het gewenste niveau gebracht.'}

          this.record.playSound('achievement')
          this.updateAchievements.emit(true)


          // this.updateAchievements.emit(true)
          // this.activeConversation.accomplishments.push('phases')

          // let accomplishmentList = JSON.parse(JSON.stringify(this.activeConversation.accomplishmentList))


          // accomplishmentList.push({goal:'phases',explanation:'Je hebt alle fases van het gesprek naar het gewenste niveau gebracht.'})

          // this.firestoreService.updateSub('users', this.auth.userInfo.uid, 'conversations', this.activeConversation.conversationId, {accomplishments:this.activeConversation.accomplishments,accomplishmentList:accomplishmentList})
          // console.log('phases goal accomplished')
        }
      }
    }

    else if(type=='free'&&this.activeConversation?.goalsItems&&this.activeConversation?.goalsItems[type]){
      // console.log('free goal tested')
      // console.log(this.activeConversation.goals)
      if(this.activeConversation.messages?.length>4 && this.activeConversation.goals?.length<this.activeConversation.feedback?.length){
        if(!this.isLoading('goals')){
          this.startLoading('goals')
          let obj:any = {
            userId:this.auth.userInfo.uid,
            userEmail:this.auth.userInfo.email,
            training:{
              trainerId: this.activeConversation.trainer_id,
              trainingId: this.activeConversation.trainingId,
            },
            conversationId:this.activeConversation.conversationId,
            categoryId:this.caseItem.conversation || this.activeConversation.conversationType,
            caseId:this.activeConversation.caseId,
            instructionType:'goals',
          }
          this.openai_extra_save(obj)
        }
      }
    }

    else if(type=='freeTest'&&this.activeConversation?.goalsItems?.free && !this.activeConversation?.accomplishments?.includes('free')){


      if(this.latestAssistantItem(this.activeConversation.goals) && this.latestAssistantItem(this.activeConversation.goals) && JSON.parse(this.latestAssistantItem(this.activeConversation.goals))?.goal_achieved){
        console.log('free goal achieved')
        if(!this.activeConversation.accomplishments){
          this.activeConversation.accomplishments = []
          this.activeConversation.accomplishmentList = []
        }
        if(!this.activeConversation.accomplishments.includes('free')){
          this.completedGoal = {goal:'free',explanation:this.latestAssistantItem(this.activeConversation.goals).explanation}
          this.updateAchievements.emit(true)
          this.activeConversation.accomplishments.push('free')
          this.activeConversation.accomplishmentList.push({goal:'free',explanation:this.latestAssistantItem(this.activeConversation.goals).explanation})
          this.firestoreService.updateSub('users', this.auth.userInfo.uid, 'conversations', this.activeConversation.conversationId, {accomplishments:this.activeConversation.accomplishments,accomplishmentList:this.activeConversation.accomplishmentList})
          console.log('free goal accomplished')
        }
      }
      
      
    }
  }


  // onRatingChanged(rating: number,field:string): void {
  //   if(!this.activeConversation.rating){
  //     this.activeConversation.rating = {}
  //   }
  //   this.activeConversation.rating[field] = rating;
  //   this.firestoreService.updateSub('users', this.auth.userInfo.uid, 'conversations', this.activeConversation.conversationId, {rating:this.activeConversation.rating})
  // }

  // saveRating(step:number){
  //   if(!this.activeConversation.rating){
  //     this.activeConversation.rating = {}
  //   }
  //   this.activeConversation.rating['step'+step+'Filled'] = true;
  //   this.firestoreService.updateSub('users', this.auth.userInfo.uid, 'conversations', this.activeConversation.conversationId, {rating:this.activeConversation.rating})
  // }

  printDoc:any = {}

  async export2Pdf(){
    console.log(this.activeConversation)
    this.toast.showLoader(this.translate.instant('conversation.pdf.creating'))

    let doc:any = {
      title: this.activeConversation.title,
      user: this.auth.userInfo.displayName,
      messages: JSON.parse(JSON.stringify(this.activeConversation.messages)),
      goal:'',
      close:'',
      date: this.helper.showLocalDate(this.activeConversation.timestamp,'',0,true),
      photo: this.activeConversation.photo,

    }
    doc.messages.splice(0,1)
    if(this.activeConversation.close?.length>0){
      doc.close = this.activeConversation.close[0].content
    }
    for(let i=0;i<doc.messages.length;i++){
      if(doc.messages[i].role == 'user'){
        doc.messages[i].role = this.auth.userInfo.displayName
        doc.messages[i].feedbackCipher = this.getFeedbackChat(i+1,'feedbackCipher')
        doc.messages[i].feedback = this.getFeedbackChat(i+1,'feedback')
      }
      else if(doc.messages[i].role == 'assistant'){
        doc.messages[i].role = 'Gesprekspartner'
        doc.messages[i].attitude = this.infoService.getAttitude(this.getAttitude(i+1)).title
        doc.messages[i].content = this.cleanReactionPipe.transform(doc.messages[i].content)
      }
    } 

    if(this.activeConversation?.goalsItems?.free){
      doc.goal = this.activeConversation.goalsItems.free
    }



    this.printDoc = doc
    console.log(doc)

    let countPages = 1


    let pdf = new jsPDF('p', 'pt', 'a4');

    let pageHeight = pdf.internal.pageSize.height;
    let pageWidth = pdf.internal.pageSize.width;
    let margin = 72;
    let y = margin;
    let x = margin;
    pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
    
    pdf.addImage('./assets/img/logo_full_black.png', 'PNG', x+35, y, 136*2.5, 30*2.5);
    y += 150;

    pdf.setFontSize(24);
    pdf.text(doc.title, x, y);
    y += 30;

    pdf.setFontSize(20);
    pdf.text(this.translate.instant('conversation.pdf.title_name') + ' ' + doc.user, x, y);
    y += 30;
    pdf.setFontSize(12);
    pdf.text(doc.date, x, y);

    if(doc.goal){
      y += 50;
      pdf.setFontSize(14);
      pdf.text('Doel:', x, y);
      y += 20;
      pdf.setFontSize(12);
      //doc.goal moet passen in de breedte van de pagina
      let textLines = pdf.splitTextToSize(doc.goal, pageWidth - margin * 2);
      pdf.text(textLines, x, y);
    }




    pdf.addPage();
    pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
    pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
    countPages++;
    y = 72;
    pdf.setFontSize(20);
    pdf.text(this.translate.instant('conversation.pdf.conversation')+':', x, y);
    y += 30;
    pdf.setFontSize(12);
    for (let i = 0; i < doc.messages.length; i++) {
      if (y > pageHeight - margin) {
        pdf.addPage();
        pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
        pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
        countPages++;
        y = margin;
      }

      if (doc.messages[i].role === 'Gesprekspartner') {
        pdf.setFontSize(12);

        let text = doc.messages[i].content;
        let textLines = pdf.splitTextToSize(text, (pageWidth - margin * 2) * 0.75);
        let lineHeight = pdf.getLineHeight();
        let textSpace = lineHeight * textLines.length;

        if (textSpace > pageHeight - y - margin) {
          pdf.addPage();
          pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
          pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);

          countPages++;
          y = margin;
        }

        // Tekst met zwarte border en border-radius
        pdf.setDrawColor(32,66,137);
        pdf.setLineWidth(1);
        let boxWidth = (pageWidth - margin * 2) * 0.75;
        let boxHeight = textSpace + 5;
        pdf.roundedRect(x, y, boxWidth+10, boxHeight, 8, 8, 'S');
        pdf.setTextColor(32,66,137);
        pdf.text(textLines, x + 5, y + 15);
        y += boxHeight + 20;

        pdf.setFontSize(12);
        // pdf.setTextColor(0);
        pdf.setFont('Helvetica','bold')
        pdf.text('Attitude:', x, y);
        pdf.setFont('Helvetica','')
        let attitudeLines = pdf.splitTextToSize(doc.messages[i].attitude, (pageWidth - margin * 2) * 0.75);
        pdf.text(attitudeLines, x + 50, y);
        y += pdf.getLineHeight() * attitudeLines.length + 10;

      } else if (doc.messages[i].role === this.auth.userInfo.displayName) {
        pdf.setFontSize(12);

        let text = doc.messages[i].content;
        let textLines = pdf.splitTextToSize(text, (pageWidth - margin * 2) * 0.75);
        let lineHeight = pdf.getLineHeight();
        let textSpace = lineHeight * textLines.length;

        if (textSpace > pageHeight - y - margin) {
          pdf.addPage();
          pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
          pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
          countPages++;
          y = margin;
        }

        // Tekst met zwarte border, border-radius en lichtgroene achtergrond
        pdf.setDrawColor(32,66,137);
        pdf.setLineWidth(1);
        pdf.setFillColor(116, 150, 223)
        // pdf.setFillColor(204, 255, 204); // Lichtgroene achtergrond
        let boxWidth = (pageWidth - margin * 2) * 0.75;
        let boxHeight = textSpace + 10;
        let boxX = pageWidth - margin - boxWidth;
        pdf.roundedRect(boxX, y, boxWidth+10, boxHeight, 8, 8, 'FD');

        pdf.setTextColor(255);
        pdf.text(textLines, boxX + 5, y + 15);
        y += boxHeight + 15;

        pdf.setTextColor(0);
        pdf.setFont('Helvetica','bold')
        pdf.text(this.translate.instant('conversation.pdf.cipher')+':', boxX, y);
        pdf.setFont('Helvetica','')

        let feedbackCipherLines = pdf.splitTextToSize(doc.messages[i].feedbackCipher, (pageWidth - margin * 2) * 0.75);
        pdf.text(feedbackCipherLines, boxX+50, y);
        y += pdf.getLineHeight() * feedbackCipherLines.length + 10;

        pdf.setFontSize(12);
        pdf.setFont('Helvetica','bold')
        pdf.text(this.translate.instant('conversation.pdf.feedback')+':', boxX, y);
        pdf.setFont('Helvetica','')

        y += 15;
        let feedbackLines = pdf.splitTextToSize(doc.messages[i].feedback, (pageWidth - margin * 2) * 0.75);
        pdf.text(feedbackLines, boxX, y);
        y += pdf.getLineHeight() * feedbackLines.length + 10;

        
      }
    }

    pdf.addPage();
    pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
    pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
    countPages++;
    y = 72;
    pdf.setFontSize(20);
    pdf.text(this.translate.instant('conversation.pdf.evaluation'), x, y);

    y += 30;
    pdf.setFontSize(12);

    if(doc.close){
      let htmlContent = doc.close;


      const tempDiv = document.createElement("div");
      tempDiv.style.width = "600px"; // Zorg dat de breedte overeenkomt met een standaard vensterbreedte
      tempDiv.innerHTML = htmlContent;
      document.body.appendChild(tempDiv);

      // Ga naar de laatste pagina of voeg een nieuwe pagina toe
      const currentPage = pdf.getCurrentPageInfo().pageNumber;
      const totalPages = pdf.getNumberOfPages();

      if (currentPage !== totalPages) {
        pdf.setPage(totalPages); // Ga naar de laatste pagina
      }

      // pdf.addPage(); // Voeg een nieuwe pagina toe aan het einde

      // Render de HTML op de nieuwe pagina
      pdf.html(tempDiv, {
        callback: (doc) => {
          // Sla de PDF op na het toevoegen van de HTML
          setTimeout(() => {
            doc.save('gespreksverslag.pdf');   
            this.toast.hideLoader()
            this.toast.show('Het document is gegenereerd en wordt gedownload.')   
          }, 1000);
        },
        x: 50, // Marges
        y: ((countPages-1) * pageHeight) + 80, // Voeg de hoogte van de vorige pagina's toe
        width: 100, // Schaal de inhoud naar de beschikbare breedte van een A4-pagina
        html2canvas: {
          scale: 0.8, // Verhoog de schaal om de inhoud leesbaarder te maken
        },
        autoPaging: true, // Zorg ervoor dat lange inhoud wordt opgesplitst over meerdere pagina's
      });

      // Verwijder het tijdelijke element
      document.body.removeChild(tempDiv);
    }
    else{
      setTimeout(() => {
        pdf.save('gespreksverslag.pdf');      
        this.toast.hideLoader()
        this.toast.show('Het document is gegenereerd en wordt gedownload.')
      }, 1000);
    }




  }

  

  async addImageToPdf(pdf:any, imageUrl:string, x:number, y:number, width:number, height:number) {
    try {
      // Stap 1: Laad de afbeelding als Blob met fetch
      const response = await fetch(imageUrl, { mode: "cors" });
      if (!response.ok) {
        throw new Error(`Kan de afbeelding niet laden: ${response.statusText}`);
      }
      const blob = await response.blob();
  
      // Stap 2: Converteer de Blob naar een Base64-string
      const base64 = await this.blobToBase64(blob);
  
      // Stap 3: Voeg de afbeelding toe aan de PDF
      pdf.addImage(base64, 'PNG', x, y, width, height);
    } catch (error) {
      console.error("Fout bij het toevoegen van de afbeelding:", error);
    }
  }
  
  blobToBase64(blob:any) {
    return new Promise((resolve, reject) => {
      const reader:any = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]); // Haal de Base64-string op
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }


}
