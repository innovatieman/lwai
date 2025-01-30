import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-rate-learning',
  templateUrl: './rate-learning.page.html',
  styleUrls: ['./rate-learning.page.scss'],
})
export class RateLearningPage implements OnInit {
  rating:any = [
    {
      question:'Hoeveel heb je geleerd?',
      value:1,
      type:'stars'
    }
  ]

  updatingStars:boolean = false;
  title:string='';
  content:string='';
  id:any='';

  constructor(
    public modalCtrl:ModalController,
    private navParams:NavParams,
    public icon:IconsService,
    private toast:ToastService,
    public media:MediaService,
    private translate:TranslateService,
  ) { 

  }

  ngOnInit() {

    if(this.navParams.get('title')){
      this.title = this.navParams.get('title')
    }
    if(this.navParams.get('content')){
      this.content = this.navParams.get('content')
    }
    if(this.navParams.get('rating')){
      this.rating = this.navParams.get('rating')
    }
    if(this.navParams.get('id')){
      this.id = this.navParams.get('id')
    }
  }

  hideLoader(){
    setTimeout(() => {
      this.toast.hideLoader()
    }, 2000);
  }

  onRatingChanged(rating:number,index:number){
    // console.log(this.rating[0].value)
    this.rating[index].value = rating
    this.updatingStars = true;
    this.rating = JSON.parse(JSON.stringify(this.rating))
    setTimeout(() => {
      this.updatingStars = false;
    }, 100);
  }

  dismiss(item?:any){
    if(item){
      let all:any = {}
      if(this.id){
        all[this.id.type] = this.id.value
      }
      all.rating = []
      this.rating.forEach((e:any) => {
        let obj:any = {
          question:e.question,
          value:e.value
        }
        if(e.other){
          obj.other = e.other
        }
        all.rating.push(obj)
      });
      this.modalCtrl.dismiss(all)
    }
    else{
      this.modalCtrl.dismiss(item)
    }
  }

  nothingFilled(){
    let filled = false
    this.rating.forEach((e:any) => {
      if(e.value){
        filled = true
      }
    });
    return !filled
  }
}