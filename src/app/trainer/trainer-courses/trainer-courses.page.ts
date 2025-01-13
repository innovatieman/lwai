
import { Component, OnInit, ViewChild } from '@angular/core';
import { IonSelect, ItemReorderEventDetail } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/auth/auth.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { InfoService } from 'src/app/services/info.service';
import { ModalService } from 'src/app/services/modal.service';

@Component({
  selector: 'app-trainer-courses',
  templateUrl: './trainer-courses.page.html',
  styleUrls: ['./trainer-courses.page.scss'],
})
export class TrainerCoursesPage implements OnInit {
  @ViewChild('selectNewCase', { static: false }) selectNewCase!: IonSelect;
  [x: string]: any;
  activeTab: number = 0;
  courses: any[] = []
  cases: any[] = []
  infoItems: any[] = []
  item: any = {}
  categories: any[] = []
  newCourse: string = ''
  newCaseConversation: string = ''
  caseItem: any = {}
  infoItem: any = {}

  constructor(
    public firestore:FirestoreService,
    public icon:IconsService,
    private modal:ModalService,
    public helpers:HelpersService,
    public translate:TranslateService,
    public infoService:InfoService,
    public auth:AuthService,
  ) { }


  ngOnInit() {
    this.loadCategories();
    this.load('courses_trainer',this.auth.userInfo.uid,() => {if(this.courses[0]&&!this.item.id){this.item = this.courses[0]}})
    this.load('cases_trainer',this.auth.userInfo.uid)
    this.load('infoItems_trainer',this.auth.userInfo.uid)
  }


  load(type:string,trainerId:string,callback?:Function){
      this.firestore.query(type,'trainerId',trainerId).subscribe((items) => {
        this[type.split('_')[0]] = items.map((item:any) => {
          return { id: item.payload.doc.id, ...item.payload.doc.data() }
        })
        if(callback) callback()
          // console.log(type,type.split('_')[0],this[type.split('_')[0]])  
      })
  }

