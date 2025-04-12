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

  mediaRecorder: MediaRecorder | null = null;
  async startRecording(type: string, conversationId: string, callback: Function) {
    if (type === 'audioToText') {
      this.recording = true;
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
      // const mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
      ? "audio/ogg;codecs=opus"
      : "audio/mp4");
      // : (MediaRecorder.isTypeSupported("'audio/mp4'")
      // ? "audio/mp4"
      // : "audio/wav")); // Laatste fallback
      console.log("MIME type:", mimeType);
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
  
      const audioChunks: Blob[] = [];
  
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
  
      this.mediaRecorder.start();
  
      // **Forceer dat er minstens 1 chunk wordt verzameld voordat je stopt**
      setTimeout(() => {
        if (this.mediaRecorder!.state !== "inactive") {
          this.mediaRecorder!.stop();
        }
      }, 60000); // Maximaal 60 seconden opnemen
  
      this.mediaRecorder.onstop = async () => {
        console.log('Recording stopped');
        this.recording = false;
        this.analyzing = true;
  
        // **Controleer of er daadwerkelijk audio is opgenomen**
        if (audioChunks.length === 0) {
          console.error("Geen audio opgenomen! Mogelijk Safari bug.");
          return;
        }
  
        const audioBlob = new Blob(audioChunks, { type: mimeType });
  
        if (audioBlob.size > 0) {
          console.log("Audio opgenomen, grootte:", audioBlob.size);
          this.uploadAudio(audioBlob, conversationId, callback);
        } else {
          console.error("AudioBlob is nog steeds leeg!");
        }
      };
  
      // **Extra beveiliging: zorg dat er minstens 1 chunk komt**
      // setTimeout(() => {
      //   if (audioChunks.length === 0 && this.mediaRecorder!.state !== "inactive") {
      //     console.warn("Geen chunks ontvangen, forceren van stop()");
      //     this.mediaRecorder!.stop();
      //   }
      // }, 3000); // Forceer een stop na 3 seconden als er geen chunks zijn
    }
  }

  // async startRecording(type: string, conversationId: string, callback: Function) {
  //   if (type === 'audioToText') {
  //     this.recording = true;
  //     this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
  //     // Gebruik 'audio/mp4' voor Safari, of fallback naar 'audio/webm' voor andere browsers
  //     const mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';
  //     this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
  
  //     const audioChunks: Blob[] = [];
  
  //     this.mediaRecorder.ondataavailable = (event) => {
  //       if (event.data.size > 0) {
  //         audioChunks.push(event.data);
  //       }
  //     };
  
  //     this.mediaRecorder.start();
  
  //     // **Forceer dat er minstens 1 chunk wordt verzameld voordat je stopt**
  //     setTimeout(() => {
  //       if (this.mediaRecorder!.state !== "inactive") {
  //         this.mediaRecorder!.stop();
  //       }
  //     }, 60000); // Maximaal 60 seconden opnemen
  
  //     this.mediaRecorder.onstop = async () => {
  //       console.log('Recording stopped');
  //       this.recording = false;
  //       this.analyzing = true;
  
  //       // **Controleer of er daadwerkelijk audio is opgenomen**
  //       if (audioChunks.length === 0) {
  //         console.error("Geen audio opgenomen! Mogelijk Safari bug.");
  //         return;
  //       }
  
  //       const audioBlob = new Blob(audioChunks, { type: mimeType });
  
  //       if (audioBlob.size > 0) {
  //         console.log("Audio opgenomen, grootte:", audioBlob.size);
  //         this.uploadAudio(audioBlob, conversationId, callback);
  //       } else {
  //         console.error("AudioBlob is nog steeds leeg!");
  //       }
  //     };
  
  //     // **Extra beveiliging: zorg dat er minstens 1 chunk komt**
  //     // setTimeout(() => {
  //     //   if (audioChunks.length === 0 && this.mediaRecorder!.state !== "inactive") {
  //     //     console.warn("Geen chunks ontvangen, forceren van stop()");
  //     //     this.mediaRecorder!.stop();
  //     //   }
  //     // }, 3000); // Forceer een stop na 3 seconden als er geen chunks zijn
  //   }
  // }

  stopRecording(callback?:Function) {
    console.log('stopped');
    if (this.stream) {
      this.mediaRecorder?.stop();
      setTimeout(() => {
        this.stream!.getTracks().forEach((track) => track.stop());
      }, 200);
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

  // async uploadAudio(audioBlob: Blob,conversationId:string,callback:Function) {
  //   // console.log('Uploading audio...');

  //   const fileReader = new FileReader();

  //   fileReader.onloadend = async () => {
  //     const base64data = fileReader.result?.toString().split(",")[1];

  //     const payload = {
  //       userId: this.auth.userInfo.uid,
  //       conversationId: conversationId,
  //       file: base64data,
  //     };
  //     // console.log("Payload:", payload);
  //     const response = await fetch("https://soundtotextai-p2qcpa6ahq-ew.a.run.app", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify(payload),
  //     });
  //     if (!response.ok) {
  //       console.error("Request failed:", response.status, response.statusText);
  //       callback('error');
  //       this.analyzing = false;
  //       return;
  //     }
  //     const result = await response.json();
  //     // console.log("Response:", result);
  //     this.analyzing = false;
  //     if(result.transcription){
  //       callback(result.transcription);
  //     }
  //     else{
  //       callback(null);
  //     }
  //   };

  //   fileReader.readAsDataURL(audioBlob);


  //   // const headers = new Headers();

  //   // const formData = new FormData();
  //   // formData.append('file', new File([audioBlob], 'audio.webm', { type: 'audio/webm' }));
  //   // formData.append('userId', this.auth.userInfo.uid);
    
  //   // let url = 'https://soundtotextai-p2qcpa6ahq-ew.a.run.app/';

  //   // if(!url){
  //   //   console.error('No url found')
  //   //   return;
  //   // }

  //   // formData.forEach((value, key) => {
  //   //   console.log(`${key}:`, value);
  //   // });

  //   // const response = await fetch(url, {
  //   //   method: 'POST',
  //   //   body: formData, // Stuur multipart/form-data
  //   // });
  
  //   // if (!response.ok) {
  //   //   console.error('Request failed:', response.status, response.statusText);
  //   //   return;
  //   // }
  
  //   // const result = await response.json();
  //   // console.log('Transcription:', result);


  //   // const response = await fetch(url, {
  //   //   method: "POST",
  //   //   headers: {
  //   //     "Content-Type": "application/json",
  //   //   },
  //   //   body: JSON.stringify(obj),
  //   // });
  //   // if (!response.ok) {
  //   //   console.error("Request failed:", response.status, response.statusText);
  //   //   return;
  //   // }
  //   // console.log(response)


  
  //   // this.http.post('https://your-firebase-function-url/whisper', formData).subscribe({
  //   //   next: (response: any) => {
  //   //     console.log('Transcription:', response.transcription);
  //   //   },
  //   //   error: (err) => console.error('Error:', err),
  //   // });
  // }

  // async openai_extra_save(obj:any) {
  sounds: any = {
    achievement:'assets/sounds/achievement_3.mp3'
  }

  // async uploadAudio(audioBlob: Blob, conversationId: string, callback: Function) {
  //   const fileReader = new FileReader();

  //   fileReader.onloadend = async () => {
  //     if (!fileReader.result) {
  //         console.error("FileReader failed to read file");
  //         callback('error');
  //         return;
  //     }
      
  //     // Zet ArrayBuffer om naar base64
  //     const arrayBuffer = fileReader.result as ArrayBuffer;
  //     const base64data = this.arrayBufferToBase64(arrayBuffer);

  //     // Controleer of base64data correct is
  //     if (!base64data) {
  //         console.error("Base64 conversion failed");
  //         callback('error');
  //         return;
  //     }

  //     const payload = {
  //         userId: this.auth.userInfo.uid,
  //         conversationId: conversationId,
  //         file: base64data,
  //     };

  //     const response = await fetch("https://soundtotextai-p2qcpa6ahq-ew.a.run.app", {
  //         method: "POST",
  //         headers: {
  //             "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify(payload),
  //     });

  //     if (!response.ok) {
  //         console.error("Request failed:", response.status, response.statusText);
  //         callback('error');
  //         return;
  //     }

  //     const result = await response.json();
  //     callback(result.transcription || null);
  //   };

  //   fileReader.readAsArrayBuffer(audioBlob);
  // }

  async uploadAudio(audioBlob: Blob, conversationId: string, callback: Function) {
    try {
      console.log("Uploading audio...");
      
      if (!audioBlob || audioBlob.size === 0) {
        console.error("AudioBlob is empty!");
        callback("error");
        return;
      }
  
      const fileReader = new FileReader();
  
      fileReader.onloadend = async () => {
        if (!fileReader.result) {
          console.error("FileReader result is null or undefined.");
          callback("error");
          return;
        }
  
        try {
          const base64data = this.arrayBufferToBase64(fileReader.result as ArrayBuffer);
          console.log("Base64 conversion success:", base64data.slice(0, 50)); // Preview eerste 50 tekens
  
          const payload = {
            userId: this.auth.userInfo.uid,
            conversationId: conversationId,
            file: base64data,
          };
  
          // const response = await fetch("https://soundtotextai-p2qcpa6ahq-ew.a.run.app", {
          const response = await fetch("https://soundtotextgemini-p2qcpa6ahq-ew.a.run.app", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
  
          if (!response.ok) {
            console.error("Request failed:", response.status, response.statusText);
            callback("error");
            return;
          }
  
          const result = await response.json();
          if (result.transcription) {
            console.log("Transcription:", result.transcription);
            callback(result.transcription);
          } else {
            callback(null);
          }
        } catch (err) {
          console.error("Base64 conversion failed:", err);
          callback("error");
        }
      };
  
      fileReader.readAsArrayBuffer(audioBlob);
    } catch (err) {
      console.error("Unexpected error in uploadAudio:", err);
      callback("error");
    }
  }

  // 🔹 Hulpfunctie: Zet ArrayBuffer om naar base64
  arrayBufferToBase64(buffer: ArrayBuffer): string {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
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
