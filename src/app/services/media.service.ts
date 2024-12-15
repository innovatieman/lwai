import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private activeScreenSize:string = 'md'
  
  constructor(
    public platform:Platform,
  ) {
    this.setScreenSize()
   }

  public get screenSize(){
    return this.activeScreenSize
  }

  setScreenSize(){

    if (window.matchMedia("(max-width: 575px)").matches) {
      this.activeScreenSize = 'xs'
    } 
    else if (window.matchMedia("(max-width: 769px)").matches) {
      this.activeScreenSize = 'sm'
    } 
    else if (window.matchMedia("(max-width: 992px)").matches) {
      this.activeScreenSize = 'md'
    } 
    else if (window.matchMedia("(max-width: 1200px)").matches) {
      this.activeScreenSize = 'lg'
    } 
    else {
      this.activeScreenSize = 'xl'
    } 
  }


  get browser() {
    if ((navigator.userAgent.indexOf("Opera") || navigator.userAgent.indexOf('OPR')) != -1) {
       return 'Opera';
    } else if (navigator.userAgent.toLowerCase().indexOf("chrome") != -1) {
       return 'Chrome';
    } else if (navigator.userAgent.indexOf("Safari") != -1) {
       return 'Safari';
    } else if (navigator.userAgent.indexOf("Firefox") != -1) {
       return 'Firefox';
    } else {
       return 'unknown';
    }
 }


}
