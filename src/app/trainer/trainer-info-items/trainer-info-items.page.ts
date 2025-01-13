import { Component, OnInit, ViewChild } from '@angular/core';
import { IonSelect } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/auth/auth.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { InfoService } from 'src/app/services/info.service';
import { ModalService } from 'src/app/services/modal.service';
@Component({
  selector: 'app-trainer-info-items',
  templateUrl: './trainer-info-items.page.html',
  styleUrls: ['./trainer-info-items.page.scss'],
})
export class TrainerInfoItemsPage implements OnInit {
  @ViewChild('selectNew', { static: false }) selectNew!: IonSelect;
  [x: string]: any;
  activeTab: number = 0;
  infoItems: any[] = []
  item: any = {}
  categories: any[] = []
  newCourse: string = ''
  constructor(
    public firestore:FirestoreService,
    public icon:IconsService,
    private modal:ModalService,
    public helpers:HelpersService,
    public translate:TranslateService,
    public infoService:InfoService,
    public auth:AuthService
  ) { }


  ngOnInit() {
    this.load('infoItems_trainer',this.auth.userInfo.uid)
  }


  load(type:string,trainerId:string,callback?:Function){
      this.firestore.query(type,'trainerId',trainerId).subscribe((items) => {
        this[type.split('_')[0]] = items.map((item:any) => {
          return { id: item.payload.doc.id, ...item.payload.doc.data() }
        })
        if(callback) callback()
      })
  }

  categoryInfo(id:string){
    if(!this.categories.length) return {}
    let category = this.categories.filter((e:any) => {
      return e.id === id
    })
    return category[0]
  }

  changeTab(tab:number){
    this.activeTab = tab
  }
  selectItem(item:any){
    this.item = item
    console.log(item)   
  }

  update(field?:string){
    const scrollPosition = window.scrollY;
    if(field){
      this.firestore.set('infoItems_trainer',this.item.id,this.item[field],field).then(()=>{
        setTimeout(() => {
          window.scrollTo(0, scrollPosition);
        }, 100);
      })
    }
  }
  
  add(){
    this.modal.inputFields('Add a new info module','Enter the name of the module',[{title:'Module Name',type:'text',value:''}],(result:any) => {
      if(result.data){
        this.firestore.create('infoItems_trainer',
          {
            title:result.data[0].value,
            description:'',
            intro:'',
            content:'',
            audio_url:'',
            type:'text',
            video_url:'',
            avatarName:'',
            photo:'',
            trainerId:this.auth.userInfo.uid,
            courseId:'',
          }).then(()=>{
            this.load('infoItems_trainer',this.auth.userInfo.uid)
          })
      }
      // console.log(result)
    })
  }

  deleteCourse(){
    this.modal.showConfirmation('Are you sure you want to delete this course?').then((result:any) => {
      if(result){
        this.firestore.delete('cases_trainer',this.item.id)
        this.item = {}
        this.load('courses_trainer',this.auth.userInfo.uid)
      }
    })
  }

  editHtml(field:any){
    this.modal.editHtmlItem({value:this.item[field]},(response:any)=>{
      if(response.data){
        this.item[field] = response.data.value
        this.update(field)
      }
    })
  }


}
