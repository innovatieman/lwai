import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { NavService } from 'src/app/services/nav.service';

@Component({
  selector: 'app-search-conversations',
  templateUrl: './search-conversations.page.html',
  styleUrls: ['./search-conversations.page.scss'],
})
export class SearchConversationsPage implements OnInit {
  conversationId:any = null
  conversations:any[] = []
  email:any = null
  constructor(
    private firestore:FirestoreService,
    private functions:AngularFireFunctions,
    public nav:NavService,
    public helpers:HelpersService,

  ) { }

  ngOnInit() {
  }

  searchConversation(){
    this.functions.httpsCallable('admin_get_conversation')({conversationId:this.conversationId}).subscribe((data:any) => {
      console.log(data)
      this.conversations.push(data)
    })
  }

  searchAllConversations(){
    this.functions.httpsCallable('admin_get_all_conversations_from_user')({email:this.email}).subscribe((data:any) => {
      console.log(data)
      this.conversations = data.data
    })
  }

  test(item:any){
    let itemData = item.data
    itemData.id = item.id

    localStorage.setItem('continueConversation',"true")
    localStorage.setItem('conversation',JSON.stringify(itemData))
    this.nav.go('conversation/'+itemData.conversationType+'/'+itemData.caseId)

  }
}
