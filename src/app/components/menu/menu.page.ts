import { Component, OnInit } from '@angular/core';
// import {faUser,faUsers,faQuestion,faBullseye,faSitemap,faUserCog,faHandsHelping,faGlobeEurope,faRoad,faMap,faSignOutAlt,faSignInAlt,faList} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from 'src/app/auth/auth.service';
import { IconsService } from 'src/app/services/icons.service';
import { Router } from '@angular/router';
import { NavParams, PopoverController } from '@ionic/angular';
import { NavService } from 'src/app/services/nav.service';
import { TranslateService } from '@ngx-translate/core';
import { UserService } from 'src/app/services/user.service';
import { MediaService } from 'src/app/services/media.service';
import { CasesService } from 'src/app/services/cases.service';
import { SelectMenuService } from 'src/app/services/select-menu.service';
@Component({
  selector: 'app-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
})
export class MenuPage implements OnInit {
  isAuthenticated: boolean = false;
  isAdmin: boolean = false;
  customMenu:boolean = false
  listShape:boolean = false
  public selectedIndex = 0;
  public appPages:any = [
   
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
  ];

  [key: string]: any;
  constructor(
    public auth:AuthService,
    public user:UserService,
    public icon:IconsService,
    public router:Router,
    public popoverController:PopoverController,
    public nav:NavService,
    private translate:TranslateService,
    private navParams:NavParams,
    public media:MediaService,
    private selectMenuservice:SelectMenuService,
    private casesService:CasesService
  ) { }

  ngOnInit() {
    if(this.navParams.get('pages')){
      this.appPages = this.navParams.get('pages')
    }
    if(this.navParams.get('customMenu')){
      this.customMenu = this.navParams.get('customMenu')
    }
    if(this.navParams.get('listShape')){
      this.listShape = this.navParams.get('listShape')
    }
    const path = window.location.pathname;
    this.auth.isAuthenticated().subscribe((auth) => {
      this.isAuthenticated = auth;
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
    return this.translate.instant(text)
  }

  dismissPopover(value:any){
    this.selectMenuservice.selectedItem = value
    this.popoverController.dismiss(value)
  }

}
