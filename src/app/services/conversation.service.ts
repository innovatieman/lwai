import { EventEmitter, Injectable, OnDestroy, OnInit, Output } from '@angular/core';
import { ConnectService } from './connect.service';
import { UserService } from './user.service';
import { LevelsService } from './levels.service';
import { AuthService } from '../auth/auth.service';
import { FirestoreService } from './firestore.service';
import { Subscription } from 'rxjs';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { HeyGenApiService } from './heygen.service';

@Injectable({
  providedIn: 'root'
})
export class ConversationService implements OnDestroy {
  @Output() update: EventEmitter<boolean> = new EventEmitter();
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
  private conversationSub!: Subscription;
  private subCollectionSubs: Subscription[] = [];
  private subCollections = ['messages', 'feedback', 'facts','choices','loading','phases'];

  constructor(
    public levels:LevelsService,
    private auth:AuthService,
    private firestoreService:FirestoreService,
    private firestore: AngularFirestore,
    public heyGen:HeyGenApiService

  ) { }



  loadConversation(conversationId: string,caseItem?:any): void {
    // console.log(`users/${this.auth.userInfo.uid}/conversations/${conversationId}`)
    

    this.conversationSub = this.firestore
      .doc(`users/${this.auth.userInfo.uid}/conversations/${conversationId}`)
      .valueChanges({ idField: 'conversationId' })
      .subscribe((conversation:any) => {
        console.log(conversation)
        this.activeConversation = { ...conversation };
          // console.log(this.activeConversation)
          if(this.activeConversation.attitude!=undefined && this.activeConversation.attitude!=this.attitude){
            this.attitude = this.activeConversation.attitude
            this.update.emit(true);
          }
        this.loadSubCollections(conversationId);
      })
    if(caseItem){
      this.caseItem = caseItem
      this.dialog_role = caseItem.role;
    }
    if(this.caseItem.avatarName){
      this.heyGen.initializeAvatar(this.caseItem.avatarName,'avatar_video')
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
            (subCollectionData) => {
              this.activeConversation = {
                ...this.activeConversation,
                [collectionName]: subCollectionData,
              };
              if(collectionName == 'messages'){
                this.scrollChatToBottom()
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
      this.messageTemp.content = temp[1] + this.messageTemp.content
    }
  }

  setAttitude(){
    this.attitudeSet = true
    let attitudeString = ''
    if(this.tempText.includes('reaction:')){
      attitudeString = this.tempText.replace('newAttitude:','').split(', reaction:')[0]
      this.attitude = parseInt(attitudeString)
      this.update.emit(true);
    }
  }

  

  async startConversation(caseItem:any){
    this.caseItem = caseItem
    // userId, conversationId, categoryId, caseId, instructionType, attitude
    this.dialog_role = caseItem.role;
    this.waiting = true;
    let conversationId = ''
    await this.firestoreService.createSub('users', this.auth.userInfo.uid, 'conversations',{
      caseId:caseItem.id,
      timestamp: new Date().getTime(),
      role:caseItem.role,
      attitude:caseItem.attitude,
      conversationType:caseItem.conversation,
    },(response:any)=>{
      conversationId = response.id
      localStorage.setItem('conversation',JSON.stringify({conversationId, ...caseItem}))
      this.loadConversation(conversationId)
    })

    let obj:any = {
      userId:this.auth.userInfo.uid,
      conversationId:conversationId,
      categoryId:caseItem.conversation,
      caseId:caseItem.id,
      instructionType:'reaction',
      attitude:this.caseItem.attitude,
    }
    this.startLoading('reaction')
    this.startLoading('facts')
    this.getExtraInfo('facts',conversationId)
    this.openai_chat(obj)

  }


  async openai_chat(obj:any) {
    this.messages.push({role:'user',content:this.message})
    this.attitude = obj.attitude
    this.update.emit(true);
    const response = await fetch("https://chatAI-p2qcpa6ahq-ew.a.run.app", {
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
  
    // while (!done) {
    //   const { value, done: readerDone } = await reader.read();
    //   done = readerDone;
  
    //   if (value) {
    //     const chunk = decoder.decode(value);
    //     if(this.tempText.includes(', reaction:')){
    //       if(this.heyGen.streamingAvatar){
    //         this.heyGen.speakText(chunk)
    //       }

    //       this.messageTemp.content = this.messageTemp.content + chunk
    //       this.scrollChatToBottom()
    //       if(!this.attitudeSet){
    //         this.cleanTempText()
    //         this.setAttitude()
    //       }
    //     }
    //     else{
    //       this.tempText = this.tempText + chunk
    //     }
    //   }
    // }

    let buffer = ''; // Buffer om incomplete zinnen op te slaan

    while (!done) {
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

    this.waiting = false;
    // this.messages.push({'role':'assistant','content':this.messageTemp.content})
    this.messageTemp = {'role':'assistant','content':''}
    this.tempText = ''
    this.tempTextUser = ''
    this.attitudeSet = false
    this.getExtraInfo('choices')
    this.getExtraInfo('phases')
    this.getExtraInfo('feedback')
  }


  addMessage(message:string){
    if(!message){
      return;
    }
    this.getExtraInfo('facts')

    this.message = message;
    this.waiting = true;

    let obj:any = {
      userId:this.auth.userInfo.uid,
      conversationId:this.activeConversation.conversationId,
      categoryId:this.caseItem.conversation,
      caseId:this.activeConversation.caseId,
      instructionType:'reaction',
      attitude:this.attitude,
      prompt:message
    }
    this.tempTextUser = message
    this.scrollChatToBottom()
    this.startLoading('reaction')
    this.startLoading('choices')
    this.startLoading('feedback')
    this.openai_chat(obj)
  }


  getExtraInfo(topic:string,conversationId?:string){
    if(this.activeConversation.conversationId){
      conversationId = this.activeConversation.conversationId
    }
    let obj:any = {
      userId:this.auth.userInfo.uid,
      conversationId:conversationId,
      instructionType:topic,
      role:this.dialog_role,
      categoryId:this.caseItem.conversation,
    }
    // console.log(obj)
    this.startLoading(topic)
    this.openai_extra_save(obj)
  }

  async openai_extra_save(obj:any) {
    let url = 'https://conversationAIDirect-p2qcpa6ahq-ew.a.run.app'
    if(obj.instructionType == 'facts'){
      url = 'https://factsai-p2qcpa6ahq-ew.a.run.app'
    }
    else if(obj.instructionType == 'phases'){
      url = 'https://phasesai-p2qcpa6ahq-ew.a.run.app'
    }
    else if(obj.instructionType == 'feedback'){
      url = 'https://feedbackai-p2qcpa6ahq-ew.a.run.app'
    }
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
        const choices: { choice: string; description: string }[] = [];
        // Match each Choice block using a regular expression
        const choiceRegex = /{Choice \d+:.*?\[(.*?)\]\[(.*?)\]}/gs;
        let match;

        while ((match = choiceRegex.exec(input)) !== null) {
            const choice = match[1].trim().replace(/^"/, '').replace(/"$/, '');
            const description = match[2].trim().replace(/^"/, '').replace(/"$/, '');
            choices.push({ choice, description });
        }

        // Respect the length condition
        if (length && choices.length >= length) {
            return choices;
        }
        return choices; // Always return an array
    } catch (error) {
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

}
