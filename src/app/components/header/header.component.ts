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
import { SelectMenuService } from 'src/app/services/select-menu.service';
import { SwUpdate } from '@angular/service-worker';
import { fromEvent, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

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
  @Input() showNoCredits:boolean = false
  @Input() showName:boolean = false
  @Input() back_url:string = ''
  @Output() buttonResponse = new EventEmitter()
  isVerified: boolean = false;
  showCredits: boolean = false;
  // private resizeTimeout: any;
  private resizeSubscription: Subscription | undefined;
  // @HostListener('window:resize', ['$event'])
  // onResize(){
  //   clearTimeout(this.resizeTimeout);
  //   this.resizeTimeout = setTimeout(() => {
  //       this.media.setScreenSize()
  //       this.ref.detectChanges()
  //     }, 200);
  // }
  credits:any = {total:0}
  isAuthenticated: boolean = false;
  isAdmin: boolean = false;
  isTrainer: boolean = false;
  isEmployee: boolean = false;
  isOrgAdmin: boolean = false;
  pathname: string = window.location.pathname.split('/').pop() || '';
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
      action:'trainerMenu',
      page:'trainer',
      title:'Trainer',
      dropDown:this.auth.organisations.length>1 ? true : false,
      isVisitor:false,
      isAdmin:true,
      isUser:false,
      isTrainer:true,
      isOrgAdmin:true,
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
      isOrgAdmin:false,
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
    {
      title: "Backup",
      icon: 'faDatabase',
      url: '/bagend/backup',
    },
    {
      title: "Create Trainer/organisation",
      icon: 'faFolderPlus',
      url: '/bagend/create-trainer',
    },
    {
      title: "mailFlow",
      icon: 'faEnvelope',
      url: '/bagend/mailflow',
    },
    {
      title: "Uitbetalingen",
      icon: 'faPiggyBank',
      url: '/bagend/payouts',
    },

    
    // {
    //   title: 'All Conversations',
    //   icon: 'faComments',
    //   url: '/bagend/conversations',
    // },
  ]
  // trainerItems:any=[
  //   {
  //     title: 'Cursussen maken',
  //     icon: 'faBook',
  //     url: '/trainer/modules',
  //   },
  //   {
  //     title: 'Actieve cursussen',
  //     icon: 'faUsers',
  //     url: '/trainer/dashboard',
  //   },
  // ]
  
  
  constructor(
    public nav:NavService,
    public auth:AuthService,
    public icon:IconsService,
    public media:MediaService,
    private ref:ChangeDetectorRef,
    private popoverController:PopoverController,
    public translateService:TranslateService,
    private firestore:FirestoreService,
    private modalController:ModalController,
    private toast:ToastService,
    private selectMenuservice:SelectMenuService,
    private swUpdate: SwUpdate,
  ) { }

  ngAfterViewInit() {
    this.resizeSubscription = fromEvent(window, 'resize')
    .pipe(debounceTime(200))
    .subscribe(() => {
      this.media.setScreenSize();
      this.ref.detectChanges();
    });
  }

  ngOnDestroy() {
    this.resizeSubscription?.unsubscribe();
  }

  ngOnInit() {
    this.credits = this.auth.credits
    this.auth.creditsChanged.subscribe((credits:any)=>{
      this.credits = this.auth.credits
      this.showCredits = true
      this.ref.detectChanges()
    })
    this.auth.employeeLoaded.subscribe((employee)=>{
      this.isEmployee = employee;
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

    this.auth.isOrgAdmin().subscribe((orgAdmin)=>{
      this.isOrgAdmin = orgAdmin
    })
  }

  action(item:any){
    this[item.action]()
  }
  doNothing(event?:Event){
    if(event){
      event.stopPropagation()
    }
  }

  goto(page:string,event?:Event){
    if(event){
      event.stopPropagation()
    }
    this.nav.go(page)
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
    // console.log('trainerMenu',this.auth.organisations.length)
    if(this.auth.organisations.length==1){
      this.nav.activeOrganisationId = this.auth.organisations[0].id
      if(window.location.pathname.indexOf('trainer')==-1){
        this.nav.go('/trainer/dashboard')
      }
      return
    }

    let list = []
    for(let i=0;i<this.auth.organisations.length;i++){
      list.push({
        title:this.auth.organisations[i].name,
        icon:this.auth.organisations[i].logo ? '' :'faStar',
        image:this.auth.organisations[i].logo ? this.auth.organisations[i].logo : '',
        // url:'/trainer/trainings',
        logo:this.auth.organisations[i].logo !=undefined,
        id:this.auth.organisations[i].id,
        value:this.auth.organisations[i].id,
      })
    }

    this.shortMenu = await this.popoverController.create({
      component: MenuPage,
      componentProps:{
        customMenu:true,
        pages:list
      },
      cssClass: 'customMenu',
      event: event,
      translucent: false,
      reference:'trigger',
    });
    this.shortMenu.shadowRoot.lastChild.lastChild['style'].cssText = 'border-radius: 24px !important;';
    await this.shortMenu.present();
    await this.shortMenu.onWillDismiss().then((result:any)=>{
      // console.log(this.selectMenuservice.selectedItem)
      if(this.selectMenuservice.selectedItem){
        this.nav.changeOrganisation(this.selectMenuservice.selectedItem.id)
        if(window.location.pathname.indexOf('/trainer')==-1){
          this.nav.go('/trainer/dashboard')
        }
      }
    })
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

    if( this.isOrgAdmin && page.isOrgAdmin){
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
      console.log('fields',fields)
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
          console.log('result',result)
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

    reload(){
      if(this.swUpdate?.isEnabled){
        this.swUpdate.activateUpdate().then(() => {
          console.log('Update activated, reloading...');
          setTimeout(() => {
            window.location.href = window.location.href
            document.location.reload();
          }, 2000);
        });
      }
      else{
        console.log(caches);
        // Clear the cache
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            caches.delete(cacheName).then(() => {
              console.log(`Cache ${cacheName} deleted.`);
            });
          });
        });
        // Reload the page
        window.location.href = window.location.href
        // window.location.reload();
      }
    }

}
