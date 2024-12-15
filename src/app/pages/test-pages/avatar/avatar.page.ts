import { Component } from '@angular/core';
import StreamingAvatar, { AvatarQuality, StreamingEvents, TaskType } from '@heygen/streaming-avatar';
import axios from 'axios';

@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.page.html',
  styleUrls: ['./avatar.page.scss'],
})
export class AvatarPage {
  public textToSpeak: string = '';
  private accessToken: string = '';
  private sessionId: string = '';
  public streamingAvatar: any;

  // @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  async initializeAvatar() {
    console.log('initializeAvatar');
    try {
      // Vraag token aan via Firebase Function
      const tokenResponse = await axios.get('https://getheygentoken-p2qcpa6ahq-ew.a.run.app');
      this.accessToken = tokenResponse.data.token;

      console.log('Token:', tokenResponse);

      this.streamingAvatar = new StreamingAvatar({ token: this.accessToken });

      this.streamingAvatar.on(StreamingEvents.STREAM_READY, (event: any) => {
        console.log('Stream ready', event);
        const videoElement = document.getElementById('videoElement') as HTMLVideoElement;
        console.log(videoElement)
        videoElement.srcObject = event.detail;
      });

      await this.streamingAvatar.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: 'Santa_Fireplace_Front_public',
      });

    } catch (error) {
      console.error('Error initializing avatar:', error);
    }
  }

  async speakText() {
    if (this.textToSpeak.trim()) {
      await this.streamingAvatar.speak({ text: this.textToSpeak, sessionId: this.sessionId,task_type: TaskType.REPEAT });
      this.textToSpeak = ''; // Reset inputveld
    } else {
      alert('Typ een tekst in.');
    }
  }

  async disconnect() {
    if (this.streamingAvatar) {
      await this.streamingAvatar.stopAvatar({ stopSessionRequest: { sessionId: this.sessionId } });
      const videoElement = document.getElementById('videoElement') as HTMLVideoElement;
      videoElement.srcObject = null;
    }
  }


}
