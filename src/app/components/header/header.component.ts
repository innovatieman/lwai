import { ChangeDetectorRef, Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';
import { NavService } from 'src/app/services/nav.service';
import { MenuPage } from '../menu/menu.page';
import { PopoverController } from '@ionic/angular';
import { AuthService } from 'src/app/auth/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})


export class HeaderComponent  implements OnInit {
  [x:string]:any; 
  @Input() title:string = ''
  @Input() page:string = ''
  @Input() noMenuList:boolean = false
  @Input() back:boolean = false
  @Input() button:string = ''
  @Output() buttonResponse = new EventEmitter()
  isVerified: boolean = false;
  @HostListener('window:resize', ['$event'])
  onResize(){
    this.media.setScreenSize()
    this.ref.detectChanges()
  }
  
  isAuthenticated: boolean = false;
  isAdmin: boolean = false;
  isTrainer: boolean = false;


  menuItems:any=[
    {
      url:'start',
      page:'start',
      title:'Start',
      isVisitor:false,
      isAdmin:true,
      isUser:false,
      isTrainer:true,
    },

    {
      url:'trainer/courses',
      // action:'trainerMenu',
      page:'trainer',
      title:'Trainer',
      // dropDown:false,
      isVisitor:false,
      isAdmin:true,
      isUser:false,
      isTrainer:true,
    },
    {
      action:'adminMenu',
      page:'admin',
      title:'Admin',
      dropDown:true,
      isVisitor:false,
      isAdmin:true,
      isUser:false,
      isTrainer:false,
    },
    
  ]

  adminItems:any=[
    {
      title: 'Agents en Settings',
      icon: 'faCogs',
      url: '/bagend/engine',
    },
    {
      title: 'Cases',
      icon: 'faSuitcase',
      url: '/bagend/cases',
    },
    // {
    //   title: 'Users',
    //   icon: 'faUsers',
    //   url: '/bagend/users',
    // },
    {
      title: 'Types',
      icon: 'faHandPointRight',
      url: '/bagend/types',
    },
    {
      title: "Foto's",
      icon: 'faCameraRetro',
      url: '/bagend/photo-generator',
    },
    {
      title: "Tutorials",
      icon: 'faUserGraduate',
      url: '/bagend/tutorials',
    },
    {
      title: "Token analyse",
      icon: 'faCoins',
      url: '/bagend/token-analysis',
    },
    {
      title: "User messages",
      icon: 'faComments',
      url: '/bagend/user-messages',
    },
    {
      title: "Social media",
      icon: 'faShareAlt',
      url: '/bagend/socials',
    },

    
    // {
    //   title: 'All Conversations',
    //   icon: 'faComments',
    //   url: '/bagend/conversations',
    // },
  ]
  trainerItems:any=[
    {
      title: 'Cursussen maken',
      icon: 'faBook',
      url: '/trainer/courses',
    },
    {
      title: 'Actieve cursussen',
      icon: 'faUsers',
      url: '/trainer/users',
    },
  ]

  constructor(
    public nav:NavService,
    public auth:AuthService,
    public icon:IconsService,
    public media:MediaService,
    private ref:ChangeDetectorRef,
    private popoverController:PopoverController,
  ) { }

  ngOnInit() {
    const path = window.location.pathname;
    this.auth.isAuthenticated().subscribe((auth) => {
      if(auth){
        this.isAuthenticated = true
      }
    });
    this.auth.isVerified().subscribe((auth) => {
      if(auth){
        this.isVerified = true
      }
    });

    this.auth.isAdmin().subscribe((admin) => {
      this.isAdmin = admin;
    });
    this.auth.hasActive('trainer').subscribe((trainer)=>{
      this.isTrainer = trainer
    })
  }

  action(item:any){
    this[item.action]()
  }

  shortMenu:any
  async showshortMenu(event:any){
    this.shortMenu = await this.popoverController.create({
      component: MenuPage,
      componentProps:{},
      cssClass: 'shortMenu',
      event: event,
      translucent: false,
      reference:'trigger',
    });
    await this.shortMenu.present();
  }

  async adminMenu(){
    
    this.shortMenu = await this.popoverController.create({
      component: MenuPage,
      componentProps:{
        customMenu:true,
        pages:this.adminItems
      },
      cssClass: 'customMenu',
      event: event,
      translucent: false,
      reference:'trigger',
    });
    this.shortMenu.shadowRoot.lastChild.lastChild['style'].cssText = 'border-radius: 24px !important;';

    await this.shortMenu.present();

    console.log('adminMenu')
    
  }

  async trainerMenu(){
    this.shortMenu = await this.popoverController.create({
      component: MenuPage,
      componentProps:{
        customMenu:true,
        pages:this.trainerItems
      },
      cssClass: 'customMenu',
      event: event,
      translucent: false,
      reference:'trigger',
    });
    this.shortMenu.shadowRoot.lastChild.lastChild['style'].cssText = 'border-radius: 24px !important;';
    await this.shortMenu.present();
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

    if (this.isTrainer && page.isTrainer) {
      return true;
    }

    return false;
  }

  get countShowPages(){
   let count = 0
   this.menuItems.forEach((item:any)=>{
     if(this.shouldShowPage(item)){
       count++
     }
   }
   )
   return count
  }
  buttonClick(event:Event){
    this.buttonResponse.emit(event)
  }

  

}
