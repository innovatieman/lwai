import { Injectable } from '@angular/core';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RecordService {
  recording: boolean = false;
  stream: MediaStream | null = null;
  analyzing: boolean = false;
  isSpeaking: boolean = false;
  smartAudioContext: AudioContext | null = null;
  smartRecordingActive: boolean = false;
  constructor(
    private auth:AuthService,
  ) { }

  mediaRecorder: MediaRecorder | null = null;

  // async startRecording(type: string, conversationId: string, callback: Function) {
  //   if (type === 'audioToText') {
  //     this.recording = true;
  //     this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
  //     // const mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';
  //     const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
  //     ? "audio/webm;codecs=opus"
  //     : (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
  //     ? "audio/ogg;codecs=opus"
  //     : "audio/mp4");
  //     // : (MediaRecorder.isTypeSupported("'audio/mp4'")
  //     // ? "audio/mp4"
  //     // : "audio/wav")); // Laatste fallback
  //     console.log("MIME type:", mimeType);
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

  //   }
  // }

  audioContext: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  silenceTimeout: any = null;
  silenceStart: number | null = null;
  silenceDelay = 1000; // 1 seconde stil = stoppen
  checkInterval = 200; // elke 0.2s checken
  volumeThreshold = 0.01; // drempel voor wat als 'stilte' geldt
  noUpload = false; // voor testmodus

  //   audioContext: AudioContext | null = null;
  // analyser: AnalyserNode | null = null;
  // stream: MediaStream | null = null;
  listening = false;
  // volumeThreshold = 0.01; // stemdetectie-drempel


  // ✅ Slimme spraakopname met trimming van stilte aan begin en eind
// Werkt met MediaRecorder + AudioContext (WebM opname, trimming via decode)



  // ✅ Zet AudioBuffer om naar WAV Blob
  exportBufferToWav(buffer: AudioBuffer): Promise<Blob> {
    return new Promise((resolve) => {
      const length = buffer.length * 2 + 44;
      const arrayBuffer = new ArrayBuffer(length);
      const view = new DataView(arrayBuffer);

      const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
          view.setUint8(offset + i, str.charCodeAt(i));
        }
      };

      writeString(0, 'RIFF');
      view.setUint32(4, 36 + buffer.length * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, buffer.sampleRate, true);
      view.setUint32(28, buffer.sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, buffer.length * 2, true);

      const channelData = buffer.getChannelData(0);
      let offset = 44;
      for (let i = 0; i < channelData.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }

      resolve(new Blob([view], { type: 'audio/wav' }));
    });
  }





  waitForSpeech(callback: Function) {
    if (this.listening) return;

    this.listening = true;

    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then((stream) => {
      this.stream = stream;
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;

      source.connect(this.analyser);
      // console.log("Wachten op stem...");
      const dataArray = new Uint8Array(this.analyser.fftSize);

      const detectSpeech = () => {
        this.analyser!.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const val = (dataArray[i] - 128) / 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / dataArray.length);

        if (rms > this.volumeThreshold && !this.isSpeaking) {
          // console.log("Stem gedetecteerd, starten met opnemen...");
          this.listening = false;
          this.audioContext?.close();
          callback(this.stream!); // Geef stream mee aan startRecording
        } else {
          if (this.listening) {
            setTimeout(detectSpeech, 200); // Check elke 200ms
          }
        }
      };

      detectSpeech();
    });
  }

  stopSmartRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.smartRecordingActive = false; // voorkom dat onstop iets doet
      this.mediaRecorder.stop();
    }
    if (this.smartAudioContext) {
      this.smartAudioContext.close();
      this.smartAudioContext = null;
    }
  }

  async startSmartRecording(conversationId: string, uploadCallback: (blob: Blob) => void) {
    const volumeThreshold = 0.01;
    const silenceDelay = 1000; // 1s stilte = stop
    const preSpeechPadding = 500; // 0.5s vóór eerste spraak behouden

    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/ogg;codecs=opus";
    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];
    let startTime = Date.now();
    let firstSpeechTime: number | null = null;
    let silenceStart: number | null = null;

    this.mediaRecorder = mediaRecorder;
    this.smartAudioContext = new AudioContext();
    this.smartRecordingActive = true;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.start();
    // console.log("🎙️ Opname gestart (buffering spraak en stilte)");
    const audioContext = this.smartAudioContext;

    // const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const micSource = audioContext.createMediaStreamSource(stream);
    micSource.connect(analyser);

    const dataArray = new Uint8Array(analyser.fftSize);

    const detect = () => {
      analyser.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const val = (dataArray[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / dataArray.length);

      if (rms > volumeThreshold && !firstSpeechTime && !this.isSpeaking) {
        firstSpeechTime = Date.now();
        // console.log("🗣️ Eerste spraak op:", firstSpeechTime - startTime, "ms na start");
      }

      if (firstSpeechTime && rms < volumeThreshold) {
        if (!silenceStart) {
          silenceStart = Date.now();
        } else if (Date.now() - silenceStart > silenceDelay && mediaRecorder.state === 'recording') {
          // console.log("🤫 Stilte gedetecteerd, opname stoppen");
          mediaRecorder.stop();
          audioContext.close();
        }
      } else {
        silenceStart = null;
      }

      if (mediaRecorder.state === 'recording') {
        setTimeout(detect, 200);
      }
    };

    detect();

    mediaRecorder.onstop = async () => {
      if (!this.smartRecordingActive) return;
      this.smartRecordingActive = false;

      const blob = new Blob(chunks, { type: mimeType });
      const arrayBuffer = await blob.arrayBuffer();
      const decodedAudio = await audioContext.decodeAudioData(arrayBuffer);

      const sampleRate = decodedAudio.sampleRate;
      const startOffset = Math.max(0, ((firstSpeechTime ?? startTime) - startTime - preSpeechPadding) / 1000);
      const endOffset = decodedAudio.duration; // we trimmen alleen de start

      const frameCount = Math.floor((endOffset - startOffset) * sampleRate);
      const trimmedBuffer = audioContext.createBuffer(1, frameCount, sampleRate);
      decodedAudio.copyFromChannel(trimmedBuffer.getChannelData(0), 0, Math.floor(startOffset * sampleRate));

      const trimmedBlob = await this.exportBufferToWav(trimmedBuffer);
      // console.log("📤 Getrimde opname gereed voor upload:", trimmedBlob.size, "bytes");
      this.uploadAudio(trimmedBlob, conversationId, uploadCallback);
      // uploadCallback(trimmedBlob);
    };
  }

  startRecordingWithStream(stream: MediaStream, type: string, conversationId: string, callback: Function) {
    this.stream = stream;
    this.startRecording(type, conversationId, callback);
    // de rest is exact zoals in je eerdere startRecording functie
  }

  async startRecording(type: string, conversationId: string, callback: Function) {
    console.log('start recording', type);
    if (type === 'audioToText') {
      this.recording = true;
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup AudioContext voor stilte-detectie
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.fftSize);

      const checkSilence = () => {
        this.analyser!.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const val = (dataArray[i] - 128) / 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / dataArray.length);

        if (rms < this.volumeThreshold) {
          if (this.silenceStart === null) {
            this.silenceStart = Date.now();
          } else if (Date.now() - this.silenceStart > this.silenceDelay) {
            console.log("Te lang stil, opname stoppen...");
            this.stopRecordingSilently(); // nieuwe helper functie
          }
        } else {
          this.silenceStart = null; // reset bij geluid
        }

        if (this.recording) {
          this.silenceTimeout = setTimeout(checkSilence, this.checkInterval);
        }
      };

      checkSilence();

      // Start MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
          ? "audio/ogg;codecs=opus"
          : "audio/mp4");

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
      const audioChunks: Blob[] = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        // console.log('Recording stopped');
        this.recording = false;
        this.analyzing = true;
        clearTimeout(this.silenceTimeout);

        if (audioChunks.length === 0) {
          // console.error("Geen audio opgenomen!");
          return;
        }

        const audioBlob = new Blob(audioChunks, { type: mimeType });

        if (audioBlob.size > 0) {
          this.uploadAudio(audioBlob, conversationId, callback);
        } else {
          // console.error("AudioBlob is leeg!");
        }

        // Stop audio context
        this.audioContext?.close();
        this.audioContext = null;
      };

      this.mediaRecorder.start();

      // Max duur voor veiligheid
      setTimeout(() => {
        if (this.mediaRecorder!.state !== "inactive") {
          this.mediaRecorder!.stop();
        }
      }, 60000);
    }
  }

  stopRecordingSilently() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  async startRecordingSolo(type: string, conversationId: string, callback: Function) {
    this.noUpload = false;
    if (type === 'audioToText') {
      this.recording = true;
      this.stream = null;
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
      // Gebruik 'audio/mp4' voor Safari, of fallback naar 'audio/webm' voor andere browsers
      const mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';
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
        // console.log('Recording stopped');
        this.recording = false;
        this.analyzing = true;
  
        // **Controleer of er daadwerkelijk audio is opgenomen**
        if (audioChunks.length === 0) {
          // console.error("Geen audio opgenomen! Mogelijk Safari bug.");
          return;
        }
  
        const audioBlob = new Blob(audioChunks, { type: mimeType });
  
        if (audioBlob.size > 0) {
          // console.log("Audio opgenomen, grootte:", audioBlob.size);
          this.uploadAudio(audioBlob, conversationId, callback);
        } else {
          // console.error("AudioBlob is nog steeds leeg!");
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

  stopRecording(callback?:Function) {
    // console.log('stopped');
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

  async initiateRecording(conversationId: string) {
    const audioBlob = await this.getWavBlob('./assets/sounds/thankyou.wav');
    if (audioBlob.size > 0) {
      // console.log("Audio opgenomen, grootte:", audioBlob.size);
      this.uploadAudio(audioBlob, conversationId, () => {
        // console.log('init recording finished');
      });
    } else {
      // console.error("AudioBlob is nog steeds leeg!");
    }
  }

  async getWavBlob(file:string): Promise<Blob> {
    const response = await fetch(file);
    const arrayBuffer = await response.arrayBuffer();
    return new Blob([arrayBuffer], { type: 'audio/wav' });
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
    if(this.noUpload){
      this.noUpload = false;
      this.analyzing = false;
      // callback('test recording finished, no upload');
      return;
    }
    try {
      
      if (!audioBlob || audioBlob.size === 0) {
        // console.error("AudioBlob is empty!");
        callback("error");
        return;
      }
  
      const fileReader = new FileReader();
  
      fileReader.onloadend = async () => {
        if (!fileReader.result) {
          // console.error("FileReader result is null or undefined.");
          callback("error");
          return;
        }
  
        try {
          const base64data = this.arrayBufferToBase64(fileReader.result as ArrayBuffer);
          // console.log("Base64 conversion success:", base64data.slice(0, 50)); // Preview eerste 50 tekens
  
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
            // console.error("Request failed:", response.status, response.statusText);
            callback("error");
            return;
          }
  
          const result = await response.json();
          if (result.transcription) {
            // console.log("Transcription:", result.transcription);
            callback(result.transcription);
          } else {
            callback(null);
          }
        } catch (err) {
          // console.error("Base64 conversion failed:", err);
          callback("error");
        }
      };
  
      fileReader.readAsArrayBuffer(audioBlob);
    } catch (err) {
      // console.error("Unexpected error in uploadAudio:", err);
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
