import { Injectable } from '@angular/core';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RecordService {
  recording: boolean = false;
  stream: MediaStream | null = null;
  analyzing: boolean = false;
  constructor(
    private auth:AuthService,
  ) { }

  async startRecording(type:string,conversationId:string,callback:Function) {
    if(type === 'audioToText'){
      this.recording = true;
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(this.stream);
    
      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
    
      mediaRecorder.start();
    
      // Stop de opname na een bepaalde tijd of via een gebruikersactie
      setTimeout(() => mediaRecorder.stop(), 60000);
    
      mediaRecorder.onstop = () => {
        this.recording = false;
        this.analyzing = true;
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        // this.playRecording(audioBlob);
        // console.log('Audio Blob:', audioBlob);
        // get audio length in seconds
        // const audioLength = audioBlob.size / 16000;

        this.uploadAudio(audioBlob,conversationId,callback);
      };
    }
  }

  stopRecording(callback?:Function) {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    this.recording = false;
    if(callback){
      callback();
    }
  }

  playRecording(audioBlob: Blob) {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
  }

  async uploadAudio(audioBlob: Blob,conversationId:string,callback:Function) {
    // console.log('Uploading audio...');

    const fileReader = new FileReader();

  fileReader.onloadend = async () => {
    const base64data = fileReader.result?.toString().split(",")[1];

    const payload = {
      userId: this.auth.userInfo.uid,
      conversationId: conversationId,
      file: base64data,
    };
    // console.log("Payload:", payload);
    const response = await fetch("https://soundtotextai-p2qcpa6ahq-ew.a.run.app", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    // console.log("Response:", result);
    this.analyzing = false;
    if(result.transcription){
      callback(result.transcription);
    }
    else{
      callback(null);
    }
  };

  fileReader.readAsDataURL(audioBlob);


    // const headers = new Headers();

    // const formData = new FormData();
    // formData.append('file', new File([audioBlob], 'audio.webm', { type: 'audio/webm' }));
    // formData.append('userId', this.auth.userInfo.uid);
    
    // let url = 'https://soundtotextai-p2qcpa6ahq-ew.a.run.app/';

    // if(!url){
    //   console.error('No url found')
    //   return;
    // }

    // formData.forEach((value, key) => {
    //   console.log(`${key}:`, value);
    // });

    // const response = await fetch(url, {
    //   method: 'POST',
    //   body: formData, // Stuur multipart/form-data
    // });
  
    // if (!response.ok) {
    //   console.error('Request failed:', response.status, response.statusText);
    //   return;
    // }
  
    // const result = await response.json();
    // console.log('Transcription:', result);


    // const response = await fetch(url, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify(obj),
    // });
    // if (!response.ok) {
    //   console.error("Request failed:", response.status, response.statusText);
    //   return;
    // }
    // console.log(response)


  
    // this.http.post('https://your-firebase-function-url/whisper', formData).subscribe({
    //   next: (response: any) => {
    //     console.log('Transcription:', response.transcription);
    //   },
    //   error: (err) => console.error('Error:', err),
    // });
  }

  // async openai_extra_save(obj:any) {
  sounds: any = {
    achievement:'assets/sounds/achievement_3.mp3'
  }


  audio: any
  playSound(sound:string) {
    if(!this.audio){
      this.audio = new Audio(this.sounds[sound]);
      this.audio.play()
      this.audio.onended = () => {
        this.audio.remove();
        this.audio = null;
      }
    }
  }

}
