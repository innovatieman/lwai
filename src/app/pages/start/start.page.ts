import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { theme } from 'highcharts';
import { AuthService } from 'src/app/auth/auth.service';
import { CasesService } from 'src/app/services/cases.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { IconsService } from 'src/app/services/icons.service';
import { InfoService } from 'src/app/services/info.service';
import { MediaService } from 'src/app/services/media.service';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';
import { SubscriptionsService } from 'src/app/services/subscriptions.service';


@Component({
  selector: 'app-start',
  templateUrl: './start.page.html',
  styleUrls: ['./start.page.scss'],
})
export class StartPage implements OnInit {
  @HostListener('window:resize', ['$event'])
  onResize(){
    this.media.setScreenSize()
    this.rf.detectChanges()
  }
  selectedConversation:any = null
  conversations$:any
  activeCategory:any = 'transformative' //null

  constructor(
    public nav:NavService,
    public cases:CasesService,
    public auth:AuthService,
    public icon:IconsService,
    private modalService:ModalService,
    public infoService:InfoService,
    public media:MediaService,
    private rf:ChangeDetectorRef,
    private firestore:FirestoreService,
    public subscriptionService:SubscriptionsService,
  ) { }

  ngOnInit() {
    this.conversations$ = this.auth.getConversations();
    this.auth.userInfo$.subscribe(userInfo => {
      if (userInfo) {
        this.subscriptionService.getActiveCourses(this.auth.userInfo.uid)
      }
    });
  }

  selectCategory(category:any){
    if(this.activeCategory === category){
      this.activeCategory = null
    }
    else{
      this.activeCategory = category
    }
  }

  selectConversation(conversation:any){
    if(this.selectedConversation === conversation){
      this.selectedConversation = null
    }
    else{
      this.selectedConversation = conversation
    }
  }

  startConversation(caseItem:any){

    this.modalService.showConversationStart(caseItem).then((res)=>{
      console.log(res)
      if(res){
        localStorage.setItem('activatedCase',caseItem.id)
        localStorage.setItem('personalCase',JSON.stringify(caseItem))
        this.nav.go('conversation/'+this.selectedConversation+'/'+caseItem.id)
      }
    })
  }

  continueConversation(conversation:any){
    localStorage.setItem('continueConversation',"true")
    localStorage.setItem('conversation',JSON.stringify(conversation))
    this.nav.go('conversation/'+conversation.conversationType+'/'+conversation.caseId)
  }

  get activeConversation():any{
    let conversation:any = null
    this.conversations$.forEach((e:any) => {
      for(let i = 0; i < e.length; i++){
        if(!e[i].closed){
          conversation = e[i]
        }
      }
    })
    return conversation
  }
  
  activeThemes(conversation:string):any{
    let themes:any = []
    let themeIds:any = []
    this.cases.all.forEach((e:any) => {
       if(themeIds.indexOf(e.theme) === -1 && e.conversation === conversation){
        themeIds.push(e.theme)
        themes.push(this.infoService.getTheme(e.theme))
       }
    })
    return themes
  }

  get activeCategories():any{
    let cats:any = []
    let catIds:any = []
    this.cases.all.forEach((e:any) => {
       if(catIds.indexOf(e.conversation) === -1){
        catIds.push(e.conversation)
        cats.push(e.conversation)
       }
    })
    return cats
  }

  themeInPreferences(themeId:string):boolean{
    let found = false
    if(!this.auth?.userInfo?.preferences){
      return false
    }
    for(let key in this.auth.userInfo.preferences.themes){
      if(key === themeId && this.auth.userInfo.preferences.themes[key]){
        found = true
      }
    }
    return found
  }

  removeActiveConversation(event:Event){
    event.stopPropagation()
    this.modalService.showConfirmation('Are you sure you want to remove this conversation?').then((res)=>{
      console.log(res)
      if(res){
        console.log('users',this.auth.userInfo.uid,'conversations',this.activeConversation.conversationId)
        this.firestore.deleteSub('users',this.auth.userInfo.uid,'conversations',this.activeConversation.conversationId)
      }
    })
  }

  


}
