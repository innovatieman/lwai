import { Injectable } from '@angular/core';
import { ToastController, LoadingController, ModalController, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  loader:any;
  loaderLong:any;
  isLoading:boolean = false
  isLoadingLong:boolean = false
  loaderStart:any
  constructor(
    private toastController: ToastController,
    private loadingController:LoadingController,
    private translate:TranslateService
  ) { }

  async show(message:string,duration?:number,position?:'top'|'bottom'|'middle') {
    if(!duration){
      duration = 4000
    }
    if(!position){
      position = 'middle'
    }
    const toast = await this.toastController.create({
      message: message,
      duration: duration,
      position: position,
    });
    toast.present();
  }

  async showLoader(message?:string,duration?:number) {
    if(!message){
      message = this.translate.instant('page_contact_form_btn_loading')
    }
    if(this.loader){
      return
    }
    this.isLoading=true
    return await this.loadingController.create({
      message: message,
      duration: duration,
      spinner:'circles',
      cssClass:'loader'
    }).then(a=>{
      this.loader = a
      this.loader.present().then(()=>{
        if(!this.isLoading){
          a.dismiss()
        }
      })
    })
  }

  hideLoader(){
    this.isLoading=false
    if(this.loader){
      this.loader.dismiss()
      this.loader = undefined
    }
      
  }




}
