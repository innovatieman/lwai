import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/auth/auth.service';
import { FirestoreService } from 'src/app/services/firestore.service';

@Component({
  selector: 'app-token-analysis',
  templateUrl: './token-analysis.page.html',
  styleUrls: ['./token-analysis.page.scss'],
})
export class TokenAnalysisPage implements OnInit {
  conversationId:string = 'NuLZ2W3rWzUuWbqE5WbI'
  tokenList:any = []
  userId:string = ''
  constructor(
    private firestore:FirestoreService,
    public auth:AuthService,
  ) { }

  ngOnInit() {
  }


  getConversation(){
    if(!this.conversationId){
      return
    }
    if(!this.userId){
      this.userId = this.auth.userInfo.uid
    }
    this.firestore.getSubSub('users',this.userId,'conversations',this.conversationId,'tokens').subscribe((tokens:any)=>{
      this.tokenList = tokens.map((token:any) => {
        return { id: token.payload.doc.id, ...token.payload.doc.data() }
      })
      // console.log(this.tokenList)
      this.tokenList = this.tokenList.sort((a:any,b:any) => a.timestamp - b.timestamp)

    })
  }
}
