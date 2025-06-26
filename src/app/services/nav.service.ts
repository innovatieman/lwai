import { EventEmitter, Injectable, Output } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { NavController, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { MenuPage } from '../components/menu/menu.page';
import { SelectMenuService } from './select-menu.service';

@Injectable({
  providedIn: 'root'
})
export class NavService {
  @Output() changeNav: EventEmitter<boolean> = new EventEmitter();
  @Output() changeLang: EventEmitter<string> = new EventEmitter();
  @Output() renewPWA: EventEmitter<boolean> = new EventEmitter();
  @Output() organisationChange: EventEmitter<boolean> = new EventEmitter();
  @Output() reloadMenu:EventEmitter<boolean> = new EventEmitter<boolean>();
  activeOrganisationId: string = ''
  
  langList:string[] = ['en','nl']
  redirectUrl:any = null
  specialCode:string = ''
  registrationCode:string = ''
  constructor(
    private navController: NavController,
    private translate: TranslateService,
    private functions: AngularFireFunctions,
    private selectMenuservice:SelectMenuService,
    private popoverController:PopoverController
  ) { 
    let urlParams = new URLSearchParams(window.location.search);
    this.redirectUrl = urlParams.get('redirect');
    this.specialCode = urlParams.get('specialcode')||''
    this.registrationCode = urlParams.get('registrationCode')||''
  }

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

  changeOrganisation(organisationId:string){
    this.activeOrganisationId = organisationId
    this.organisationChange.emit(true)
    localStorage.setItem('organisationId',organisationId)
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
    this.translate.currentLang = lang
    this.changeNav.emit(true)
    this.changeLang.emit(lang)
  }

  async editLang(){
    let list:any[] = []
    this.langList.forEach((lang)=>{
      list.push({
        value:lang,
        title:this.translate.instant('languages.'+lang),
        icon:'faGlobeEurope'
      })
    })
    await this.showshortMenu(event,list,((response:any)=>{
      if(response.value&&response.value!=localStorage.getItem('lang')){
        this.setLang(response.value)
        this.selectMenuservice.selectedItem = undefined
        // location.reload()
      }
    }))
   
  }

  shortMenu:any
  async showshortMenu(event:any,list:any[],callback:Function){
    this.shortMenu = await this.popoverController.create({
      component: MenuPage,
      componentProps:{
        pages:list,
        listShape:true,
        customMenu:true,
      },
      cssClass: 'shortMenu',
      event: event,
      translucent: false,
      reference:'trigger',
    });
    await this.shortMenu.present();
    await this.shortMenu.onDidDismiss()
    callback(this.selectMenuservice.selectedItem)
  }

  refreshPWA(){
    this.renewPWA.emit(true)
  }

}
