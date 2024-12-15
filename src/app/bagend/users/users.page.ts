import { Component, OnInit } from '@angular/core';
import { FirestoreService } from 'src/app/services/firestore.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
})
export class UsersPage implements OnInit {
  users:any = []
  activeTab: number = 0;
  constructor(
    private firestore:FirestoreService
  ) { }

  ngOnInit() {
    this.loadUsers()
  }

  loadUsers(){
    this.firestore.get('users').subscribe((users) => {
      this.users = users.map((user:any) => {
        return { id: user.payload.doc.id, ...user.payload.doc.data() }
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

}
