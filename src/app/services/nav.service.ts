import { EventEmitter, Injectable, Output } from '@angular/core';
import { NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class NavService {
  // @Output() changeNav: EventEmitter<boolean> = new EventEmitter();
  langList:string[] = ['en','nl']
  constructor(
    private navController: NavController,
    private translate: TranslateService,
  ) { }

  public go(page: string,backwards?: boolean){
    if(backwards){
      this.navController.navigateBack(page);
    }
    else{
      this.navController.navigateForward(page, {animated: false});
    }

  }
  public back(){
    this.navController.back();
  }

  goto(url: string,newTab?: boolean){
    if(newTab){
      window.open(url,'_blank');
      return;
    }
    else{
      location.href = url;
    }
  }

  setLang(lang?:string){
    if(!lang){
      if(localStorage.getItem('lang')){
        lang = localStorage.getItem('lang')!
      }
      else if(this.langList.indexOf(navigator.language.substring(0,2).toLocaleLowerCase())>-1){
        lang = navigator.language.substring(0,2).toLocaleLowerCase()
      }
      else{
        lang = 'en'
      }
    }
    localStorage.setItem('lang',lang)
    this.translate.setDefaultLang(lang);
    this.translate.use(lang)
    // this.changeNav.emit(true)
  }
}
