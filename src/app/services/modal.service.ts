import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ConfirmationModalComponent } from '../components/confirmation-modal/confirmation-modal.component';
import { InfoModalPage } from '../components/info-modal/info-modal.page';
import { OptionsModalPage } from '../components/options-modal/options-modal.page';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  constructor(private modalController: ModalController) {}

  async showConfirmation(message: string): Promise<boolean> {
    const modal = await this.modalController.create({
      component: ConfirmationModalComponent,
      componentProps: {
        message: message,
      },
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    return data?.confirmed || false; // Retourneert true of false
  }

  public async showText(content:string,title?:string,video?:boolean,buttons?:any[],backdropDismiss?:boolean,callback?:any,btnsClass?:string){
    if(backdropDismiss==undefined){backdropDismiss = true}
    const modal = await this.modalController.create({
      component:InfoModalPage,
      componentProps:{
        content:content,
        title:title,
        video:video,
        buttons:buttons,
        btnsClass:btnsClass
      },
      backdropDismiss:backdropDismiss,
      cssClass:'infoModal',
    })
    if(callback){
      modal.onWillDismiss().then(data=>{
        callback(data)
      })
    }
    return await modal.present()
  }


  public async options(options:any[],title?:string,intro?:string,buttons?:any,backdropDismiss?:boolean,callback?:any,btnsClass?:string){
    if(backdropDismiss==undefined){backdropDismiss = true}
    const modal = await this.modalController.create({
      component:OptionsModalPage,
      componentProps:{
        options:options,
        title:title,
        intro:intro,
        buttons:buttons,
        btnsClass:btnsClass
      },
      backdropDismiss:backdropDismiss,
      cssClass:'infoModal',
    })
    if(callback){
      modal.onWillDismiss().then(data=>{
        callback(data)
      })
    }
    return await modal.present()
  }
}