import { ChangeDetectorRef, Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';
import { NavService } from 'src/app/services/nav.service';
import { MenuPage } from '../menu/menu.page';
import { ModalController, PopoverController } from '@ionic/angular';
import { AuthService } from 'src/app/auth/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { FirestoreService } from 'src/app/services/firestore.service';
import { InputFieldsPage } from '../modals/input-fields/input-fields.page';
import { ToastService } from 'src/app/services/toast.service';

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
  @Input() inactiveCredits:boolean = false
  @Output() buttonResponse = new EventEmitter()
  isVerified: boolean = false;
  showCredits: boolean = false;
  @HostListener('window:resize', ['$event'])
  onResize(){
    this.media.setScreenSize()
    this.ref.detectChanges()
  }
  credits:any = {total:0}
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
    {
      title: "Stemmen",
      icon: 'faComment',
      url: '/bagend/voices',
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
    private translateService:TranslateService,
    private firestore:FirestoreService,
    private modalController:ModalController,
    private toast:ToastService
  ) { }

  ngOnInit() {
    this.credits = this.auth.credits
    this.auth.creditsChanged.subscribe((credits:any)=>{
      this.credits = this.auth.credits
      this.showCredits = true
      this.ref.detectChanges()
    })
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
  doNothing(){}

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

  async openFeedback(){
      let fields = [
        {
          title:this.translateService.instant('menu.feedback_type'),
          type:'select',
          required:true,
          value:'feedback',
          optionKeys:[
            {value:'feedback',title:this.translateService.instant('menu.feedback')},
            {value:'question',title:this.translateService.instant('menu.feedback_question')},
            {value:'remark',title:this.translateService.instant('menu.feedback_remark')},
          ]
        },
        {
          title:this.translateService.instant('menu.feedback_subject'),
          type:'text',
          required:true,
          value:'',
        },
        {
          title:this.translateService.instant('menu.feedback_message'),
          type:'textarea',
          // placeholder:this.translateService.instant('feedback'),
          required:true,
          value:'',
        },
        {
          title:this.translateService.instant('menu.feedback_file'),
          type:'file',
          // placeholder:this.translateService.instant('feedback'),
          required:false,
          value:'',
        }
      ]
  
        const modalItem = await this.modalController.create({
          component:InputFieldsPage,
          componentProps:{
            text:this.translateService.instant('menu.feedback_text'),
            fields:fields,
            title:this.translateService.instant('menu.feedback'),
            extraData:{}
          },
          cssClass:'infoModal',
        })
        modalItem.onWillDismiss().then(result=>{
          if(result.data){
            this.firestore.create('user_messages',{
              type:result.data[0].value,
              subject:result.data[1].value,
              message:result.data[2].value,
              user:this.auth.userInfo.uid,
              displayName:this.auth.userInfo.displayName,
              email:this.auth.userInfo.email,
              date:new Date(),
              timestamp:new Date().getTime(),
              read:false,
              archived:false,
              url:window.location.href,
              attachment:result.data[3].value || ''
            })
            this.toast.show(this.translateService.instant('menu.feedback_sent'))
          }
        })
        return await modalItem.present()
    }

}
