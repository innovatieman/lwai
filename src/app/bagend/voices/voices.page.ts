import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-voices',
  templateUrl: './voices.page.html',
  styleUrls: ['./voices.page.scss'],
})
export class VoicesPage implements OnInit {
  test:any = {
    text: `What am I doing here in this ... "room"? I don't want to be here. I want to go home.`,
    emotion:'My attitude at the moment is loving towards you',
    language:'en',
    model:'eleven_multilingual_v2'
  }
  constructor() { }

  ngOnInit() {
  }

  async testSpeech(){
    let url = 'https://texttospeechwithemotion-p2qcpa6ahq-ew.a.run.app'
    let obj:any = {
      emotion: this.test.emotion,
      text: this.test.text,
      language: this.test.language,
      voiceId:'AyQGttFzg1EY7EIKkpHs'
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
    console.log(response.headers.get("Content-Type"));
    // ⏬ haal de MP3 stream op
    const blob = await response.blob();
    console.log(blob)
    // ⏫ maak een tijdelijke URL van de MP3
    const audioUrl = URL.createObjectURL(blob);
    console.log(audioUrl)
    // ▶️ speel het af
    const audio = new Audio(audioUrl);
    audio.play();
  }

}
