import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ConfirmationModalComponent } from '../components/modals/confirmation-modal/confirmation-modal.component';
import { InfoModalPage } from '../components/modals/info-modal/info-modal.page';
import { OptionsModalPage } from '../components/modals/options-modal/options-modal.page';
import { BackupModalPage } from '../components/modals/backup-modal/backup-modal.page';
import { ConversationStartPage } from '../components/modals/conversation-start/conversation-start.page';
import { InputFieldsPage } from '../components/modals/input-fields/input-fields.page';
import { EditHtmlPage } from '../components/modals/edit-html/edit-html.page';
import { SelectItemPage } from '../components/modals/select-item/select-item.page';
import { VerificationPage } from '../components/modals/verification/verification.page';
import { RateLearningPage } from '../components/modals/rate-learning/rate-learning.page';
import { SelectManyPage } from '../components/modals/select-many/select-many.page';
import { EvaluationPage } from '../components/modals/evaluation/evaluation.page';
import { SelectImageLibraryPage } from '../components/modals/select-image-library/select-image-library.page';
import { CaseinfoPage } from '../components/modals/caseinfo/caseinfo.page';

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

  async showVerification(title?:string,message?: string,buttons?:any[]): Promise<any> {
    const modalItem = await this.modalController.create({
      component: VerificationPage,
      componentProps: {
        title:title,
        message: message,
        buttons:buttons
      },
    });

    await modalItem.present();

    const { data } = await modalItem.onWillDismiss();
    return data
  }

  async showConversationStart(caseItem: any): Promise<boolean> {
    console.log(caseItem);
    const modalItem = await this.modalController.create({
      component: ConversationStartPage,
      backdropDismiss: false,
      componentProps: {
        caseItem: caseItem,
      },
      cssClass: 'caseModal',
    });

    await modalItem.present();

    const { data } = await modalItem.onWillDismiss();
    return data || false; // Retourneert true of false
  }


  public async showText(content:string,title?:string,video?:boolean,buttons?:any[],backdropDismiss?:boolean,callback?:any,btnsClass?:string,extraData?:any,image?:boolean){
    let options:any = {
      content:content,
      title:title,
      video:video,
      buttons:buttons,
      btnsClass:btnsClass,
      extraData:extraData,
      image:image
    }
    
    
    if(backdropDismiss==undefined){options.backdropDismiss = true}
    this.showInfo(options,callback)
  }

  public async showInfo(options:any,callback?:any){
    if(options.backdropDismiss==undefined){options.backdropDismiss = true}
    const modalItem = await this.modalController.create({
      component:InfoModalPage,
      componentProps:{
        options:options
      },
      backdropDismiss:options.backdropDismiss,
      cssClass:'infoModal',
    })
    if(callback){
      modalItem.onWillDismiss().then(data=>{
        callback(data)
      })
    }
    return await modalItem.present()
  }

  public async showCaseInfo(caseItem:any,callback?:any){
    const modalItem = await this.modalController.create({
      component:CaseinfoPage,
      componentProps:{
        caseItem:caseItem
      },
      backdropDismiss:true,
      cssClass:'infoModal',
    })
    if(callback){
      modalItem.onWillDismiss().then(data=>{
        callback(data)
      })
    }
    return await modalItem.present()
  }

  public async showEvaluation(options:any,callback?:any){
    if(options.backdropDismiss==undefined){options.backdropDismiss = true}
    const modalItem = await this.modalController.create({
      component:EvaluationPage,
      componentProps:{
        options:options
      },
      backdropDismiss:options.backdropDismiss,
      cssClass:'evaluationModal',
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

  public async inputFields(title:string,text:string,fields:any[],callback:Function,extraData?:any){
    const modalItem = await this.modalController.create({
      component:InputFieldsPage,
      componentProps:{
        text:text,
        fields:fields,
        title:title,
        extraData:extraData
      },
      cssClass:'infoModal',
    })
    modalItem.onWillDismiss().then(result=>{
      callback(result)
    })
    return await modalItem.present()
  }

  public async editHtmlItem(data:any,callback:Function){
    const modalItem = await this.modalController.create({
      component:EditHtmlPage,
      componentProps:{
        data:data,
      },
      cssClass:'editHtmlModal',
    })
    modalItem.onWillDismiss().then(data=>{
      callback(data)
    })
    return await modalItem.present()
    // return await modalItem.present
  }

  public async selectItem(text:string,list:any[],callback:Function,iconList?:any,title?:string,extraData?:any){
    const modalItem = await this.modalController.create({
      component:SelectItemPage,
      componentProps:{
        text:text,
        list:list,
        iconList:iconList,
        title:title,
        extraData:extraData
      },
      cssClass:'listModal',
    })
    modalItem.onWillDismiss().then(result=>{
      callback(result)
    })
    return await modalItem.present()
  }

  async showRating(title:string,content:string,id:any,rating: any): Promise<boolean> {
    const modalItem = await this.modalController.create({
      component: RateLearningPage,
      backdropDismiss: false,
      componentProps: {
        title: title,
        content: content,
        rating: rating,
        id: id,
      },
    });

    await modalItem.present();

    const { data } = await modalItem.onWillDismiss();
    return data || false;
  }

  async selectMany(obj:any,callback:Function){
    const modalItem = await this.modalController.create({
      component:SelectManyPage,
      componentProps:{
        properties:obj
      },
      cssClass:'selectManyModal',
    })
    modalItem.onWillDismiss().then(result=>{
      callback(result)
    })
    return await modalItem.present()
  }

  async selectImageLibrary(obj:any,callback:Function){
    const modalItem = await this.modalController.create({
      component:SelectImageLibraryPage,
      componentProps:{
        properties:obj
      },
      cssClass:'selectManyModal',
    })
    modalItem.onWillDismiss().then(result=>{
      callback(result)
    })
    return await modalItem.present()
  }

}