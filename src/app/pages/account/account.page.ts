import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/auth/auth.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { InfoService } from 'src/app/services/info.service';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';
import { SubscriptionsService } from 'src/app/services/subscriptions.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-account',
  templateUrl: './account.page.html',
  styleUrls: ['./account.page.scss'],
})
export class AccountPage implements OnInit {
  activeTab = 'account';
  account:any = {}
  subscriptions$: any;
  hasActiveSubscription: boolean = false;
  conversations$: any;
  activeSubscriptionTypes: any; 

  menuItems:any=[
    {title:'Mijn gegevens',tab:'account',icon:'faPen'},
    {title:'Mijn profiel',tab:'profile',icon:'faSlidersH'},
    {title:'Mijn cursussen',tab:'courses',icon:'faGraduationCap'},
    {title:'Mijn gesprekken',tab:'conversations',icon:'faComments'},
    {title:'Mijn prestaties',tab:'badges',icon:'faAward'},
    {title:'Mijn abonnementen',tab:'subscriptions',icon:'faStar'},
    {title:'Betaalinstellingen',tab:'payment',icon:'faCreditCard'},
    {title:'Credits',tab:'credits',icon:'faCoins'},

  ]


  constructor(
    private firestore: FirestoreService,
    public auth: AuthService,
    private toast:ToastService,
    public icon:IconsService,
    public helper:HelpersService,
    public translate:TranslateService,
    public nav:NavService,
    public subscriptionsService:SubscriptionsService,
    private modalService:ModalService,
    public infoService:InfoService
  ) { }

  ngOnInit() {
    let countInterval = 0
    let interval = setInterval(()=>{
      this.account = JSON.parse(JSON.stringify(this.auth.userInfo))
      if(this.account.email){
        clearInterval(interval)
      }
      countInterval++
      if(countInterval > 100){
        clearInterval(interval)
      }
    },200)

    this.subscriptions$ = this.subscriptionsService.getSubscriptions();
    this.conversations$ = this.auth.getConversations();

    // Controleren op actieve abonnementen
    this.subscriptionsService.hasActiveSubscription().subscribe((active) => {
      this.hasActiveSubscription = active;
    });

  }

  changeTab(tab:string){
    this.activeTab = tab
  }

  updateAccount(){
    this.firestore.set('users',this.auth.userInfo.uid,this.account.displayName,'displayName').then(()=>{
      this.toast.show('Account gegevens bijgewerkt')
    })
  }
  updatePreference(){
    
    let obj:any =  {
      preferences:JSON.parse(JSON.stringify(this.account.preferences))
    }
    this.firestore.update('users',this.auth.userInfo.uid,obj)
  }

  openConversation(conversation:any){
    localStorage.setItem('continueConversation',"true")
    localStorage.setItem('conversation',JSON.stringify(conversation))
    this.nav.go('conversation/'+conversation.conversationType+'/'+conversation.caseId)
  }



  upgrade(type:string,paymentMethod:string){
    this.subscriptionsService.upgradeSubscription(type,paymentMethod,(response:any)=>{
      console.log(response)
      this.toast.show('Abonnement geüpgraded')
    })
  }  

  deleteConversation(event:any,conversation:any){
    event.stopPropagation()
    console.log(conversation)
    this.modalService.showConfirmation('Weet je zeker dat je dit gesprek wilt verwijderen?').then((response)=>{
      if(response){
        this.firestore.deleteSub('users',this.auth.userInfo.uid, 'conversations',conversation.conversationId).then(()=>{
          this.toast.show('Gesprek verwijderd')
        })
      }
    })
  }
}