  private loadCategories() {
    this.firestore.get('categories').subscribe((categories) => {
      this.categories = categories.map((category:any) => {
        return { id: category.payload.doc.id, ...category.payload.doc.data() }
      })
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
    this.caseItem = {}
    this.infoItem = {}
    this.item = item
  }

  getItem(id:string,type:string){
    let item = this[type+'s'].filter((e:any) => {
      return e.id === id
    })
    if(!item.length) return {}
    return item[0]
  }


  update(type:string,field?:string){
    const scrollPosition = window.scrollY;
    if(field){
      let isArrayOnPurpose = false
      if(field === 'itemIds'){
        isArrayOnPurpose = true
      }
      let item = this.item
      if(type=='cases'){
        item = this.caseItem
      }
      else if(type=='infoItems'){
        item = this.infoItem
      }
      this.firestore.set(type+'_trainer',item.id,item[field],field,isArrayOnPurpose).then(()=>{
        setTimeout(() => {
          window.scrollTo(0, scrollPosition);
        }, 100);
      })
    }
  }
  
  add(){
    this.modal.inputFields('Add a new course','Enter the name of the course',[{title:'Course Name',type:'text',value:''}],(result:any) => {
      if(result.data){
        this.firestore.create('courses_trainer',
          {
            title:result.data[0].value,
            role:'',
            description:'',
            trainerId:this.auth.userInfo.uid,
            caseIds:[]
          }).then(()=>{
            this.load('courses_trainer',this.auth.userInfo.uid)
          })
      }
      console.log(result)
    })
  }

  deleteCourse(){
    this.modal.showConfirmation('Are you sure you want to delete this course?').then((result:any) => {
      if(result){
        this.firestore.delete('courses_trainer',this.item.id)
        this.item = {}
        this.load('courses_trainer',this.auth.userInfo.uid)
      }
    })
  }


  addInfoItem(item:any){
    let newInfoItem = JSON.parse(JSON.stringify(item))
    delete newInfoItem.id
    newInfoItem.courseId = this.item.id
    this.firestore.create('infoItems_trainer',newInfoItem,(result:any) => {
      if(!this.item.itemIds){this.item.itemIds = []}
      this.item.itemIds.push({id:result.id,type:'infoItem'})
      this.update('courses','itemIds')
    })
  }


  addInfo(){
    let infoList:any[] = []
    this.infoItems.forEach((item:any) => {
      if(!item.courseId){
        infoList.push(item)
      }
    })
    this.modal.selectItem('Select an info item',infoList,(result:any) => {
      if(result.data){
        let newInfoItem = JSON.parse(JSON.stringify(result.data))
        delete newInfoItem.id
        newInfoItem.courseId = this.item.id
        console.log(newInfoItem)
        this.firestore.create('infoItems_trainer',newInfoItem,(result:any) => {
          console.log(this.item)
          if(!this.item.itemIds){this.item.itemIds = []}
          this.item.itemIds.push({id:result.id,type:'infoItem'})
          this.update('courses','itemIds')
        })
      }
      
    })
  }

  createCase(){
    this.selectNewCase.open()
  }
  addCase(item:any){
    let newCaseItem = JSON.parse(JSON.stringify(item))
        delete newCaseItem.id
        newCaseItem.courseId = this.item.id
        this.firestore.create('cases_trainer',newCaseItem,(result:any) => {
          if(!this.item.itemIds){this.item.itemIds = []}
          this.item.itemIds.push({id:result.id,type:'case'})
          this.update('courses','itemIds')
        })
  }

  newCase(){
    if(this.newCaseConversation){
      this.firestore.create('cases_trainer',
        {
          conversation:this.newCaseConversation,
          title:'New Case',
          role:'',
          description:'',
          attitude:1,
          trainerId:this.auth.userInfo.uid,
          courseId:''
        },(result:any)=>{
          this.newCaseConversation = ''
          this.caseItem = this.getCase(result.id)
        })
    }
  }

  editCase(caseItem:any){
    this.infoItem = {}
    this.caseItem = caseItem
  }

  deleteCase(caseItem:any){
    this.modal.showConfirmation('Are you sure you want to delete this case?').then((result:any) => {
      if(result){
        this.firestore.delete('cases_trainer',caseItem.id)
        this.caseItem = {}
      }
    })
  }
  getCase(id:string){
    let item = this.cases.filter((e:any) => {
      return e.id === id
    })
    if(!item.length) return {}
    return item[0]
  }

  editInfoItem(infoItem:any){
    this.caseItem = {}
    this.infoItem = infoItem
  }

  newInfoItem(){
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
          },(result:any)=>{
            this.load('infoItems_trainer',this.auth.userInfo.uid)
            setTimeout(() => {
              this.editInfoItem(this.getInfoItem(result.id))
            }, 300);
          })
      }
      // console.log(result)
    })
  }

  deleteInfoItem(infoItem:any){
    this.modal.showConfirmation('Are you sure you want to delete this info module?').then((result:any) => {
      if(result){
        this.firestore.delete('infoItems_trainer',infoItem.id)
        this.infoItem = {}
      }
    })
  }


  getInfoItem(id:string){
    let item = this.infoItems.filter((e:any) => {
      return e.id === id
    })
    if(!item.length) return {}
    return item[0]
  }


  handleReorderItems(event: CustomEvent<ItemReorderEventDetail>) {
    const draggedItem = this.item.itemIds.splice(event.detail.from, 1)[0];
    this.item.itemIds.splice(event.detail.to, 0, draggedItem);
    event.detail.complete();
    this.update('courses','itemIds')
  }

  removeItem(index:number){
    this.modal.showConfirmation('Are you sure you want to delete this item?').then((result:any) => {
      if(result){
        let item = this.item.itemIds[index]
        this.firestore.delete(item.type+'s_trainer',item.id)
        this.item.itemIds.splice(index,1)
        this.update('courses','itemIds')
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

  closeCase(){
    this.caseItem = {}
  }
  closeInfoItem(){
    this.infoItem = {}
  }
}
