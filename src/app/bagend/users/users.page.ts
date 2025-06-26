import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
})
export class UsersPage implements OnInit {
  users:any = []
  activeTab: number = 0;
  constructor(
    private firestore:FirestoreService,
    public helpers:HelpersService,
    private functions:AngularFireFunctions
  ) { }

  ngOnInit() {
    this.loadUsers()
  }
  
  loadUsers(){
    this.firestore.get('users').subscribe((users) => {
      this.users = users.map((user:any) => {
        return { id: user.payload.doc.id, ...user.payload.doc.data() }
      })
      //sotrt by registeredAt
      this.users.sort((a:any,b:any) => {
        return a.registeredAt > b.registeredAt ? -1 : 1
      })
    })
  }
  
  changeTab(tab:number){
    this.activeTab = tab
  }

  update(field?:string){
    console.log(this.activeTab,field)
    const scrollPosition = window.scrollY;
    if(field){
      this.firestore.set('users',this.users[this.activeTab].id,this.users[this.activeTab][field],field).then(()=>{
        setTimeout(() => {
          window.scrollTo(0, scrollPosition);
        }, 100);
      })
    }


  }

  confirmEmail(user:any){
    this.functions.httpsCallable('confirmEmail')({email:user.email}).subscribe((result) => {
      console.log(result);
    })
  }

  setCredits(){
    for(let i=0;i<this.users.length;i++){
      if(this.users[i].id=='ajXfTi2yGjeIQcwQkYyul4yU7FS2'){
        console.log(this.users[i])
        this.firestore.updateSub('users',this.users[i].id,'credits','credits',{amount:300,added:this.users[i].registeredAt,created:this.users[i].registeredAt,expires:this.users[i].registeredAt+(365*24*60*60),source:'register'}).then(()=>{

        })
      }
    }
  }

}
