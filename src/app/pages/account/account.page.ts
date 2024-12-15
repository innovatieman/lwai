import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/auth/auth.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { NavService } from 'src/app/services/nav.service';
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
  constructor(
    private firestore: FirestoreService,
    public auth: AuthService,
    private toast:ToastService,
    public icon:IconsService,
    public helper:HelpersService,
    public translate:TranslateService,
    private nav:NavService
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

    this.subscriptions$ = this.auth.getSubscriptions();
    this.conversations$ = this.auth.getConversations();
    // Controleren op actieve abonnementen
    this.auth.hasActiveSubscription().subscribe((active) => {
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

  openConversation(conversation:any){
    localStorage.setItem('continueConversation',"true")
    localStorage.setItem('conversation',JSON.stringify(conversation))
    this.nav.go('conversation/'+conversation.conversationType+'/'+conversation.caseId)
  }
}