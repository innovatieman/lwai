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
  vh:number = 0
  @Input() options:any={
    title:'',
    content:'',
    textBorder:true,
    video:false,
    image:false,
    videoLoaded:false,
    btnsClass:'',
    buttons:null,
    image_max_width:'100%',
    image_width:'100%',
    image_up:false,
    image_under:false,
    image_only_once:false,
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
    if(!this.options.image && !this.options.video){
      this.options.image_only_once = true
    }
    // console.log(this.options)
  }
  ngAfterViewInit() {
    this.vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${this.vh}px`);  
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