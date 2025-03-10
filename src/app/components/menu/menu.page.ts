import { Component, Input, OnInit } from '@angular/core';
// import {faUser,faUsers,faQuestion,faBullseye,faSitemap,faUserCog,faHandsHelping,faGlobeEurope,faRoad,faMap,faSignOutAlt,faSignInAlt,faList} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from 'src/app/auth/auth.service';
import { IconsService } from 'src/app/services/icons.service';
import { Router } from '@angular/router';
import { PopoverController } from '@ionic/angular';
import { NavService } from 'src/app/services/nav.service';
import { TranslateService } from '@ngx-translate/core';
import { UserService } from 'src/app/services/user.service';
import { MediaService } from 'src/app/services/media.service';
import { SelectMenuService } from 'src/app/services/select-menu.service';
@Component({
  selector: 'app-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
})
export class MenuPage implements OnInit {
  isAuthenticated: boolean = false;
  isAdmin: boolean = false;
  @Input() customMenu:boolean = false
  @Input() listShape:boolean = false
  public selectedIndex = 0;
  @Input() pages:any 
  accountPages:any [] = [
    {
      title: 'Mijn Account',
      url: '/account',
      icon: 'faUser',
      isVisitor:false,
      isAdmin:true,
      isUser:true
    },
  ]

  appPages:any = [
   
    {
      title: 'Start',
      url: '/start',
      icon: 'faHome',
      isVisitor:false,
      isAdmin:true,
      isUser:true
    },
    {
      title: 'Mijn Account',
      url: '/account',
      icon: 'faUser',
      isVisitor:false,
      isAdmin:true,
      isUser:true
    },
    {
      title: 'Register',
      url: '/register',
      icon: 'faPen',
      isVisitor:true,
      isAdmin:false,
      isUser:false
    },
    {
      title: 'Login',
      url: '/login',
      icon: 'faUser',
      isVisitor:true,
      isAdmin:false,
      isUser:false
    },
    {
      title: 'Agents en Settings',
      icon: 'faCogs',
      url: '/bagend/engine',
      isVisitor:false,
      isAdmin:true,
      isUser:false,
    },
    {
      title: 'Cases',
      icon: 'faSuitcase',
      url: '/bagend/cases',
      isVisitor:false,
      isAdmin:true,
      isUser:false,
    },
    {
      title: 'Users',
      icon: 'faUsers',
      url: '/bagend/users',
      isVisitor:false,
      isAdmin:true,
      isUser:false,
    },
    {
      title: 'All Conversations',
      icon: 'faComments',
      url: '/bagend/conversations',
      isVisitor:false,
      isAdmin:true,
      isUser:false,
    },
  ];

  [key: string]: any;
  constructor(
    public auth:AuthService,
    public user:UserService,
    public icon:IconsService,
    public router:Router,
    public popoverController:PopoverController,
    public nav:NavService,
    public translateService:TranslateService,
    public media:MediaService,
    private selectMenuservice:SelectMenuService,
  ) { }

  ngOnInit() {
    if(this.pages){
      this.appPages = this.pages
    }
    const path = window.location.pathname;
    this.auth.isAuthenticated().subscribe((auth) => {
      if(auth){
        this.isAuthenticated = true
      }
    });

    this.auth.isAdmin().subscribe((admin) => {
      this.isAdmin = admin;
    });

  }

  shouldShowPage(page: any): boolean {
    if (this.isAdmin && page.isAdmin) {
      return true;
    }

    if (!this.isAuthenticated && page.isVisitor) {
      return true;
    }

    if (this.isAuthenticated && page.isUser) {
      return true;
    }

    return false;
  }

  execute(array:any){
    if(!array||array.length<2){
      return
    }
    if(array[3]!=undefined){
      this[array[0]][array[1]](array[2],array[3])
      return
    }
    if(array[2]){
      this[array[0]][array[1]](array[2])
      return
    }
    this[array[0]][array[1]]()
  }

  getMainUrl(url:string){

    let temp = url.split('/')
    if(temp[0]){return "/"+temp[0]}
    return "/"+temp[1]


  }

  trl(text:string){
    return this.translateService.instant(text)
  }

  dismissPopover(value:any){
    this.selectMenuservice.selectedItem = value
    this.popoverController.dismiss(value)
  }

  async editLang(){
    let list:any[] = []
    this.nav.langList.forEach((lang)=>{
      list.push({
        value:lang,
        title:this.translateService.instant('languages.'+lang),
        icon:'faGlobeEurope'
      })
    })
    await this.showshortMenu(event,list,((response:any)=>{
      if(response.value&&response.value!=localStorage.getItem('lang')){
        this.nav.setLang(response.value)
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
}
