import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { TooltipPage } from 'src/app/components/modals/tooltip/tooltip.page';
import { ToastService } from 'src/app/services/toast.service';

@Directive({
  selector: '[tooltip]'
})
export class TooltipDirective {
  @Input() tooltip: string = ''
  @Input() background: string = 'white'
  tooltipActive=false;
  tooltipPopover: any;
  constructor(
    private toast: ToastService,
    private el: ElementRef,
    private popoverController: PopoverController
  ) {
    // this.el.nativeElement.style.pointerEvents = 'none'
  }

  @HostListener('mouseenter',['$event']) onmouseenter(event: MouseEvent){
    if(!this.tooltipActive){
      this.tooltipActive = true;
      this.showTooltip(event,this.tooltip);
    }
    // setTimeout(() => {
    //     this.toast.hideTooltip()
    // }, 3000);
  }

  @HostListener('mouseleave', ['$event']) onmouseleave(e: MouseEvent) {
    // setTimeout(() => {
      // Controleer of de muis NIET meer over het icoon of de tooltip zelf is
      // const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
      // if (!this.el.nativeElement.contains(elementUnderMouse) && !document.querySelector('.tooltip')) {
        this.hideTooltip();
        this.tooltipActive = false;
    //   }
    // }, 1000); 
}


async showTooltip(event:Event,text:string,milliseconds?:number){
  // if(this.showingTooltip){
  //   this.hideTooltip()
  // }
  // this.showingTooltip = true
  if(!this.tooltipPopover){
    this.tooltipPopover = await this.popoverController.create({
      component: TooltipPage,
      componentProps:{
        text
      },
      cssClass: 'tooltip',
      event,
      // translucent: true,
      showBackdrop:false,
      htmlAttributes: { tabindex: undefined },
    });
    await this.tooltipPopover.present();
    if(milliseconds){
      setTimeout(() => {
        this.hideTooltip();
      }, milliseconds);
    }
  }
}

hideTooltip(){
  if(this.tooltipPopover){
    this.tooltipPopover.dismiss();
    document.querySelectorAll('app-tooltip').forEach(el=>{
      el.remove();
    });
    this.tooltipPopover = undefined;

  }
  // this.showingTooltip = false
}


  // async showTooltip(text: string, milliseconds?: number) {
  //   if (!this.tooltipPopover) {
  //     this.tooltipPopover = await this.popoverController.create({
  //       component: TooltipPage,
  //       cssClass: 'tooltip',
  //       event: event,
  //       showBackdrop: false,
  //       componentProps:{text:text}      
  //     });
  
  //     await this.tooltipPopover.present();
  
  //     if (milliseconds) {
  //       setTimeout(() => {
  //         this.hideTooltip();
  //       }, milliseconds);
  //     }
  //   }
  // }

  // hideTooltip(){
  //   console.log(this.tooltipPopover)
  //   if(this.tooltipPopover){
  //     this.tooltipPopover.dismiss();
  //     document.querySelectorAll('app-tooltip').forEach(el=>{
  //       el.remove();
  //     });
  //     this.tooltipPopover = undefined;

  //   }
  //   // this.showingTooltip = false
  // }
}
