import { Component, OnInit } from '@angular/core';
// import {faUser,faUsers,faQuestion,faBullseye,faSitemap,faUserCog,faHandsHelping,faGlobeEurope,faRoad,faMap,faSignOutAlt,faSignInAlt,faList} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from 'src/app/auth/auth.service';
import { IconsService } from 'src/app/services/icons.service';
import { Router } from '@angular/router';
import { PopoverController } from '@ionic/angular';
import { NavService } from 'src/app/services/nav.service';
import { TranslateService } from '@ngx-translate/core';
import { UserService } from 'src/app/services/user.service';
@Component({
  selector: 'app-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
})
export class MenuPage implements OnInit {
  isAuthenticated: boolean = false;
  isAdmin: boolean = false;

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
    

  ];
  public editPages:any = [
  
   
    {
      title: 'Cases',
      icon: 'faSuitcase',
      url: '/bagend/cases',
      isVisitor:false,
      isAdmin:true,
      isUser:false,
    },
    {
      title: 'Categories',
      icon: 'faSitemap',
      url: '/bagend/categories',
      isVisitor:false,
      isAdmin:true,
      isUser:false,
    },
    {
      title: 'Instructions',
      icon: 'faCogs',
      url: '/bagend/instructions',
      isVisitor:false,
      isAdmin:true,
      isUser:false,
    },
    {
      title: 'Attitudes',
      icon: 'faGrinTongue',
      url: '/bagend/attitudes',
      isVisitor:false,
      isAdmin:true,
      isUser:false,
    },
    {
      title: 'Public info',
      icon: 'faInfoCircle',
      url: '/bagend/public-info',
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
      title: 'Test Avatar',
      icon: 'faUsers',
      url: '/avatar',
      isVisitor:false,
      isAdmin:true,
      isUser:false,
    },
   
  ];

  [key: string]: any;
  constructor(
    public auth:AuthService,
    public user:UserService,
    public icons:IconsService,
    public router:Router,
    public popoverController:PopoverController,
    public nav:NavService,
    private translate:TranslateService
  ) { }

  ngOnInit() {
    const path = window.location.pathname;
    this.auth.isAuthenticated().subscribe((auth) => {
      this.isAuthenticated = auth;
    });

    this.auth.isAdmin().subscribe((admin) => {
      this.isAdmin = admin;
    });

    // if (path !== undefined) {
    //   this.selectedIndex = this.appPages.findIndex(page => page.title.toLowerCase() === path.toLowerCase());
    // }
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

}
