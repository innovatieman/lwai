import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ConfirmationModalComponent } from '../components/modals/confirmation-modal/confirmation-modal.component';
import { InfoModalPage } from '../components/modals/info-modal/info-modal.page';
import { OptionsModalPage } from '../components/modals/options-modal/options-modal.page';
import { BackupModalPage } from '../components/modals/backup-modal/backup-modal.page';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  constructor(private modalController: ModalController) {}

  async showConfirmation(message: string): Promise<boolean> {
    const modalItem = await this.modalController.create({
      component: ConfirmationModalComponent,
      componentProps: {
        message: message,
      },
    });

    await modalItem.present();

    const { data } = await modalItem.onWillDismiss();
    return data?.confirmed || false; // Retourneert true of false
  }

  public async showText(content:string,title?:string,video?:boolean,buttons?:any[],backdropDismiss?:boolean,callback?:any,btnsClass?:string){
    if(backdropDismiss==undefined){backdropDismiss = true}
    const modalItem = await this.modalController.create({
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
      modalItem.onWillDismiss().then(data=>{
        callback(data)
      })
    }
    return await modalItem.present()
  }


  public async options(options:any[],title?:string,intro?:string,buttons?:any,backdropDismiss?:boolean,callback?:any,btnsClass?:string){
    if(backdropDismiss==undefined){backdropDismiss = true}
    const modalItem = await this.modalController.create({
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
      modalItem.onWillDismiss().then(data=>{
        callback(data)
      })
    }
    return await modalItem.present()
  }

  public async backups(backups:any[],options:any,title:string,callback:Function){
    const modalItem = await this.modalController.create({
      component:BackupModalPage,
      componentProps:{
        backups:backups,
        options:options,
        title:title,
      },
      cssClass:'infoModal',
    })
    modalItem.onWillDismiss().then(data=>{
      callback(data)
    })
    return await modalItem.present()
  } 
}