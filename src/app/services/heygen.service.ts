import { Injectable } from '@angular/core';
import StreamingAvatar, { AvatarQuality, StreamingEvents, TaskType } from '@heygen/streaming-avatar';
import axios from 'axios';

@Injectable({
  providedIn: 'root',
})
export class HeyGenApiService {
  private token_url = 'https://getheygentoken-p2qcpa6ahq-ew.a.run.app';
  public textToSpeak: string = '';
  private accessToken: string = '';
  private sessionId: string = '';
  public streamingAvatar: any;
  streamIsActive:boolean = false;
  constructor() {}

  async initializeAvatar(avatarName: string,video_id:string,callback?:Function) {
    console.log('initializeAvatar');
    try {
      // Vraag token aan via Firebase Function
      const tokenResponse = await axios.get(this.token_url);
      this.accessToken = tokenResponse.data.token;

      this.streamingAvatar = new StreamingAvatar({ token: this.accessToken });

      this.streamingAvatar.on(StreamingEvents.STREAM_READY, (event: any) => {
        console.log('Stream ready', event);
        const videoElement = document.getElementById(video_id) as HTMLVideoElement;
        videoElement.srcObject = event.detail;
        const streamInterval = setInterval(() => {
          console.log('checking stream')
          if(this.streamingAvatar.mediaStream.active){
            clearInterval(streamInterval)
            this.monitorMediaStream(this.streamingAvatar.mediaStream);
          }
        },300)
        if(callback){
          callback()
        }
      });

      await this.streamingAvatar.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: avatarName,
      });
      
    } catch (error) {
      console.error('Error initializing avatar:', error);
    }
  }

  monitorMediaStream(stream: MediaStream) {
    console.log(stream);
    // Controleer de initiële status
    console.log('MediaStream is active:', stream.active);
  
    // Luister naar de 'active' event
    stream.addEventListener('active', () => {
      console.log('MediaStream became active.');
      this.streamIsActive = true;
      console.log(this.streamIsActive)
      // Voer hier je logica uit als de stream actief wordt
    });
  
    // Luister naar de 'inactive' event
    stream.addEventListener('inactive', () => {
      console.log('MediaStream became inactive.');
      this.streamIsActive = false;
      console.log(this.streamIsActive)
      // Voer hier je logica uit als de stream inactief wordt
    });
  }

  async speakText(text: string) {
    // console.log(this.streamingAvatar);
    if (this.streamingAvatar?.mediaStream?.active&&text.trim()) {
      await this.streamingAvatar.speak({ text: text, sessionId: this.sessionId,task_type: TaskType.REPEAT }).then((response: any) => {
        // console.log('speakText response:', response);
      })
      // this.textToSpeak = ''; // Reset inputveld
    } else {
      // alert('Typ een tekst in.');
    }
  }

  async disconnect(video_id:string) {
    if (this.streamingAvatar) {
      await this.streamingAvatar.stopAvatar({ stopSessionRequest: { sessionId: this.sessionId } });
      const videoElement = document.getElementById(video_id) as HTMLVideoElement;
      videoElement.srcObject = null;
    }
  }
}