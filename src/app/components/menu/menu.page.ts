import { Component, Input, OnInit } from '@angular/core';
// import {faUser,faUsers,faQuestion,faBullseye,faSitemap,faUserCog,faHandsHelping,faGlobeEurope,faRoad,faMap,faSignOutAlt,faSignInAlt,faList} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from 'src/app/auth/auth.service';
import { IconsService } from 'src/app/services/icons.service';
import { Router } from '@angular/router';
import { ModalController, PopoverController } from '@ionic/angular';
import { NavService } from 'src/app/services/nav.service';
import { TranslateService } from '@ngx-translate/core';
import { UserService } from 'src/app/services/user.service';
import { MediaService } from 'src/app/services/media.service';
import { SelectMenuService } from 'src/app/services/select-menu.service';
import { InputFieldsPage } from '../modals/input-fields/input-fields.page';
import { FirestoreService } from 'src/app/services/firestore.service';
import { ToastService } from 'src/app/services/toast.service';
import { environment } from 'src/environments/environment';
import { tutorialService } from 'src/app/services/tutorial.service';
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
  @Input() customList:boolean = false
  @Input() shareMenu:boolean = false
  public selectedIndex = 0;
  @Input() pages:any 
  accountPages:any [] = [
    {
      title: this.translateService.instant('page_account.title'),
      url: '/account',
      icon: 'faUser',
      isVisitor:false,
      isAdmin:true,
      isUser:true
    },
    {
      title: this.translateService.instant('marketplace.add_training'),
      url: '/marketplace/manual',
      icon: 'faGraduationCap',
      isVisitor:false,
      isAdmin:true,
      isUser:true
    },
    {
      title: 'Restart tutorial',
      action: ["tutorialService","restartTutorial"],
      icon: 'faArrowRight',
      isVisitor:false,
      isAdmin:true,
      isUser:false
    },
  ]
  versionNumber = environment.version
  appPages:any = [
   
    // {
    //   title: 'Start',
    //   url: '/start',
    //   icon: 'faHome',
    //   isVisitor:false,
    //   isAdmin:true,
    //   isUser:true
    // },
    {
      title: this.translateService.instant('page_account.title'),
      url: '/account',
      icon: 'faUser',
      isVisitor:false,
      isAdmin:true,
      isUser:true
    },
    {
      title: this.translateService.instant('marketplace.add_training'),
      url: '/marketplace/manual',
      icon: 'faGraduationCap',
      isVisitor:false,
      isAdmin:true,
      isUser:true
    },
    {
      title: 'Restart tutorial',
      action: ["tutorialService","restartTutorial"],
      icon: 'faArrowRight',
      isVisitor:false,
      isAdmin:true,
      isUser:false
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
    // {
    //   title: 'Agents en Settings',
    //   icon: 'faCogs',
    //   url: '/bagend/engine',
    //   isVisitor:false,
    //   isAdmin:true,
    //   isUser:false,
    // },
    // {
    //   title: 'Cases',
    //   icon: 'faSuitcase',
    //   url: '/bagend/cases',
    //   isVisitor:false,
    //   isAdmin:true,
    //   isUser:false,
    // },
    // {
    //   title: 'Users',
    //   icon: 'faUsers',
    //   url: '/bagend/users',
    //   isVisitor:false,
    //   isAdmin:true,
    //   isUser:false,
    // },
    // {
    //   title: 'All Conversations',
    //   icon: 'faComments',
    //   url: '/bagend/conversations',
    //   isVisitor:false,
    //   isAdmin:true,
    //   isUser:false,
    // },
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
    private modalController:ModalController,
    private firestore:FirestoreService,
    private toast:ToastService,
    private tutorialService:tutorialService,
  ) { }

  ngOnInit() {
    if(this.pages){
      this.appPages = this.pages
    }
    // console.log(this.appPages)
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
            url:window.location.href
          })
          this.toast.show(this.translateService.instant('menu.feedback_sent'))
        }
      })
      return await modalItem.present()
  }
}
