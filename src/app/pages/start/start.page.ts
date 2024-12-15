import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/auth/auth.service';
import { CasesService } from 'src/app/services/cases.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { NavService } from 'src/app/services/nav.service';


@Component({
  selector: 'app-start',
  templateUrl: './start.page.html',
  styleUrls: ['./start.page.scss'],
})
export class StartPage implements OnInit {
  selectedConversation:any = null
  constructor(
    public nav:NavService,
    public cases:CasesService,
    public auth:AuthService
  ) { }

  ngOnInit() {
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
    localStorage.setItem('activatedCase',caseItem.id)
    this.nav.go('conversation/'+this.selectedConversation+'/'+caseItem.id)
  }
}
