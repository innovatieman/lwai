
import { Component, OnInit, ViewChild } from '@angular/core';
import { IonSelect, ItemReorderEventDetail } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/auth/auth.service';
import { CasesService } from 'src/app/services/cases.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { InfoService } from 'src/app/services/info.service';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';
import * as moment from 'moment';

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
    private casesService:CasesService,
    public nav:NavService,
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
      this.categories = categories.map( (category:any) => {
        // add OpeningMessage tot the category
        let catData = category.payload.doc.data()
        this.getOpeningMessage(category.payload.doc.id,(result:any) => {
          this.addToCategory(category.payload.doc.id,'openingMessage',result)
        })
        return { id: category.payload.doc.id, ...catData }
        // console.log(catData)
      })
    })
  }

  addToCategory(category:string,field:string,value:any){
    for(let i=0;i<this.categories.length;i++){
      if(this.categories[i].id === category){
        this.categories[i][field] = value
      }
    }
  }

  categoryInfo(id:string){
    if(!this.categories.length) return {}
    let category = this.categories.filter((e:any) => {
      return e.id === id
    })
    return category[0]
  }

  async getOpeningMessage(category:string,callback:Function){
    let openingMessage = ''
    this.infoService.loadPublicInfo('categories',category,'content','agents','reaction',(result:any) => {
      openingMessage = result
      callback(openingMessage)
    })
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
      if(field === 'itemIds'||field === 'itemIdList'){
        isArrayOnPurpose = true
      }
      let item = this.item
      if(type=='cases'){
        item = this.caseItem
      }
      else if(type=='infoItems'){
        item = this.infoItem
      }
      if(field === 'itemIds'){
        if(!item.itemIdList){item.itemIdList = []}
        item.itemIdList = item.itemIds.map((e:any) => e.id)
        this.firestore.set(type+'_trainer',item.id,item.itemIdList,'itemIdList',isArrayOnPurpose)
      }
      this.firestore.set(type+'_trainer',item.id,item[field],field,isArrayOnPurpose).then(()=>{
        setTimeout(() => {
          window.scrollTo(0, scrollPosition);
        }, 100);
      })
    }
    else{
      this.firestore.set(type+'_trainer',this.item.id,this.item).then(()=>{
        setTimeout(() => {
          window.scrollTo(0, scrollPosition);
        }, 100);
      })
    }
  }
  
  add(){

    this.modal.inputFields('Nieuwe module template','Geef de module een naam',[
      {title:'Titel van de journey*',type:'text',value:'',required:true},
      {title:'Korte beschrijving*',type:'textarea',value:this.item.description,required:true},
      {title:'Prijs',type:'number',value:20},
      {title:'Valuta*',type:'select',value:'EUR (€)',options:['CREDITS','EUR (€)','USD ($)','GBP (£)','JPY (¥)']},
      {title:'Foto URL*',type:'text',value:this.item.photo,required:true},
      {title:'Thema*',type:'select',value:this.item.theme,options:[1,2,3,4,5,6,7,8,9,10],required:true},
      {title:'Type module*',type:'select',value:'program',options:['program','practice'],required:true},
    ],(result:any) => {
      // console.log(result)
      if(result.data){
        this.firestore.create('courses_trainer',
          {
            title:result.data[0].value,
            trainerId:this.auth.userInfo.uid,
            itemIds:[],
            description:result.data[1].value,
            price:result.data[2].value,
            currency:result.data[3].value,
            photo:result.data[4].value,
            theme:result.data[5].value,
            module_type:result.data[6].value,
            status:'concept'
          }).then(()=>{
            this.load('courses_trainer',this.auth.userInfo.uid)
          })
      }


    })



    // this.modal.inputFields('Add a new course','Enter the name of the course',[{title:'Course Name',type:'text',value:''}],(result:any) => {
    //   if(result.data){
    //     this.firestore.create('courses_trainer',
    //       {
    //         title:result.data[0].value,
    //         role:'',
    //         description:'',
    //         trainerId:this.auth.userInfo.uid,
    //         caseIds:[]
    //       }).then(()=>{
    //         this.load('courses_trainer',this.auth.userInfo.uid)
    //       })
    //   }
    //   console.log(result)
    // })
  }

  editCourse(){
    this.modal.inputFields('Nieuwe module template','Geef de module een naam',[
      {title:'Titel van de journey*',type:'text',value:this.item.title,required:true},
      {title:'Korte beschrijving*',type:'textarea',value:this.item.description,required:true},
      {title:'Prijs',type:'number',value:this.item.price},
      {title:'Valuta*',type:'select',value:this.item.currency,options:['EUR (€)','USD ($)','GBP (£)','JPY (¥)']},
      {title:'Foto URL*',type:'text',value:this.item.photo,required:true},
      {title:'Thema*',type:'select',value:this.item.theme,options:[1,2,3,4,5,6,7,8,9,10],required:true},
      {title:'Type module*',type:'select',value:this.item.module_type,options:['program','practice'],required:true},
    ],(result:any) => {
      // console.log(result)
      if(result.data){
        this.item.title = result.data[0].value
        this.item.description = result.data[1].value
        this.item.price = result.data[2].value
        this.item.currency = result.data[3].value
        this.item.photo = result.data[4].value
        this.item.theme = result.data[5].value
        this.item.module_type = result.data[6].value
        this.update('courses')
      }
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

  move(itemIndex:number, direction:number) {
    let temp = this.item.itemIds[itemIndex];
      this.item.itemIds[itemIndex] = this.item.itemIds[itemIndex + direction];
      this.item.itemIds[itemIndex + direction] = temp;

    this.update('courses','itemIds')
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

  createCase(){
    this.selectNewCase.open()
  }

  newCase(){
    if(this.newCaseConversation){
      let newCaseItem:any = this.casesService.defaultCase(this.newCaseConversation,this.categoryInfo(this.newCaseConversation).openingMessage)
      newCaseItem.trainerId = this.auth.userInfo.uid
      this.newCaseConversation = ''
      newCaseItem.title=''
      this.modal.showConversationStart({admin:true,conversationInfo:this.categoryInfo(newCaseItem.conversation),...newCaseItem})
          .then((res:any)=>{
            console.log(res)
            if(res){
              delete res.admin
              delete res.conversationInfo
              delete res.existing
              if(!res.title || res.title == "New Case"){
                res.title = res.role
              }
              this.firestore.create('cases_trainer',res,(response:any)=>{
                console.log(response)
                this.load('cases_trainer',this.auth.userInfo.uid)
                this.caseItem = this.getCase(response.id)
                this.caseItem.id = response.id
                this.firestore.update('cases_trainer',response.id,{id:response.id})
              })
            }
          })



      // this.firestore.create('cases_trainer',newCaseItem,(result:any)=>{
      //     this.newCaseConversation = ''
      //     this.caseItem = this.getCase(result.id)
      //     this.caseItem.id = result.id
      //     this.firestore.update('cases_trainer',result.id,{id:result.id})
          
      //   })
    }
  }

  editCase(caseItem:any){
    this.infoItem = {}
    this.caseItem = caseItem
  }

  editCaseAll(caseItem?:any){
    if(!caseItem){
      this.caseItem = this.caseItem
    }
    this.modal.showConversationStart({admin:true,conversationInfo:this.categoryInfo(this.caseItem.conversation),...caseItem})
    .then((res:any)=>{
      if(res){
        delete res.admin
        delete res.conversationInfo
        delete res.existing
        this.firestore.set('cases_trainer',res.id,res).then(()=>{
          this.load('cases_trainer',this.auth.userInfo.uid)
          this.caseItem = this.getCase(res)
        })
      }
    })

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

  editCourseCase(index:number){
   let item = this.item.itemIds[index]
   console.log(item)
    if(item.type === 'case'){
      this.editCase(this.getCase(item.id))
    }
    else if(item.type === 'infoItem'){
      this.editInfoItem(this.getInfoItem(item.id))
    }
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

  activateCourse(){

    this.modal.inputFields('Publiceer een journey','',[
      {title:'Titel van de journey*',type:'text',value:this.item.title,required:true},
      {title:'Korte beschrijving*',type:'textarea',value:this.item.description,required:true},
      {title:'Startdatum*',type:'date',value:moment().format('YYYY-MM-DD'),required:true},
      {title:'Einddatum',type:'date',value:''},
      {title:'Max aantal deelnemers',type:'number',value:0},
      {title:'Prijs',type:'number',value:this.item.price},
      {title:'Valuta*',type:'select',value:this.item.currency,options:['CREDITS','EUR (€)','USD ($)','GBP (£)','JPY (¥)']},
      {title:'Foto URL*',type:'text',value:this.item.photo,required:true},
      {title:'Thema*',type:'select',value:this.item.theme,options:[1,2,3,4,5,6,7,8,9,10],required:true},
      {title:'Deze module mag openbaar getoond worden',type:'toggle',value:false},
    ],(result:any) => {
      // console.log(result)
      if(result.data){
        let newItem = JSON.parse(JSON.stringify(this.item))
        delete newItem.id
        newItem.title = result.data[0].value
        newItem.description = result.data[1].value
        newItem.startdate = result.data[2].value
        newItem.enddate = result.data[3].value
        newItem.maxUsers = result.data[4].value
        newItem.price = result.data[5].value
        newItem.currency = result.data[6].value
        newItem.photo = result.data[7].value
        newItem.theme = result.data[8].value
        newItem.public = result.data[9].value
        newItem.status = 'active'
        this.firestore.create('active_courses',newItem,(response:any) => {
          if(response.id){
            this.nav.go('/trainer/users/'+response.id)
          }
        })
      }
    
    })


    // this.modal.showConfirmation('Are you sure you want to activate this course?').then((result:any) => {
    //   if(result){
    //     this.item.status = 'active'
    //     this.firestore.create('active_courses',this.item,(response:any) => {
    //       if(response.id){
    //         this.nav.go('/trainer/users/'+response.id)
    //       }
    //     })
    //   }
    // })
  }
}
