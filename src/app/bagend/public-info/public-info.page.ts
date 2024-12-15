import { Component, OnInit } from '@angular/core';
import { FirestoreService } from 'src/app/services/firestore.service';
import { IconsService } from 'src/app/services/icons.service';

@Component({
  selector: 'app-public-info',
  templateUrl: './public-info.page.html',
  styleUrls: ['./public-info.page.scss'],
})
export class PublicInfoPage implements OnInit {
  info:any = []
  activeTab: number = 0;
  constructor(
    public firestore:FirestoreService,
    public icon:IconsService
  ) { }

  ngOnInit() {
    this.loadInfo()
  }

  private loadInfo() {
    this.firestore.get('public_info').subscribe((info) => {
      this.info = info.map((infoItem:any) => {
        return { id: infoItem.payload.doc.id, ...infoItem.payload.doc.data() }
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
      this.firestore.set('public_info',this.info[this.activeTab].id,this.info[this.activeTab][field],field).then(()=>{
        setTimeout(() => {
          window.scrollTo(0, scrollPosition);
        }, 100);
      })
    }

  }
}