import { Injectable } from '@angular/core';
import { ToastController, LoadingController, ModalController, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { SelectDatePage } from '../components/modals/select-date/select-date.page';
import { TooltipPage } from '../components/modals/tooltip/tooltip.page';
import { PopoverMenuPage } from '../components/modals/popover-menu/popover-menu.page';

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
    private translate:TranslateService,
    private modalController:ModalController,
    private popoverController:PopoverController
  ) { }

  async show(message:string,duration?:number | null,position?:'top'|'bottom'|'middle') {
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
      message = this.translate.instant('modal_intros.loader')
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


  public async selectDate(date:any,callback:Function,showTime?:boolean|null,extraData?:any){
    const modal = await this.modalController.create({
      component:SelectDatePage,
      componentProps:{
        date:date,
        showTime:showTime,
        extraData:extraData
      },
      cssClass:'inputFieldsModal',
    })
    modal.onWillDismiss().then(result=>{
      callback(result.data)
      // if(result.data){
      //   callback(moment(result.data))
      // }
      // else{
      //   callback()
      // }
    })
    return await modal.present()
  }
  
  
  tooltip:any
  async showTooltip(event:any,text:string,milliseconds?:number|null){
    this.tooltip = await this.popoverController.create({
      component: TooltipPage,
      // componentProps:{
      //   text:text
      // },
      cssClass: 'tooltip',
      event: event,
      translucent: true,
      size:'auto'
    });
    await this.tooltip.present();
    if(milliseconds){
      setTimeout(() => {
        this.hideTooltip()
      }, milliseconds);
    }
  }
  
  hideTooltip(){
    if(this.tooltip){
      this.tooltip.dismiss()
      document.querySelectorAll('app-tooltip').forEach(el=>{
        el.remove()
      })
      document.querySelectorAll('.tooltip').forEach(el=>{
        el.remove()
      })
      this.tooltip = undefined
    }
  }


  async showPopoverMenu(event:any,list:any[],callback:Function,showIcon?:boolean|null,position?:string|null){
    const popoverMenu = await this.popoverController.create({
      component: PopoverMenuPage,
      componentProps:{
        list:list,
        showIcon:showIcon
      },
      // side:position?position:'end',
      cssClass: 'popoverMenu',
      event: event,
      // translucent: true,
      size:'auto',
      showBackdrop:false,
    });
    await popoverMenu.present();

    const item = await popoverMenu.onWillDismiss()
    callback(item)
  }


}
