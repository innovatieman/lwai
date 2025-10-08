import { ChangeDetectorRef, EventEmitter, Injectable, OnDestroy, OnInit, Output } from '@angular/core';
import { ConnectService } from './connect.service';
import { UserService } from './user.service';
import { LevelsService } from './levels.service';
import { AuthService } from '../auth/auth.service';
import { FirestoreService } from './firestore.service';
import { Subscription, timestamp } from 'rxjs';
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
import { FormatAiTextPipe } from '../pipes/format-ai-text.pipe';


@Injectable({
  providedIn: 'root'
})
export class ConversationService implements OnDestroy {
  @Output() update: EventEmitter<boolean> = new EventEmitter();
  @Output() updateAchievements: EventEmitter<boolean> = new EventEmitter();
  @Output() speaking: EventEmitter<boolean> = new EventEmitter();
  @Output() activeStream: EventEmitter<boolean> = new EventEmitter();
  @Output() activateVideoScreen: EventEmitter<boolean> = new EventEmitter();
  @Output() analysisReady: EventEmitter<boolean> = new EventEmitter();
  @Output() subCollectionUpdated: EventEmitter<boolean> = new EventEmitter();
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
  firstLoadMessages:boolean = false;
  // busyAnalyzing:boolean = false;
  allLoaded:boolean = false;
  originUrl:string = '';
  voiceActive:boolean = false;
  isSpeaking:boolean = false;
  fullRecording:boolean = false;


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
    private translate:TranslateService,
    private formatAiTextPipe:FormatAiTextPipe,

  ) { 
    this.heyGen.active.subscribe((active:boolean)=>{
      this.activeStream.emit(active)
    })
  }

  

  async startConversation(caseItem:any){
    this.firstLoadMessages = false;
    // console.log(JSON.parse(JSON.stringify(caseItem)))
    caseItem.conversationType = caseItem.conversation || caseItem.conversationType;
    this.caseItem = caseItem
    // this.caseItem.conversationType = caseItem.conversation
    // userId, conversationId, categoryId, caseId, instructionType, attitude
    this.dialog_role = caseItem.role;
    this.waiting = true;
    let conversationId = ''
    let openingMessage = caseItem.openingMessage || ''
    this.tempTextUser = openingMessage
    let steadfastness = caseItem.steadfastness || 0
    let agentsSettings = caseItem.editable_by_user?.agents || {
      choices:true,
      facts:true,
      background:true,
      undo:true,
    }
    let conversationObj:any = JSON.parse(JSON.stringify(caseItem))
    // console.log(JSON.parse(JSON.stringify(conversationObj)))

    conversationObj.caseId = caseItem.id;
    conversationObj.timestamp = new Date().getTime();
    conversationObj.openingMessage = openingMessage;
    conversationObj.steadfastness = steadfastness;
    conversationObj.voice = caseItem.voice || '';
    conversationObj.voice_on = caseItem.voice_on || false;
    conversationObj.extra_knowledge = caseItem.extra_knowledge || '';
    conversationObj.video_on = caseItem.video_on || (caseItem.avatarName?true:false);
    conversationObj.agentsSettings = agentsSettings;
    conversationObj.free_question = caseItem.free_question || '';
    conversationObj.free_question2 = caseItem.free_question2 || '';
    conversationObj.free_question3 = caseItem.free_question3 || '';
    conversationObj.free_question4 = caseItem.free_question4 || '';
    conversationObj.free_answer = caseItem.free_answer || '';
    conversationObj.free_answer2 = caseItem.free_answer2 || '';
    conversationObj.free_answer3 = caseItem.free_answer3 || '';
    conversationObj.free_answer4 = caseItem.free_answer4 || '';
    conversationObj.logo = caseItem.logo || '';
    conversationObj.expertise_title = caseItem.expertise_title || '';
    conversationObj.expertise_summary = caseItem.expertise_summary || '';
    conversationObj.hide = caseItem?.editable_by_user?.hide || {
        attitude:false,
        phases:false,
        feedback:false,
        feedbackCipher: false,
        goal:false
      };
    conversationObj.trainerId = caseItem.trainerId || '';
    conversationObj.trainingId = caseItem.trainingId || '';
    // console.log(JSON.parse(JSON.stringify(conversationObj)))
    // let conversationObj:any = {
    //   caseId:caseItem.id,
    //   timestamp: new Date().getTime(),
    //   title:caseItem.title,
    //   role:caseItem.role,
    //   attitude:caseItem.attitude,
    //   conversationType:caseItem.conversation,
    //   openingMessage:openingMessage,
    //   steadFastness:steadFastness,
    //   goalsItems:caseItem.goalsItems,
    //   max_time:caseItem.max_time,
    //   minimum_goals:caseItem.minimum_goals,
    //   avatarName:caseItem.avatarName,
    //   voice:caseItem.voice || '',
    //   extra_knowledge:caseItem.extra_knowledge || '',
    //   photo:caseItem.photo,
    //   video_on:caseItem.avatarName?true:false,
    //   agentsSettings:agentsSettings,
    //   free_question:caseItem.free_question || '',
    //   free_question2:caseItem.free_question2 || '',
    //   free_question3:caseItem.free_question3 || '',
    //   free_question4:caseItem.free_question4 || '',
    //   free_answer:caseItem.free_answer || '',
    //   free_answer2:caseItem.free_answer2 || '',
    //   free_answer3:caseItem.free_answer3 || '',
    //   free_answer4:caseItem.free_answer4 || '',
    //   logo:caseItem.logo || '',
    //   expertise_title:caseItem.expertise_title || '',
    //   expertise_summary:caseItem.expertise_summary || '',
    // }
    // if(caseItem.trainerId){
    //   conversationObj.trainerId = caseItem.trainerId
    // }
    // if(caseItem.trainingId){
    //   conversationObj.trainingId = caseItem.trainingId
    // }

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
          // console.log(this.activeConversation)
        }, 2000);
          // console.log(this.attitude)
          if(this.activeConversation.attitude!=undefined && this.activeConversation.attitude!=this.attitude){
            this.attitude = this.activeConversation.attitude
            this.update.emit(true);
          }
          if(!this.activeConversation.rating){
            this.activeConversation.rating = {}
          }
          // console.log(this.activeConversation)
        this.loadSubCollections(conversationId);
      })
    if(caseItem){
      this.caseItem = caseItem
      this.dialog_role = caseItem.role;
    }
    // console.log(this.caseItem)
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
              trainerId: this.activeConversation.trainerId,
              trainingId: this.activeConversation.trainingId,
            },
            conversationId:conversationId,
            categoryId:this.caseItem.conversation || this.caseItem.conversationType,
            caseId:this.caseItem.id,
            instructionType:'reaction',
            attitude:this.caseItem.attitude,
            openingMessage:this.caseItem.openingMessage,
            prompt:this.caseItem.openingMessage || '',
            steadFastness:this.caseItem.steadFastness,
            voice:this.caseItem.voice || this.activeConversation.voice || '',
            extra_knowledge:this.caseItem.extra_knowledge || ''
          }
          if(this.caseItem.trainerId){
            obj.trainerId = this.caseItem.trainerId
          }

          if(!this.messages){
            this.messages = [];
          }
          this.messages.push({role:'system',content:'',id:"0"})
          this.messages.push({role:'user',content:this.caseItem.openingMessage || '',id:"1"})
          console.log('voiceActive',this.voiceActive)
          this.record.initiateRecording(conversationId)
          if(this.voiceActive){
            this.openai_chat_voice(obj)
          }
          else{
            this.openai_chat(obj)
          }
        }
      },100);
    }
    else{
      this.record.initiateRecording(conversationId)
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
          .valueChanges({ idField: (collectionName=='feedback' ? 'doc_id' : 'id') })
          .subscribe(
            (subCollectionData:any) => {
              this.activeConversation = {
                ...this.activeConversation,
                [collectionName]: subCollectionData,
              };
              if(collectionName == 'messages'){
                if((!this.firstLoadMessages||!this.activeConversation.messages || this.activeConversation.messages.length<1 )&& !this.messages?.length){
                  this.messages = subCollectionData;
                }
                this.scrollChatToBottom()
                this.reloadAttitude()
                this.setNewAttitude()
                this.firstLoadMessages = true;
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
                if(this.allLoaded){
                  this.analysisReady.emit(true)
                  // this.busyAnalyzing = false
                  // console.log('all loaded')
                }
              }
              // this.subCollectionUpdated.emit(true);
              // if(collectionName=='feedback'){
              //   this.activeConversation.feedback = [...this.activeConversation.feedback];
              //   console.log('feedback loaded',this.activeConversation.feedback);
              // }
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
      // this.messageTemp.content = this.clearStringChars(temp[1] + this.messageTemp.content)
      this.messages[this.messages.length-1].content = this.clearStringChars(temp[1] + this.messages[this.messages.length-1].content)
    }
  }

  setAttitude(){
    // console.log('setAttitude:',this.tempText)
    this.attitudeSet = true
    let attitudeString = ''
    if(this.tempText.includes('reaction:')){
      attitudeString = this.tempText.replace('newAttitude:','').split(', reaction:')[0]
      
      this.attitude = parseInt(this.clearStringNumbers(attitudeString))
      this.update.emit(true);
    }
  }

  setNewAttitude(){
    // console.log('setAttitude:',this.tempText)

    this.attitudeSet = true
    let attitudeString = ''
    if(this.activeConversation.messages[this.activeConversation.messages.length-1]?.content.includes('reaction:')){
      attitudeString = this.activeConversation.messages[this.activeConversation.messages.length-1].content.replace('newAttitude:','').split(', reaction:')[0]

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
    // console.log('reloadAttitude')
    let attitudeString = ''
    if(this.latestAssistantItem(this.activeConversation.messages).includes('newAttitude:')){
      attitudeString = this.latestAssistantItem(this.activeConversation.messages).replace('newAttitude:','').split(', reaction:')[0]
      this.attitude = parseInt(this.clearStringNumbers(attitudeString))
      this.update.emit(true);
    }
  }

  
  wait(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }
 
  getLatestMessageId(messages:any): any {
    if (!messages || messages.length < 1) {
      return 0;
    }
    // Sort messages by timestamp
    messages = messages.sort((a:any, b:any) => a.id - b.id);
    // Get the last message
    const lastMessage = messages[messages.length - 1];
    // Return the id of the last message or 0 if it doesn't exist
    return lastMessage && lastMessage.id ? lastMessage.id : '';
  }


  async openai_chat(obj:any) {
    if(this.message){
      this.messages.push({role:'user',content:this.message,id:(parseInt(this.getLatestMessageId(this.messages))+1)+''})
    }
    this.scrollChatToBottom();
    this.messages.push({content:'',role:'assistant',id:(parseInt(this.getLatestMessageId(this.messages))+1)+''})
    this.attitude = obj.attitude
    obj.language = this.translate.currentLang
    obj.training = {
      trainerId: this.activeConversation.trainerId,
      trainingId: this.activeConversation.trainingId,
    }
    obj.daysBetweenConversations = this.activeConversation.daysBetweenConversations || 0;
    console.log(obj)
    let url  = 'https://europe-west1-lwai-3bac8.cloudfunctions.net/chatGemini'
    if( this.activeConversation.conversation == 'expert' || this.activeConversation.conversationType == 'expert'){
      url = 'https://europe-west1-lwai-3bac8.cloudfunctions.net/chatExpertGemini'
    }
    console.log(url)
    // console.log(obj)
    this.update.emit(true);
    // setTimeout(() => {
    //   this.tempTextUser = ""
    // }, 10000);
    // const response = await fetch("https://chatai-p2qcpa6ahq-ew.a.run.app", {
    const response = await fetch(url, {
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
          ['.', '!', '?','§'].forEach(punctuation => {
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

            this.messages[this.messages.length - 1].content += completeSentence; // Update de laatste message
            // Voeg de zin toe aan de UI of interne opslag
            // this.messageTemp.content += completeSentence;
            this.scrollChatToBottom();
          }
        }
      }
    }

    
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

  audioVoice:HTMLAudioElement = new Audio();

  async openai_chat_voice(obj: any) {
    this.update.emit(true);
    console.log(this.activeConversation.messages)

    if(!obj.voice){
      obj.voice = 'ARIOBKJtltx2F7r1TMzI'// 'AyQGttFzg1EY7EIKkpHs';
    }
    obj.emotion = ''
    if(this.attitude&&this.infoService.getAttitude(this.attitude)?.title){
      obj.emotion = this.translate.instant('conversation.voice_emotion_attitude') + ' ' + this.infoService.getAttitude(this.attitude)?.title;
    }
    // obj.modelId = 'eleven_v3'
    // obj.model = "gpt-4o-mini-tts"
    obj.voice = this.activeConversation.voice
    // obj.instructions = "Voice Affect: Ondeugend, geamuseerd, licht ironisch.\n\nTone: Lichtvoetig, plagerig.\n\nPacing: Afwisselend, met ritmische cadans.\n\nPronunciation: Speelse klemtonen, lichte uithalen.\n\nPauses: Voor dramatisch effect of humor."
    console.log('speaking with voice',obj)
    // const response = await fetch("https://europe-west1-lwai-3bac8.cloudfunctions.net/chatGeminiVoiceElevenlabsStream2", {
    const response = await fetch("https://europe-west1-lwai-3bac8.cloudfunctions.net/chatGeminiVoiceOpenAiTTS", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(obj),
    });

    if (!response.ok || !response.body) {
      console.error("Stream response failed");
      this.update.emit(false); // Stop loading indicator
      return;
    }

    

    const reader = response.body.getReader();
    this.audioVoice = new Audio(); // Gebruik een standaard HTML Audio-element
    this.audioVoice.autoplay = true;     // Start automatisch met afspelen zodra er data is

    const mediaSource = new MediaSource();
    this.audioVoice.src = URL.createObjectURL(mediaSource); // Koppel MediaSource aan audio-element

    let sourceBuffer: SourceBuffer | null = null;
    let bufferPromise: Promise<void> = Promise.resolve(); // Zorgt voor sequentiële appendBuffer calls

    // Event listener voor wanneer de MediaSource klaar is om buffers te accepteren
    mediaSource.addEventListener('sourceopen', async () => {
      try {
        // Voeg een SourceBuffer toe voor MP3-audio
        // De MIME-type 'audio/mpeg' moet overeenkomen met de Content-Type van de server
        sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
        sourceBuffer.mode = 'sequence'; // Belangrijk voor aaneengesloten media

        this.waiting = false;
        this.attitudeSet = false
        this.getExtraInfo('phases')
        this.getExtraInfo('feedback')
        this.isSpeaking = true; // Zet de isSpeaking status op true
        this.record.isSpeaking = true;
        this.speaking.emit(true); // Eventueel update de UI

        // Functie om de binnengekomen chunks te bufferen
        const appendChunk = async (chunk: any) => {
          // Wacht tot de vorige appendBuffer-operatie voltooid is
          await bufferPromise;

          // Maak een nieuwe Promise die resolved zodra de append voltooid is of er een fout optreedt
          bufferPromise = new Promise((resolve, reject) => {
            const onUpdateEnd = () => {
              sourceBuffer!.removeEventListener('updateend', onUpdateEnd);
              sourceBuffer!.removeEventListener('error', onError);
              resolve();
            };
            const onError = (e: Event) => {
              console.error('SourceBuffer error during append:', e);
              sourceBuffer!.removeEventListener('updateend', onUpdateEnd);
              sourceBuffer!.removeEventListener('error', onError);
              reject(new Error('SourceBuffer append error')); // Reject om de hoofdloop te onderbreken
            };

            sourceBuffer!.addEventListener('updateend', onUpdateEnd);
            sourceBuffer!.addEventListener('error', onError);

            try {
              sourceBuffer!.appendBuffer(chunk);
            } catch (e) {
              // Vang synchronische fouten van appendBuffer op
              console.error('Synchronous appendBuffer error:', e);
              onError(new Event('error')); // Trigger de error handler
            }
          });
        };

        // Lees de stream van de server en voeg chunks toe aan de SourceBuffer
        while (true) {
          const { value, done } = await reader.read();
          if (done) break; // Geen data meer van de server

          if (value) {
            try {
              await appendChunk(value);
              // Optionele log: console.log(`Chunk appended. Current buffered range: ${sourceBuffer.buffered.length > 0 ? sourceBuffer.buffered.start(0).toFixed(2) + '-' + sourceBuffer.buffered.end(0).toFixed(2) + 's' : 'empty'}`);
            } catch (e) {
              console.error('Failed to append chunk, stopping stream processing:', e);
              break; // Stop met verwerken bij een fout
            }
          }
        }

        // Nadat alle chunks zijn gelezen en gebufferd, geef aan dat de stream is afgelopen
        await bufferPromise; // Wacht op de laatste append
        if (mediaSource.readyState === 'open') {
          mediaSource.endOfStream();
          // console.log("Stream reader is klaar, MediaSource.endOfStream() aangeroepen.");
        }

      } catch (error) {
        // console.error("Error setting up MediaSource or processing stream:", error);
        if (mediaSource.readyState === 'open') {
          mediaSource.endOfStream('network'); // Sluit de stream af met een foutstatus
        }
      } finally {
        this.update.emit(false); // Stop loading indicator
      }
    }, { once: true }); // Zorg dat sourceopen maar één keer wordt getriggerd

    this.audioVoice.addEventListener('ended', () => {
      // console.log('Audio is afgelopen, stop de animatie.');
      this.isSpeaking = false; // Zet de isSpeaking status op false, dit is waar je de animatie stopt
      this.record.isSpeaking = false;
      this.speaking.emit(false); // Eventueel update de UI
    });

    // Optionele event listeners voor debugging
    mediaSource.addEventListener('sourceended', () => {
      // console.log('MediaSource finished buffering.');
      // Ruim de object-URL op wanneer de MediaSource is afgesloten
      URL.revokeObjectURL(this.audioVoice.src);
    });

    mediaSource.addEventListener('sourceclose', () => {
      // console.log('MediaSource closed.');
    });

    this.audioVoice.addEventListener('error', (e:any) => {
      // console.error('Audio element error:', e);
      this.update.emit(false); // Stop loading indicator bij een audiofout
    });
  }

  // async openai_chat_sound_old(obj: any) {
  //   this.update.emit(true);

  //   obj.voice = 'AyQGttFzg1EY7EIKkpHs';
  //   // obj.modelId

  //   // const response = await fetch("https://europe-west1-lwai-3bac8.cloudfunctions.net/chatGeminiVoiceStream", {
  //   const response = await fetch("https://europe-west1-lwai-3bac8.cloudfunctions.net/chatGeminiVoiceElevenlabsStream", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify(obj),
  //   });

  //   if (!response.ok || !response.body) {
  //     console.error("Stream response failed");
  //     return;
  //   }

  //   const reader = response.body.getReader();
  //   const audioContext = new AudioContext();
  //   const sourceQueue: ArrayBuffer[] = [];
  //   let stopRequested = false;
  //   let playbackLoopRunning = false;

  //   // Nieuwe constante: Minimale buffer grootte in aantal chunks
  //   const MIN_CHUNKS_TO_BUFFER = 7; // Begin pas met afspelen na minimaal 7 chunks

  //   const startAudioPlaybackLoop = async () => {
  //     if (playbackLoopRunning) return;
  //     playbackLoopRunning = true;

  //     // Wacht hier tot er voldoende chunks zijn gebufferd
  //     while (sourceQueue.length < MIN_CHUNKS_TO_BUFFER && !stopRequested) {
  //       console.log(`Wachten op meer chunks... Huidig aantal: ${sourceQueue.length}`);
  //       await new Promise(r => setTimeout(r, 100)); // Blijf wachten
  //     }
  //     console.log("Voldoende chunks gebufferd, starten met afspelen.");


  //     let currentPlaybackTime = audioContext.currentTime;

  //     while (!stopRequested || sourceQueue.length > 0) {
  //       if (sourceQueue.length === 0) {
  //         // We zijn live aan het streamen, dus wacht korter als de queue leeg is
  //         await new Promise(r => setTimeout(r, 50));
  //         continue;
  //       }

  //       const buffer = sourceQueue.shift();
  //       if (!buffer) continue;

  //       try {
  //         const decodedBuffer = await audioContext.decodeAudioData(buffer.slice(0));
  //         const source = audioContext.createBufferSource();
  //         source.buffer = decodedBuffer;
  //         source.connect(audioContext.destination);

  //         source.start(currentPlaybackTime);
  //         currentPlaybackTime = Math.max(audioContext.currentTime, currentPlaybackTime) + decodedBuffer.duration - 0.05; // overlap van 50ms

  //         // Update de starttijd voor het volgende fragment op basis van de duur van dit fragment
  //         currentPlaybackTime += decodedBuffer.duration;

  //         // Wacht tot dit fragment is afgespeeld voordat het volgende wordt gepland
  //         await new Promise(resolve => source.onended = resolve);

  //         console.log('Fragment afgespeeld')
  //         // Optioneel: Log voor debugging
  //         // console.log(`Afgespeeld: ${decodedBuffer.duration.toFixed(2)}s. Volgende start over: ${(currentPlaybackTime - audioContext.currentTime).toFixed(2)}s`);

  //       } catch (err) {
  //         console.error("Audio decode/play error", err);
  //         // Bij een fout: zorg dat we niet te ver achterop raken
  //         currentPlaybackTime = audioContext.currentTime;
  //       }
  //     }

  //     playbackLoopRunning = false;
  //     await audioContext.close();
  //     console.log("Afspelen gestopt, audiocontext gesloten.");
  //   };

  //   // Start de afspeel-loop (deze wacht nu zelf op voldoende chunks)
  //   startAudioPlaybackLoop();

  //   // Stream uitlezen en in de wachtrij stoppen
  //   while (true) {
  //     const { value, done } = await reader.read();
  //     if (done) break;

  //     if (value) {
  //       const chunk = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
  //       sourceQueue.push(chunk);
  //     }
  //   }

  //   stopRequested = true; // Geef aan dat er geen nieuwe chunks meer komen
  //   console.log("Stream reader is klaar.");
  // }


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
      prompt:message,
      voice:this.caseItem.voice || this.activeConversation.voice || ''
    }
    // console.log(obj)
    this.tempTextUser = message
    // this.record.recording = false;
    this.record.stopRecording();
    setTimeout(() => {
      this.record.analyzing = false;
    }, 200);
    // console.log(this.tempTextUser)
    this.scrollChatToBottom()
    this.startLoading('reaction')
    // this.startLoading('choices')
    this.startLoading('feedback')
    if(this.voiceActive){
      this.openai_chat_voice(obj)
    }
    else{
      this.openai_chat(obj)
    }
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
      // url = 'https://factsGemini-p2qcpa6ahq-ew.a.run.app'
      url = 'https://europe-west1-lwai-3bac8.cloudfunctions.net/factsGemini'
    }
    else if(obj.instructionType == 'phases'){
      // url = 'https://phasesai-p2qcpa6ahq-ew.a.run.app'
      // url = 'https://phasesgemini-p2qcpa6ahq-ew.a.run.app'
      url = 'https://europe-west1-lwai-3bac8.cloudfunctions.net/phasesGemini'
    }
    else if(obj.instructionType == 'feedback'){
      // url = 'https://feedbackai-p2qcpa6ahq-ew.a.run.app'
      // url = 'https://feedbackgemini-p2qcpa6ahq-ew.a.run.app'
      url = 'https://europe-west1-lwai-3bac8.cloudfunctions.net/feedbackGemini'
    }
    else if(obj.instructionType == 'choices'){
      // url = 'https://choicesai-p2qcpa6ahq-ew.a.run.app'
      // url = 'https://choicesgemini-p2qcpa6ahq-ew.a.run.app'
      url = 'https://europe-west1-lwai-3bac8.cloudfunctions.net/choicesGemini'
    }
    else if(obj.instructionType == 'goals'){
      // url = 'https://goalai-p2qcpa6ahq-ew.a.run.app'
      // url = 'https://goalgemini-p2qcpa6ahq-ew.a.run.app'
      url = 'https://europe-west1-lwai-3bac8.cloudfunctions.net/goalsGemini'
    }
    else if(obj.instructionType == 'background'){
      // url = 'https://backgroundai-p2qcpa6ahq-ew.a.run.app'
      // url = 'https://backgroundgemini-p2qcpa6ahq-ew.a.run.app'
      url = 'https://europe-west1-lwai-3bac8.cloudfunctions.net/backgroundGemini'
    }
    if(!url){
      console.error('No url found')
      return;
    }
    obj.language = this.translate.currentLang
    obj.training = {
      trainerId: this.activeConversation.trainerId,
      trainingId: this.activeConversation.trainingId,
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
    if(!messages[index]){
      return 0;
    }
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

  getFeedbackChat(index:number,type:string,id?:string){
    if(!this.messages || this.messages.length<1){
      return {};
    }
    let messages = JSON.parse(JSON.stringify(this.messages))
    let feedbackList = []
    if(!this.activeConversation.feedback || this.activeConversation.feedback.length<1){
      return '';
    }
    feedbackList = JSON.parse(JSON.stringify(this.activeConversation.feedback))
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

    let feedbackObject:any = {}
    if(feedbackList && feedbackList.length){
      for(let i=0;i<feedbackList.length;i++){
        if(feedbackList[i].id){
          feedbackObject[feedbackList[i].id] = feedbackList[i]
        }
      }
    }
    if(newIndex<0 || !feedbackList || feedbackList.length<1 || (!feedbackList[newIndex] && ((!id || id=='' || !feedbackObject[id]) ) )){
      return '';
    }
    let feedback:any = {}
    if(!this.feedbackHasIds() || (this.activeConversation.timestamp && this.activeConversation.timestamp < 1750057716607)){ // || !id || id=='' || !this.feedbackObject[id]{

      if(feedbackList[newIndex] && feedbackList[newIndex].content.substring(0,1) != '{'){
        // let feedback:any = {}
        feedback= feedbackList[newIndex].content.split('```json').join('').split('```').join('')
      }
      else if(feedbackList[newIndex]){
        feedback = JSON.parse(feedbackList[newIndex].content)
      } 
    }
    else if(id){
      if(!feedbackObject[id]){
        return '';
      }
      feedback = feedbackObject[id].content;
      if(feedback.substring(0,1) != '{'){
        feedback = feedback.split('```json').join('').split('```').join('')
      }
      else{
        feedback = JSON.parse(feedback)
      }
    }
    if(typeof feedback =='string'){
      feedback = JSON.parse(feedback)
    }
    
    if(type=='id' && !this.feedbackHasIds()){
      return feedbackList.feedback[newIndex].id
    }
    else if(type=='id' && id){
      if(!feedbackObject[id]){
        return '';
      }
      return feedbackObject[id].doc_id;
    }
    return feedback[type];
  }

  feedbackHasIds(){
    if(!this.activeConversation.feedback || this.activeConversation.feedback.length<1){
      return false;
    }
    for(let i=0;i<this.activeConversation.feedback.length;i++){
      if(this.activeConversation.feedback[i].id){
        return true;
      }
    }
    return false;
  }

  // feedbackObject{
  //   let feedbackObject:any = {}
  //   for(let i=0;i<this.activeConversation.feedback.length;i++){
  //     if(this.activeConversation.feedback[i].id){
  //       feedbackObject[this.activeConversation.feedback[i].id] = this.activeConversation.feedback[i]
  //     }
  //   }
  //   return feedbackObject;
  // }


  // getFeedbackChat2(index:number,type:string){
  //   let messages = JSON.parse(JSON.stringify(this.messages))
  //   let userMessages = []
  //   for(let i=0;i<messages.length;i++){
  //     if(messages[i].role == 'user'){
  //       messages[i].index = i
  //       userMessages.push(messages[i])
  //     }
  //   }
  //   console.log(userMessages)
  //   let newIndex = -1
  //   for(let i=0;i<userMessages.length;i++){
  //     if(userMessages[i].index == index){
  //       newIndex = i
  //     }
  //   }
  //   if(newIndex<0 || !this.activeConversation.feedback || this.activeConversation.feedback.length<1 || !this.activeConversation.feedback[newIndex]){
  //     return '';
  //   }
  //   let feedback = JSON.parse(this.activeConversation.feedback[newIndex].content)
  //   return feedback[type];
  // }

  undoLastMove(){
    this.modalService.showConfirmation('Weet je zeker dat je de laatste zet ongedaan wilt maken?').then((response:any)=>{
      if(response){
        this.deleteLastMoves('messages',2)
        this.messages.pop() // remove last message
        this.messages.pop() // remove last user message
        this.scrollChatToBottom()
        this.deleteLastMoves('feedback',1)
        this.deleteLastMoves('phases',1)
        // this.deleteLastMoves('choices',2)
      }
    })
  }

  deleteLastMoves(topic:string,amount:number){
    let items = this.activeConversation[topic]
    let length = items.length
    for(let i=1;i<=amount;i++){
      let id = items[length-i].id;
      if(items[length-i].doc_id){
        id = items[length-i].doc_id;
      }
      this.firestoreService.deleteSubSub('users', this.auth.userInfo.uid, 'conversations', this.activeConversation.conversationId, topic, id)
    }
  }

  async closeConversationWithoutEvaluation(callback:Function) {
    this.toast.showLoader(this.translate.instant('conversation.closing_conversation'))
    this.firestoreService.updateSub('users', this.auth.userInfo.uid, 'conversations', this.activeConversation.conversationId, {closed: new Date().getTime()}).then(()=>{
      this.toast.hideLoader()
      callback()
    })
  }
  
  
  async closeConversation(callback:Function) {
    this.analysisReady.emit(false)
    this.startLoading('close')
    this.startLoading('skills')
    // console.log(obj)

    let objSkills:any = {
      conversationId:this.activeConversation.conversationId,
      userId:this.auth.userInfo.uid,
      userEmail:this.auth.userInfo.email,
      training:{
        trainerId: this.activeConversation.trainerId,
        trainingId: this.activeConversation.trainingId,
      },
      instructionType:'skills',
      categoryId:this.caseItem.conversation || this.activeConversation.conversationType,
    }
    const responseSkills = fetch("https://europe-west1-lwai-3bac8.cloudfunctions.net/skillsGemini", {
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
        trainerId: this.activeConversation.trainerId,
        trainingId: this.activeConversation.trainingId,
      },
      instructionType:'close',
      categoryId:this.caseItem.conversation || this.activeConversation.conversationType,
    }
    console.log(this.activeConversation)
    console.log(obj)
    const response = await fetch("https://europe-west1-lwai-3bac8.cloudfunctions.net/closingGemini", {
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

  closeConversationAfterGoal(){
    if(!this.activeConversation.close_after_goals){
      return
    }
    let check = true
    console.log('accomplishments',this.activeConversation.accomplishments)
    for(let key in this.activeConversation.close_after_goals){
      if(!this.activeConversation.close_after_goals[key]){
        continue;
      }
      if(!this.activeConversation.accomplishments || !this.activeConversation.accomplishments.includes(key)){
        check = false
      }
    }

    for(let i=0;i<this.activeConversation.close_after_goals.length;i++){
      if(!this.activeConversation.accomplishments || (this.activeConversation.close_after_goals[i] && !this.activeConversation.accomplishments.includes(this.activeConversation.close_after_goals[i]))){
        check = false
      }
    }
    console.log('check all goals',check)
    if(check){
      // this.closeConversation(() => {
        this.record.playSound('achievement');
        console.log('All goals accomplished, closing conversation');
        // this.update.emit(true);
      // });
    }
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
          this.activeConversation.accomplishments.push('attitude')
          this.record.playSound('achievement')
          console.log('attitude goal accomplished')
          this.closeConversationAfterGoal()
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
              trainerId: this.activeConversation.trainerId,
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
    
    // console.log(this.activeConversation)
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
        doc.messages[i].feedbackCipher = this.getFeedbackChat(i+1,'feedbackCipher',doc.messages[i].id)
        doc.messages[i].feedback = this.getFeedbackChat(i+1,'feedback',doc.messages[i].id)
      }
      else if(doc.messages[i].role == 'assistant'){
        doc.messages[i].role = 'Gesprekspartner'
        doc.messages[i].attitude = this.infoService.getAttitude(this.getAttitude(i+1)).title
        doc.messages[i].content = this.cleanReactionPipe.transform(doc.messages[i].content)
        doc.messages[i].content = this.formatAiTextPipe.transform(doc.messages[i].content)
      }
    } 

    if(this.activeConversation?.goalsItems?.free){
      doc.goal = this.activeConversation.goalsItems.free
    }
    if(this.activeConversation?.free_question || this.activeConversation?.free_question2 || this.activeConversation?.free_question3 || this.activeConversation?.free_question4){
      doc.free_question = this.activeConversation.free_question || '';
      doc.free_question2 = this.activeConversation.free_question2 || '';
      doc.free_question3 = this.activeConversation.free_question3 || '';
      doc.free_question4 = this.activeConversation.free_question4 || '';
      doc.free_answer = this.activeConversation.free_answer || '';
      doc.free_answer2 = this.activeConversation.free_answer2 || '';
      doc.free_answer3 = this.activeConversation.free_answer3 || '';
      doc.free_answer4 = this.activeConversation.free_answer4 || '';
    }



    this.printDoc = doc
    // console.log(doc)

    let countPages = 1


    let pdf = new jsPDF('p', 'pt', 'a4');

    pdf.addFont("./assets/fonts/PlusJakartaSans-Regular.ttf", "PlusJakartaSans", "normal");
    pdf.addFont("./assets/fonts/PlusJakartaSans-Bold.ttf", "PlusJakartaSans", "bold");
    pdf.setCharSpace(0.5);

    
    let pageHeight = pdf.internal.pageSize.height;
    let pageWidth = pdf.internal.pageSize.width;
    let margin = 72;
    let y = margin;
    let x = margin;
    pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
    
    pdf.addImage('./assets/img/logo_full_black.png', 'PNG', x+35, y, 136*2.5, 30*2.5);
    y += 150;

    pdf.setFontSize(24);
    pdf.setFont('PlusJakartaSans','bold');
    let title = pdf.splitTextToSize(doc.title, pageWidth - margin * 2);
    pdf.text(title, x, y);
    y += title.length * 24 + 20;
    // y += 30;

    pdf.setFontSize(20);
    pdf.setFont('PlusJakartaSans','normal');
    pdf.text(this.translate.instant('conversation.pdf.title_name') + ' ' + doc.user, x, y);
    y += 30;
    pdf.setFontSize(12);
    pdf.text(doc.date, x, y);

    if(doc.goal && !this.activeConversation?.hide?.goal){
      y += 50;
      pdf.setFontSize(14);
      pdf.setFont('PlusJakartaSans','bold');
      pdf.text(this.translate.instant('conversation.goal')+':', x, y);
      y += 20;
      pdf.setFontSize(12);
      pdf.setFont('PlusJakartaSans','normal');
      //doc.goal moet passen in de breedte van de pagina
      let textLines = pdf.splitTextToSize(doc.goal.substring(0,300) + (doc.goal.length>300 ? '...' : ''), pageWidth - margin * 2);
      pdf.text(textLines, x, y);
      y += textLines.length * 14 + 10; // Adjust y position based on the number of lines
    }

    if(doc.free_question || doc.free_question2 || doc.free_question3 || doc.free_question4){

      // y += 40;
      // pdf.setFontSize(14);
      // pdf.setFont('PlusJakartaSans','bold');
      // pdf.text(this.translate.instant('conversation.free_questions').toUpperCase()+':', x, y);
      // y += 20;

      if(doc.free_question && doc.free_answer){
        pdf.setFontSize(14);
        pdf.setFont('PlusJakartaSans','bold');
        let textLines = pdf.splitTextToSize(doc.free_question, pageWidth - margin * 2);
        pdf.text(textLines, x, y);
        y += textLines.length * 14 + 10; // Adjust y position based on the number of lines
        pdf.setFontSize(12);
        pdf.setFont('PlusJakartaSans','normal');
        textLines = pdf.splitTextToSize(doc.free_answer.substring(0,300) + (doc.free_answer.length>300 ? '...' : ''), pageWidth - margin * 2);
        pdf.text(textLines, x, y);
        y += textLines.length * 12 + 20; // Adjust y position based on the number of lines
      }
      if(doc.free_question2 && doc.free_answer2){
        pdf.setFontSize(14);
        pdf.setFont('PlusJakartaSans','bold');
        let textLines = pdf.splitTextToSize(doc.free_question2, pageWidth - margin * 2);
        pdf.text(textLines, x, y);
        y += textLines.length * 14 + 10; // Adjust y position based on the number of lines
        pdf.setFontSize(12);
        pdf.setFont('PlusJakartaSans','normal');
        textLines = pdf.splitTextToSize(doc.free_answer2.substring(0,300) + (doc.free_answer2.length>300 ? '...' : ''), pageWidth - margin * 2);
        pdf.text(textLines, x, y);
        y += textLines.length * 12 + 20; // Adjust y position based on the number of lines
      }
      if(doc.free_question3 && doc.free_answer3){
        pdf.setFontSize(14);
        pdf.setFont('PlusJakartaSans','bold');
        let textLines = pdf.splitTextToSize(doc.free_question3, pageWidth - margin * 2);
        pdf.text(textLines, x, y);
        y += textLines.length * 14 + 10; // Adjust y position based on the number of lines
        pdf.setFontSize(12);
        pdf.setFont('PlusJakartaSans','normal');
        textLines = pdf.splitTextToSize(doc.free_answer3.substring(0,300) + (doc.free_answer3.length>300 ? '...' : ''), pageWidth - margin * 2);
        pdf.text(textLines, x, y);
        y += textLines.length * 12 + 20; // Adjust y position based on the number of lines
      }
      if(doc.free_question4 && doc.free_answer4){
        pdf.setFontSize(14);
        pdf.setFont('PlusJakartaSans','bold');
        let textLines = pdf.splitTextToSize(doc.free_question4, pageWidth - margin * 2);
        pdf.text(textLines, x, y);
        y += textLines.length * 14 + 10; // Adjust y position based on the number of lines
        pdf.setFontSize(12);
        pdf.setFont('PlusJakartaSans','normal');
        textLines = pdf.splitTextToSize(doc.free_answer4.substring(0,300) + (doc.free_answer4.length>300 ? '...' : ''), pageWidth - margin * 2);
        pdf.text(textLines, x, y);
        y += textLines.length * 12 + 20; // Adjust y position based on the number of lines
      }
      
    }

    pdf.addPage();
    pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
    pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
    countPages++;
    y = 55;
    pdf.setFontSize(20);
    pdf.setFont('PlusJakartaSans','bold');
    pdf.text(this.translate.instant('conversation.pdf.disclaimer').toUpperCase()+':', x, y);
    pdf.setFontSize(12);
    pdf.setFont('PlusJakartaSans','normal');
    y += 35;
    
    pdf.line(x-margin, y, pageWidth, y); // Draw line
    y += 40;

    pdf.setFontSize(12);
    pdf.setFont('PlusJakartaSans','bold');
    pdf.text(this.translate.instant('conversation.pdf.disclaimer_title')+':', x, y);
    y += 20;
    pdf.setFont('PlusJakartaSans','normal');
    let textLines = pdf.splitTextToSize(this.translate.instant('conversation.pdf.disclaimer_text'), pageWidth - margin * 2);
    pdf.text(textLines, x, y);





    pdf.addPage();
    pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
    pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
    countPages++;
    y = 55;
    pdf.setFontSize(20);
    pdf.setFont('PlusJakartaSans','bold');
    pdf.text(this.translate.instant('conversation.pdf.conversation').toUpperCase()+':', x, y);
    pdf.setFontSize(12);
    pdf.setFont('PlusJakartaSans','normal');
    y += 35;
    
    pdf.line(x-margin, y, pageWidth, y); // Draw line
    y += 40;
    // pdf.setFontSize(12);
    //  pdf.setFont('PlusJakartaSans','bold');
 

    for (let i = 0; i < doc.messages.length; i++) {
      const msg = doc.messages[i];

      // Set gemeenschappelijke instellingen
      pdf.setFontSize(12);
      const lineHeight = pdf.getLineHeight();
      const maxWidth = (pageWidth - margin * 2)// * 0.75;

      if (msg.role === 'Gesprekspartner') {

        pdf.setTextColor(0);
        pdf.setFont('PlusJakartaSans','bold');
        pdf.setFontSize(13);
        

        let answerLabel = this.translate.instant('conversation.pdf.answer').toUpperCase() + ':';
        if (y + lineHeight > pageHeight - margin) {
          pdf.addPage();
          pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
          pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
          countPages++;
          y = 55;
          pdf.setFontSize(20);
          pdf.setFont('PlusJakartaSans','bold');
          pdf.text(this.translate.instant('conversation.pdf.conversation').toUpperCase()+':', x, y);
          pdf.setFontSize(12);
          pdf.setFont('PlusJakartaSans','normal');
          y += 35;
          
          pdf.line(x-margin, y, pageWidth, y); // Draw line
          y += 40;
        }
        pdf.setFont('PlusJakartaSans','bold');
        pdf.text(answerLabel, x, y);
        y += 15;
        
        pdf.setFont('PlusJakartaSans','normal');
        pdf.setFontSize(12);

        let textLines = pdf.splitTextToSize(msg.content, maxWidth);

        for (let j = 0; j < textLines.length; j++) {
          if (y + lineHeight > pageHeight - margin) {
            pdf.addPage();
            pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
            pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
            countPages++;
            y = 55;
            pdf.setFontSize(20);
            pdf.setFont('PlusJakartaSans','bold');
            pdf.text(this.translate.instant('conversation.pdf.conversation').toUpperCase()+':', x, y);
            pdf.setFontSize(12);
            pdf.setFont('PlusJakartaSans','normal');
            y += 35;
            
            pdf.line(x-margin, y, pageWidth, y); // Draw line
            y += 40;
          }
          // pdf.setDrawColor(32, 66, 137);
          // pdf.setLineWidth(1);
          // pdf.setFillColor(255, 255, 255);
          // pdf.setTextColor(32, 66, 137);

          // if (j === 0) {
          //   let totalHeight = lineHeight * textLines.length + 20;
          //   pdf.roundedRect(x - 5, y - 10, maxWidth + 10, totalHeight, 8, 8, 'FD');
          // }

          pdf.text(textLines[j], x, y);
          y += lineHeight;
        }
        y += 30;

        // Attitude label
        if(!this.activeConversation?.hide?.attitude){
          pdf.setFont('PlusJakartaSans','bold');
          pdf.setFontSize(13);
          let attLabel = this.translate.instant('conversation.pdf.attitude').toUpperCase() + ':';
          if (y + lineHeight > pageHeight - margin) {
            pdf.addPage();
            pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
            pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
            countPages++;
            y = 55;
            pdf.setFontSize(20);
            pdf.setFont('PlusJakartaSans','bold');
            pdf.text(this.translate.instant('conversation.pdf.conversation').toUpperCase()+':', x, y);
            pdf.setFontSize(12);
            pdf.setFont('PlusJakartaSans','normal');
            y += 35;
            
            pdf.line(x-margin, y, pageWidth, y); // Draw line
            y += 40;
          }
          pdf.setTextColor(0);
          pdf.setFont('PlusJakartaSans','bold');
          pdf.text(attLabel, x, y);

          pdf.setFont('PlusJakartaSans','normal');
          pdf.setFontSize(12);
          y = y + 15;
          pdf.text(msg.attitude, x, y);
          
          y += 30;
        }

        if (y + lineHeight > pageHeight - margin) {
          pdf.addPage();
          pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
          pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
          countPages++;
          y = 55;
          pdf.setFontSize(20);
          pdf.setFont('PlusJakartaSans','bold');
          pdf.text(this.translate.instant('conversation.pdf.conversation').toUpperCase()+':', x, y);
          pdf.setFontSize(12);
          pdf.setFont('PlusJakartaSans','normal');
          y += 35;
          
          pdf.line(x-margin, y, pageWidth, y); // Draw line
          y += 40;
        }

        pdf.line(x, y, pageWidth - margin, y); // Draw line
        y += 30;

      } else if (msg.role === this.auth.userInfo.displayName) {
        // const boxWidth = maxWidth;
        // const boxX = x // pageWidth - margin// - boxWidth;

        pdf.setTextColor(0);
        pdf.setFont('PlusJakartaSans','bold');
        pdf.setFontSize(13);

        let userLabel = this.translate.instant('conversation.pdf.user_input').toUpperCase() + ':';
        if (y + lineHeight > pageHeight - margin) {
          pdf.addPage();
          pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
          pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
          countPages++;
          y = 55;
          pdf.setFontSize(20);
          pdf.setFont('PlusJakartaSans','bold');
          pdf.text(this.translate.instant('conversation.pdf.conversation').toUpperCase()+':', x, y);
          pdf.setFontSize(12);
          pdf.setFont('PlusJakartaSans','normal');
          y += 35;
          
          pdf.line(x-margin, y, pageWidth, y); // Draw line
          y += 40;
        }
        pdf.setFont('PlusJakartaSans','bold');
        pdf.text(userLabel, x, y);
        y += 15;

        pdf.setFont('PlusJakartaSans','normal');
        pdf.setFontSize(12);

        // content
        let contentLines = pdf.splitTextToSize(msg.content, maxWidth);
        // pdf.setDrawColor(32, 66, 137);
        // pdf.setLineWidth(1);
        // pdf.setFillColor(116, 150, 223);
        // pdf.setTextColor(255);
        pdf.setFont('PlusJakartaSans','normal');

        for (let j = 0; j < contentLines.length; j++) {
          if (y + lineHeight + 15 > pageHeight - margin) {
            pdf.addPage();
            pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
            pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
            countPages++;
            y = 55;
            pdf.setFontSize(20);
            pdf.setFont('PlusJakartaSans','bold');
            pdf.text(this.translate.instant('conversation.pdf.conversation').toUpperCase()+':', x, y);
            pdf.setFontSize(12);
            pdf.setFont('PlusJakartaSans','normal');
            y += 35;
            
            pdf.line(x-margin, y, pageWidth, y); // Draw line
            y += 40;
          }
          // if (j === 0) {
          //   let totalHeight = lineHeight * contentLines.length + 20;
          //   pdf.roundedRect(x - 5, y - 10, maxWidth + 10, totalHeight, 8, 8, 'FD');
          // }
          pdf.text(contentLines[j], x, y);
          y += lineHeight;
          
        }

        y += 30;

        // feedbackCipher
        pdf.setTextColor(0);
        pdf.setFont('PlusJakartaSans','bold');
        pdf.setFontSize(13);

        let cipherLabel = this.translate.instant('conversation.pdf.cipher').toUpperCase() + ':';
        if (y + lineHeight > pageHeight - margin) {
          pdf.addPage();
          pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
          pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
          countPages++;
          y = 55;
          pdf.setFontSize(20);
          pdf.setFont('PlusJakartaSans','bold');
          pdf.text(this.translate.instant('conversation.pdf.conversation').toUpperCase()+':', x, y);
          pdf.setFontSize(12);
          pdf.setFont('PlusJakartaSans','normal');
          y += 35;
          
          pdf.line(x-margin, y, pageWidth, y); // Draw line
          y += 40;
        }
        if(!this.activeConversation?.hide?.feedbackCipher){
          pdf.setFont('PlusJakartaSans','bold');
          pdf.text(cipherLabel, x, y);
          pdf.setFont('PlusJakartaSans','normal');
          pdf.setFontSize(12);
          y += 15;
          console.log(msg)
          if(msg.feedbackCipher){
            pdf.text(msg.feedbackCipher+'', x, y);
          }
          y += 30;
        }


        // feedback
        if(!this.activeConversation?.hide?.feedback){
          pdf.setFont('PlusJakartaSans','bold');
          pdf.setFontSize(13);

          let feedbackLabel = this.translate.instant('conversation.pdf.feedback').toUpperCase() + ':';
          if (y + lineHeight > pageHeight - margin) {
            pdf.addPage();
            pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
            pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
            countPages++;
            y = 55;
            pdf.setFontSize(20);
            pdf.setFont('PlusJakartaSans','bold');
            pdf.text(this.translate.instant('conversation.pdf.conversation').toUpperCase()+':', x, y);
            pdf.setFontSize(12);
            pdf.setFont('PlusJakartaSans','normal');
            y += 35;
            
            pdf.line(x-margin, y, pageWidth, y); // Draw line
            y += 40;
          }
          pdf.setFont('PlusJakartaSans','bold');
          pdf.text(feedbackLabel, x, y);
          y += 15;
          pdf.setFont('PlusJakartaSans','normal');
          pdf.setFontSize(12);

          let feedbackLines = []
          if(msg.feedback){
            feedbackLines = pdf.splitTextToSize(msg.feedback, maxWidth);
          } else {
            feedbackLines = [];
          }
          // pdf.splitTextToSize(msg.feedback, maxWidth);

          for (let j = 0; j < feedbackLines.length; j++) {
            if (y + lineHeight > pageHeight - margin) {
              pdf.addPage();
              pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
              pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
              countPages++;
              y = 55;
              pdf.setFontSize(20);
              pdf.setFont('PlusJakartaSans','bold');
              pdf.text(this.translate.instant('conversation.pdf.conversation').toUpperCase()+':', x, y);
              pdf.setFontSize(12);
              pdf.setFont('PlusJakartaSans','normal');
              y += 35;
              
              pdf.line(x-margin, y, pageWidth, y); // Draw line
              y += 40;
            }
            pdf.text(feedbackLines[j], x, y);
            y += lineHeight;
          }

          y += 30;
        }


      }
    }

    if (doc.close) {

      pdf.addPage();
      pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
      pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
      countPages++;
      y = 55;
      pdf.setFontSize(20);
      pdf.setFont('PlusJakartaSans','bold');
      pdf.text(this.translate.instant('conversation.pdf.evaluation').toUpperCase()+':', x, y);
      pdf.setFontSize(12);
      pdf.setFont('PlusJakartaSans','normal');
      y += 35;
      
      pdf.line(x-margin, y, pageWidth, y); // Draw line
      y += 40;

      // pdf.setFontSize(20);
      // pdf.text(this.translate.instant('conversation.pdf.evaluation'), x, y);

      // y += 30;
      pdf.setFontSize(12);


      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(doc.close, 'text/html');
      const containerDiv = htmlDoc.body.firstElementChild;
      const bodyNodes = containerDiv ? Array.from(containerDiv.childNodes) : [];
      const maxWidth = (pageWidth - margin * 2);
      const contentWidth = maxWidth // pageWidth - margin * 2;

      const renderText = (text: string, fontSize: number, fontStyle: string = '', indent = 0) => {
        if(!fontStyle){
          fontStyle = 'normal';
        }
        const lines = pdf.splitTextToSize(text, contentWidth - indent);
        pdf.setFont('PlusJakartaSans', fontStyle);
        pdf.setFontSize(fontSize);
        pdf.setTextColor(0);
        for (const line of lines) {
          if (y + pdf.getLineHeight() > pageHeight - margin) {
            pdf.addPage();
            pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
            pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
            countPages++;
            y = 55;
            pdf.setFontSize(20);
            pdf.setFont('PlusJakartaSans','bold');
            pdf.text(this.translate.instant('conversation.pdf.evaluation').toUpperCase()+':', x, y);
            pdf.setFontSize(12);
            pdf.setFont('PlusJakartaSans','normal');
            y += 35;
            
            pdf.line(x-margin, y, pageWidth, y); // Draw line
            y += 40;
          }
          pdf.text(line, x + indent, y);
          y += pdf.getLineHeight();
        }
      };

      const renderInlineText = (el: HTMLElement): string => {
        let result = '';
        el.childNodes.forEach(node => {
          if (node.nodeType === 3) {
            result += node.textContent;
          } else if (node.nodeType === 1 && (node as HTMLElement).tagName.toLowerCase() === 'strong') {
            result += '**' + (node.textContent || '') + '**'; // tijdelijk markeren
          } else if (node.nodeType === 1) {
            result += node.textContent || '';
          }
        });
        return result;
      };

      for (const node of bodyNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el:any = node as HTMLElement;
          const tag = el.tagName.toLowerCase();

          let fontSize = 12;
          let fontStyle = '';

          switch (tag) {
            case 'h3':
              fontStyle = 'bold';
              pdf.setFont('PlusJakartaSans', 'bold');
              pdf.setFontSize(13);
              renderText(el.textContent.toUpperCase() || '', fontSize, fontStyle);
              y += 10;
              break;
            case 'h4':
              fontStyle = 'bold';
              pdf.setFont('PlusJakartaSans', 'bold');
              pdf.setFontSize(13);
              renderText(el.textContent.toUpperCase() || '', fontSize, fontStyle);
              y += 10;
              break;
            case 'p':
              pdf.setFont('PlusJakartaSans', 'normal');
              renderText(el.textContent || '', 12, '');
              y += 15;
              break;
            case 'ul':
              const items = Array.from(el.querySelectorAll('li'));
              for (const li of items) {
                let fullText = renderInlineText(li as HTMLElement);
                // converteer tijdelijk gemarkeerde **tekst** naar splitsbaar
                const chunks = fullText.split(/(\*\*[^*]+\*\*)/g).filter(s => s.length > 0);

                let line = '• ';
                pdf.setFontSize(12);

                for (const chunk of chunks) {
                  if (chunk.startsWith('**') && chunk.endsWith('**')) {
                    const clean = chunk.replace(/\*\*/g, '');
                    pdf.setFont('PlusJakartaSans','bold');
                    const lines = pdf.splitTextToSize(clean, pageWidth - margin * 2 - 15);
                    for (const l of lines) {
                      if (y + pdf.getLineHeight() > pageHeight - margin) {
                        pdf.addPage();
                        pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
                        pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
                        countPages++;
                        y = 55;
                        pdf.setFontSize(20);
                        pdf.setFont('PlusJakartaSans','bold');
                        pdf.text(this.translate.instant('conversation.pdf.evaluation').toUpperCase()+':', x, y);
                        pdf.setFontSize(12);
                        pdf.setFont('PlusJakartaSans','normal');
                        y += 35;
                        
                        pdf.line(x-margin, y, pageWidth, y); // Draw line
                        y += 40;
                      }
                      pdf.text(line + l, x + 10, y);
                      line = ''; // alleen bij eerste regel bullet
                      y += pdf.getLineHeight();
                    }
                  } else {
                    pdf.setFont('PlusJakartaSans','normal');
                    const lines = pdf.splitTextToSize(chunk, pageWidth - margin * 2 - 15);
                    for (const l of lines) {
                      if (y + pdf.getLineHeight() > pageHeight - margin) {
                        pdf.addPage();
                        pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
                        pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
                        countPages++;
                        y = 55;
                        pdf.setFontSize(20);
                        pdf.setFont('PlusJakartaSans','bold');
                        pdf.text(this.translate.instant('conversation.pdf.evaluation').toUpperCase()+':', x, y);
                        pdf.setFontSize(12);
                        pdf.setFont('PlusJakartaSans','normal');
                        y += 35;
                        
                        pdf.line(x-margin, y, pageWidth, y); // Draw line
                        y += 40;
                      }
                      pdf.text(line + l, x + 10, y);
                      line = '';
                      y += pdf.getLineHeight();
                    }
                  }
                }

                y += 5;
              }
              y += 5;
              break;
            case 'ol':
              const li_items = Array.from(el.querySelectorAll('li'));
              let count_li = 0;
              y += 10;
              for (const li of li_items) {
                let fullText = renderInlineText(li as HTMLElement);
                // converteer tijdelijk gemarkeerde **tekst** naar splitsbaar
                const chunks = fullText.split(/(\*\*[^*]+\*\*)/g).filter(s => s.length > 0);
                count_li++;
                let line = count_li+'. ';
                pdf.setFontSize(12);

                for (const chunk of chunks) {
                  if (chunk.startsWith('**') && chunk.endsWith('**')) {
                    const clean = chunk.replace(/\*\*/g, '');
                    pdf.setFont('PlusJakartaSans','bold');
                    pdf.setFontSize(13);
                    const lines = pdf.splitTextToSize(clean, pageWidth - margin * 2 - 15);
                    for (const l of lines) {
                      if (y + pdf.getLineHeight() > pageHeight - margin) {
                        pdf.addPage();
                        pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
                        pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
                        countPages++;
                        y = 55;
                        pdf.setFontSize(20);
                        pdf.setFont('PlusJakartaSans','bold');
                        pdf.text(this.translate.instant('conversation.pdf.evaluation').toUpperCase()+':', x, y);
                        pdf.setFontSize(12);
                        pdf.setFont('PlusJakartaSans','normal');
                        y += 35;
                        
                        pdf.line(x-margin, y, pageWidth, y); // Draw line
                        y += 40;
                      }
                      pdf.text(line + l, x + 10, y);
                      line = ''; // alleen bij eerste regel bullet
                      y += pdf.getLineHeight();
                    }
                  } else {
                    pdf.setFont('PlusJakartaSans','normal');
                    pdf.setFontSize(12);
                    const lines = pdf.splitTextToSize(chunk, pageWidth - margin * 2 - 15);
                    for (const l of lines) {
                      if (y + pdf.getLineHeight() > pageHeight - margin) {
                        pdf.addPage();
                        pdf.addImage('./assets/img/alicia_background.png', 'PNG', 0, 0, pageWidth, pageHeight);
                        pdf.addImage('./assets/icon/logo_single_black.png', 'PNG', pageWidth - 80, 20, 60, 60);
                        countPages++;
                        y = 55;
                        pdf.setFontSize(20);
                        pdf.setFont('PlusJakartaSans','bold');
                        pdf.text(this.translate.instant('conversation.pdf.evaluation').toUpperCase()+':', x, y);
                        pdf.setFontSize(12);
                        pdf.setFont('PlusJakartaSans','normal');
                        y += 35;
                        
                        pdf.line(x-margin, y, pageWidth, y); // Draw line
                        y += 40;
                      }
                      pdf.text(line + l, x + 10, y);
                      line = '';
                      y += pdf.getLineHeight();
                    }
                  }
                }

                y += 10;
              }
              y += 20;
              break;
            
            default:
              renderText(el.textContent || '', 12, '');
              y += 10;
              break;
          }

        } else if (node.nodeType === Node.TEXT_NODE) {
          const text = (node.textContent || '').trim();
          if (text.length > 0) {
            pdf.setFontSize(12);
            pdf.setFont('PlusJakartaSans','normal');
            renderText(text, 12, '');
            y += 10;
          }
        }
      }

      setTimeout(() => {
        pdf.save(this.translate.instant('conversation.pdf.document_name'));
        this.toast.hideLoader();
        this.toast.show(this.translate.instant('conversation.pdf.ready'));
      }, 500);
    }



    // if(doc.close){
    //   let htmlContent = doc.close;


    //   const tempDiv = document.createElement("div");
    //   tempDiv.style.width = "600px"; // Zorg dat de breedte overeenkomt met een standaard vensterbreedte
    //   tempDiv.innerHTML = htmlContent;
    //   document.body.appendChild(tempDiv);

    //   // Ga naar de laatste pagina of voeg een nieuwe pagina toe
    //   const currentPage = pdf.getCurrentPageInfo().pageNumber;
    //   const totalPages = pdf.getNumberOfPages();

    //   if (currentPage !== totalPages) {
    //     pdf.setPage(totalPages); // Ga naar de laatste pagina
    //   }

    //   // pdf.addPage(); // Voeg een nieuwe pagina toe aan het einde

    //   // Render de HTML op de nieuwe pagina
    //   pdf.html(tempDiv, {
    //     callback: (doc) => {
    //       // Sla de PDF op na het toevoegen van de HTML
    //       setTimeout(() => {
    //         doc.save('gespreksverslag.pdf');   
    //         this.toast.hideLoader()
    //         this.toast.show('Het document is gegenereerd en wordt gedownload.')   
    //       }, 1000);
    //     },
    //     x: 50, // Marges
    //     y: ((countPages-1) * pageHeight) + 80, // Voeg de hoogte van de vorige pagina's toe
    //     width: 100, // Schaal de inhoud naar de beschikbare breedte van een A4-pagina
    //     html2canvas: {
    //       scale: 0.8, // Verhoog de schaal om de inhoud leesbaarder te maken
    //     },
    //     autoPaging: true, // Zorg ervoor dat lange inhoud wordt opgesplitst over meerdere pagina's
    //   });

    //   // Verwijder het tijdelijke element
    //   document.body.removeChild(tempDiv);
    // }
    else{
      setTimeout(() => {
        pdf.save(this.translate.instant('conversation.pdf.document_name'));
        this.toast.hideLoader()
        this.toast.show(this.translate.instant('conversation.pdf.ready'))
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
