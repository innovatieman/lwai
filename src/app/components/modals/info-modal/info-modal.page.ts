import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { FirestoreService } from 'src/app/services/firestore.service';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';
import { ToastService } from 'src/app/services/toast.service';
@Component({
  selector: 'app-info-modal',
  templateUrl: './info-modal.page.html',
  styleUrls: ['./info-modal.page.scss'],
})
export class InfoModalPage implements OnInit {
  @ViewChild("iframe",{static:false}) iframe!: ElementRef;
  feedbackGiven:boolean = false
  @Input() options:any={
    title:'',
    content:'',
    textBorder:true,
    video:false,
    image:false,
    videoLoaded:false,
    btnsClass:''
  };


  constructor(
    public modalCtrl:ModalController,
    public icon:IconsService,
    private toast:ToastService,
    public media:MediaService,
    private translate:TranslateService,
    private firestore:FirestoreService,
  ) { 

  }

  ngOnInit() {
    if(!this.options.videoLoaded&&this.options.video){
      this.toast.showLoader()
    }
    // console.log(this.options)
  }

  hideLoader(){
    setTimeout(() => {
      this.toast.hideLoader()
    }, 2000);
  }

  feedback(value:boolean){
    // console.log(value)
    let obj:any = JSON.parse(JSON.stringify(this.options.feedback))
    obj.positive = value
    for(let key in obj){
      if(obj[key] === null || obj[key] === undefined){
        delete obj[key]
      }
    } 
    this.firestore.create('feedback',obj).then(()=>{
      this.feedbackGiven = true
    })
  }
}