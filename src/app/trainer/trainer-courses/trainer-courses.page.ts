
import { Component, OnInit, ViewChild } from '@angular/core';
import { IonSelect, ItemReorderEventDetail, PopoverController } from '@ionic/angular';
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
import { MenuPage } from 'src/app/components/menu/menu.page';
import { SelectMenuService } from 'src/app/services/select-menu.service';
import { FilterKeyPipe } from 'src/app/pipes/filter-key.pipe';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { MediaService } from 'src/app/services/media.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-trainer-courses',
  templateUrl: './trainer-courses.page.html',
  styleUrls: ['./trainer-courses.page.scss'],
})
export class TrainerCoursesPage implements OnInit {
  @ViewChild('selectNewCase', { static: false }) selectNewCase!: IonSelect;
  [x: string]: any;
  // activeTab: number = 0;
  courses: any[] = []
  cases: any[] = []
  active_courses: any[] = []
  infoItems: any[] = []
  item: any = {}
  active_item: any = {}
  categories: any[] = []
  newCourse: string = ''
  newCaseConversation: string = ''
  caseItem: any = {}
  infoItem: any = {}
  activeTab:string = 'active_courses'
  routeSubscription:any
  extraFilters: any = {
    public: []
  }
  searchTerm: string = '';
  showFilterSmall: boolean = false;
  levels: any = [
    {nr:1},
    {nr:2},
    {nr:3},
    {nr:4},
    {nr:5}
  ];
  showHtml:boolean = false;
  configModules={
    toolbar: {
      container:[
        ['bold', 'italic', 'underline'],
        [{ 'color': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        [{ 'align': [] }],
        [{'indent': '-1'}, {'indent': '+1'}],
        ['link'],
        ['clean'],
        ['HTML'],
      ],
      clipboard: {
        matchVisual: false
      }
    }
  }

  showBasics: boolean = false;
  showUserInput: boolean = false;
  showUserInputMore: boolean = true;
  showCasus: boolean = false;
  showUserOptions: boolean = false;

  constructor(
    public firestore:FirestoreService,
    public icon:IconsService,
    public modalService:ModalService,
    public helper:HelpersService,
    public translate:TranslateService,
    public infoService:InfoService,
    public auth:AuthService,
    private casesService:CasesService,
    public nav:NavService,
    private popoverController: PopoverController,
    private selectMenuservice:SelectMenuService,
    private filterKeyPipe:FilterKeyPipe,
    private route:ActivatedRoute,
    public media:MediaService,
    private toast:ToastService
  ) { }

  ionViewDidEnter(){
    this.select('','')
  }

  ngOnInit() {
    this.route.params.subscribe((params:any) => {
      if(params.tab){
        this.activeTab = params.tab
      }
      else{
        this.nav.go('trainer/courses/active_courses')
      }
    })
    this.loadCategories();

    this.load('courses_trainer',this.auth.userInfo.uid,() => {
      let checkInt = setInterval(() => {
        if(this.infoService.conversation_types.length){
          clearInterval(checkInt)
          for(let i = 0; i < this.active_courses.length; i++){
            this.active_courses[i].conversationTypes = this.infoService.getConversationType('',this.active_courses[i].types,true)
          }
        }
      }, 200);
    })

    this.loadActive('active_courses',this.auth.userInfo.uid,()=>{
      this.routeSubscription  = this.route.params.subscribe((params) => {
        if(params['course_id']){
          this.active_courses.forEach((course) => {
            if(course.id == params['course_id']){
              course.show = true
              if(this.routeSubscription){
                this.routeSubscription.unsubscribe()
              }
            }
            
          })
        }
      })
      this.active_courses.forEach((course) => {
        this.loadItems(course)
      })
      let checkInt = setInterval(() => {
        if(this.infoService.conversation_types.length){
          clearInterval(checkInt)
          for(let i = 0; i < this.active_courses.length; i++){
            this.active_courses[i].conversationTypes = this.infoService.getConversationType('',this.active_courses[i].types,true)
          }
        }
      }, 200);
    })

    this.load('cases_trainer',this.auth.userInfo.uid,() => {
      let checkInt = setInterval(() => {
        if(this.infoService.conversation_types.length){
          clearInterval(checkInt)
          for(let i = 0; i < this.cases.length; i++){
            this.cases[i].conversationTypes = this.infoService.getConversationType('',this.cases[i].types,true)
          }
        }
      }, 200);
    })

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

  loadActive(type:string,trainerId:string,callback?:Function){
    this.firestore.query(type,'trainerId',trainerId).subscribe((items) => {
      this[type] = items.map((item:any) => {
        return { id: item.payload.doc.id, ...item.payload.doc.data() }
      })
      if(callback) callback()
    })
  }


  loadItems(course:any){
    this.firestore.getSub('active_courses',course.id,'items').subscribe((items) => {
      course.items = items.map((item:any) => {
        return { id: item.payload.doc.id, ...item.payload.doc.data() }
      })
    })
  }

  private loadCategories() {
    let catsSubscription = this.firestore.get('categories').subscribe((categories) => {
      this.categories = categories.map( (category:any) => {
        // add OpeningMessage tot the category
        let catData = category.payload.doc.data()
        this.getOpeningMessage(category.payload.doc.id,(result:any) => {
          this.addToCategory(category.payload.doc.id,'openingMessage',result)
        })
        return { id: category.payload.doc.id, ...catData }
        // console.log(catData)
      })
      catsSubscription.unsubscribe()
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

  select(type:string,item:any){
    this.caseItem = {}
    this.infoItem = {}
    this.active_item = {}
    this.item = {}
    if(type){
      this[type] = item
    }
  }

  get itemIsActive(){
    if(
      Object.keys(this.active_item).length > 0 ||
      Object.keys(this.caseItem).length > 0 ||
      Object.keys(this.infoItem).length > 0 ||
      Object.keys(this.item).length > 0
    ){
      return true
    }
    return false
  }

  itemIsSelected(item:string){
    if(Object.keys(this[item]).length){
      return true
    }
    return false
  }


  getItem(id:string,type:string){
    let item:any = {}
    if(type=='practice'){
      item = this['cases'].filter((e:any) => {
        return e.id === id
      })
    }
    else{
      item = this[type+'s'].filter((e:any) => {
        return e.id === id
      })
    }
    if(!item.length) return {}
    return item[0]
  }


  update(type:string,field?:string,html?:boolean){
    const scrollPosition = window.scrollY;
    if(field){
      let isArrayOnPurpose = false
      if(field === 'itemIds'||field === 'itemIdList' || field === 'types' || field == 'tags'){
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
        this.firestore.set(type+'_trainer',item.id,item.itemIds,'itemIds',isArrayOnPurpose)

      }
      else{
        if(html){
          item[field] = item[field]
          .split('</ol><p><br></p><p>').join('</ol>')
          .split('</p><p><br></p><ol>').join('<ol>')
          .split('</ul><p><br></p><p>').join('</ul>')
          .split('</p><p><br></p><ul>').join('<ul>')
          .split('<p><br></p>').join('<br>')
          .split('</p><br><p>').join('<br><br>')
          .split('</p><p>').join('<br>')
          .split('&nbsp;').join(' ')
        }
        this.firestore.set(type+'_trainer',item.id,item[field],field,isArrayOnPurpose).then(()=>{
          setTimeout(() => {
            window.scrollTo(0, scrollPosition);
          }, 100);
        })
      }
    }
    else{
      this.firestore.set(type+'_trainer',this.item.id,this.item).then(()=>{
        setTimeout(() => {
          window.scrollTo(0, scrollPosition);
        }, 100);
      })
    }
  }
  
  addModule(){

    this.modalService.inputFields('Nieuwe module template','Geef de module een naam',[
      {title:'Titel van de module*',type:'text',value:'',required:true},
      {title:'Korte beschrijving*',type:'textarea',value:this.item.description,required:true},
      // {title:'Prijs',type:'number',value:20},
      // {title:'Valuta*',type:'select',value:'EUR (€)',options:['EUR (€)','USD ($)','GBP (£)','JPY (¥)']},
      // {title:'Foto URL*',type:'text',value:this.item.photo,required:true},
      // {title:'Thema*',type:'select',value:this.item.theme,options:[1,2,3,4,5,6,7,8,9,10],required:true},
      // {title:'Type module*',type:'select',value:'program',options:['program','practice'],required:true},
    ],(result:any) => {
      // console.log(result)
      if(result.data){
        this.firestore.create('courses_trainer',
          {
            title:result.data[0].value,
            trainerId:this.auth.userInfo.uid,
            itemIds:[],
            description:result.data[1].value,
            price:19,
            currency:'EUR (€)',
            photo:'',
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

  // editCourse(){
  //   this.modalService.inputFields('Nieuwe module template','Geef de module een naam',[
  //     {title:'Titel van de journey*',type:'text',value:this.item.title,required:true},
  //     {title:'Korte beschrijving*',type:'textarea',value:this.item.description,required:true},
  //     {title:'Prijs',type:'number',value:this.item.price},
  //     {title:'Valuta*',type:'select',value:this.item.currency,options:['EUR (€)','USD ($)','GBP (£)','JPY (¥)']},
  //     {title:'Foto URL*',type:'text',value:this.item.photo,required:true},
  //     {title:'Thema*',type:'select',value:this.item.theme,options:[1,2,3,4,5,6,7,8,9,10],required:true},
  //     {title:'Type module*',type:'select',value:this.item.module_type,options:['program','practice'],required:true},
  //   ],(result:any) => {
  //     // console.log(result)
  //     if(result.data){
  //       this.item.title = result.data[0].value
  //       this.item.description = result.data[1].value
  //       this.item.price = result.data[2].value
  //       this.item.currency = result.data[3].value
  //       this.item.photo = result.data[4].value
  //       this.item.theme = result.data[5].value
  //       this.item.module_type = result.data[6].value
  //       this.update('courses')
  //     }
  //   })
  // }

  deleteCourse(){
    if(this.itemIsSelected('active_item')){
      this.modalService.showConfirmation('Are you sure you want to archive this course?').then((result:any) => {
        if(result){
          this.active_item.status = 'archived'
          this.updateActiveCourse('status')
          // this.firestore.delete('active_courses',this.active_item.id)
          this.active_item = {}
        }
      })
    }
    else{
      this.modalService.showConfirmation('Are you sure you want to delete this course template?').then((result:any) => {
        if(result){
          this.firestore.delete('courses_trainer',this.item.id)
          this.item = {}
          this.load('courses_trainer',this.auth.userInfo.uid)
        }
      })
    }
  }

  move(itemIndex:number, direction:number,casus_index?:number){
    if(casus_index!=undefined){
      let temp = this.item.itemIds[itemIndex].caseIds[casus_index];
      this.item.itemIds[itemIndex].caseIds[casus_index] = this.item.itemIds[itemIndex].caseIds[casus_index + direction];
      this.item.itemIds[itemIndex].caseIds[casus_index + direction] = temp;
      this.update('courses','itemIds')
    }
    else{
      let temp = this.item.itemIds[itemIndex];
      this.item.itemIds[itemIndex] = this.item.itemIds[itemIndex + direction];
      this.item.itemIds[itemIndex + direction] = temp;
      this.update('courses','itemIds')
    }

  }

  addInfoItem(item:any){
    let newInfoItem = JSON.parse(JSON.stringify(item))
    delete newInfoItem.id
    newInfoItem.courseId = this.item.id
    this.firestore.create('infoItems_trainer',newInfoItem,(result:any) => {
      if(!this.item.itemIds){this.item.itemIds = []}
      this.item.itemIds.push({id:result.id,type:'infoItem'})
      this.update('courses','itemIds')
      console.log(this.item)
    })
  }


  addInfo(){
    let infoList:any[] = []
    this.infoItems.forEach((item:any) => {
      if(!item.courseId){
        infoList.push(item)
      }
    })
    this.modalService.selectItem('Select an info item',infoList,(result:any) => {
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


  addCase(practiceId:string,item:any){
    let newCaseItem = JSON.parse(JSON.stringify(item))
    delete newCaseItem.id
    newCaseItem.courseId = this.item.id
    console.log(newCaseItem)
    this.firestore.create('cases_trainer',newCaseItem,(result:any) => {
      if(!this.item.itemIds){this.item.itemIds = []}
      let index = this.item.itemIds.findIndex((e:any) => e.id === practiceId)
      if(!this.item.itemIds[index].caseIds){this.item.itemIds[index].caseIds = []}
      this.item.itemIds[index].caseIds.push({id:result.id,type:'case'})

      console.log(this.item.itemIds)

      this.update('courses','itemIds')
    })

  }

  createCase(){
    this.selectNewCase.open()
  }

  // async newCase(){
  //   await this.selectcategory((result:any) => {
  //     this.newCaseConversation = result.id
  //     if(this.newCaseConversation){
  //       let newCaseItem:any = this.casesService.defaultCase(this.newCaseConversation,this.categoryInfo(this.newCaseConversation).openingMessage)
  //       newCaseItem.trainerId = this.auth.userInfo.uid
  //       this.newCaseConversation = ''
  //       newCaseItem.title=''
  //       this.modalService.showConversationStart({admin:true,conversationInfo:this.categoryInfo(newCaseItem.conversation),...newCaseItem})
  //           .then((res:any)=>{
  //             console.log(res)
  //             if(res){
  //               delete res.admin
  //               delete res.conversationInfo
  //               delete res.existing
  //               if(!res.title || res.title == "New Case"){
  //                 res.title = res.role
  //               }
  //               this.firestore.create('cases_trainer',res,(response:any)=>{
  //                 console.log(response)
  //                 this.load('cases_trainer',this.auth.userInfo.uid)
  //                 this.caseItem = this.getCase(response.id)
  //                 this.caseItem.id = response.id
  //                 this.firestore.update('cases_trainer',response.id,{id:response.id})
  //               })
  //             }
  //           })
  
  
  
  //       // this.firestore.create('cases_trainer',newCaseItem,(result:any)=>{
  //       //     this.newCaseConversation = ''
  //       //     this.caseItem = this.getCase(result.id)
  //       //     this.caseItem.id = result.id
  //       //     this.firestore.update('cases_trainer',result.id,{id:result.id})
            
  //       //   })
  //     }
  //   })

  // }

  editCase(caseItem:any,inCourse?:boolean){
    if(inCourse){
      this.inCourse = true
    }
    this.infoItem = {}
    this.caseItem = caseItem
  }

  editCaseAll(caseItem?:any){
    if(!caseItem){
      this.caseItem = this.caseItem
    }
    caseItem = JSON.parse(JSON.stringify(this.caseItem))
    caseItem.conversationInfo = this.categoryInfo(caseItem.conversation)
    caseItem.admin = true
    this.modalService.showConversationStart(caseItem)
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
    this.modalService.showConfirmation('Are you sure you want to delete this case?').then((result:any) => {
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

  inCourse:boolean = false
  editInfoItem(infoItem:any,inCourse?:boolean){
    if(inCourse){
      this.inCourse = true
    }
    this.caseItem = {}
    this.infoItem = infoItem
  }

  editInfoItemType(){
    let list:any =[
      {title:'Text',value:'text'},
      {title:'Video',value:'video'},
      // {title:'Audio',value:'audio'},
      {title:'Image only',value:'image_only'},
      // {title:'Quiz',value:'quiz'},
    ]
    this.showListMenu(list,(result:any) => {
      if(this.selectMenuservice.selectedItem){
        this.infoItem.type = this.selectMenuservice.selectedItem.value
        this.update('infoItems','type')
      }
    })
  }

  async upload(itemType:string,field:string){
    this.media.selectedFile = await this.media.selectFile()
    this.media.uploadImage(this.media.selectedFile,(result:any) => {
      console.log(result)
      if(result?.result){
        this.infoItem[field] = result.result.url
        this.update(itemType,field)
      }
    })
  }

  async uploadToCourse(field:string){
    this.media.selectedFile = await this.media.selectFile()
    this.media.uploadImage(this.media.selectedFile,(result:any) => {
      console.log(result)
      if(result?.result){
        this.item[field] = result.result.url
        this.update('courses',field)
      }
    })
  }


  async uploadVideo(itemType:string,field:string){
    this.media.selectVideo((result:any) => {
      console.log(result)
      if(result?.url){
        this.infoItem[field] = result.url.split('raw-videos%2F')[1]
        this.update(itemType,field)
      }
    })
  }

  
    


  newInfoItem(){
    this.modalService.inputFields('Add a new knowledge item','Enter the name of the item',[{title:'Item Name',type:'text',value:''}],(result:any) => {
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
    this.modalService.showConfirmation('Are you sure you want to delete this info item?').then((result:any) => {
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

  editCourseCase(index:number,caseIndex?:number,inCourse?:boolean){
    let item = this.item.itemIds[index]
    if(caseIndex!=undefined){
      item = this.item.itemIds[index].caseIds[caseIndex]
    }
    console.log(item)
    if(item.type === 'case'){
      this.editCase(this.getCase(item.id),inCourse)
    }
    else if(item.type === 'infoItem'){
      this.editInfoItem(this.getInfoItem(item.id),inCourse)
    }
    else if(item.type === 'practice'){
      let practiceItem = this.getCase(item.id) 
      this.modalService.inputFields('Bewerken','',
        [
          {title:'Titel',type:'text',value:practiceItem.title,required:true},
          {title:'Omschrijving',type:'textarea',value:item.description},
        ]
        ,(result:any) => {
          console.log(practiceItem,result,item)
          if(result.data){
            practiceItem.title = result.data[0].value
            practiceItem.description = result.data[1].value || ''
            console.log(practiceItem)
            delete practiceItem.id
            this.firestore.set('cases_trainer',item.id,practiceItem)
            // this.update('cases','itemIds')
          }
        })
    }

  }


  removeItem(index:number,caseIndex?:number){
    this.modalService.showConfirmation('Are you sure you want to delete this item?').then((result:any) => {
      if(result){
        let item = this.item.itemIds[index]
        if(caseIndex!=undefined){
          item = this.item.itemIds[index].caseIds[caseIndex]
          this.item.itemIds[index].caseIds.splice(caseIndex,1)
          this.update('courses','itemIds')
        }
        else{
          if(item.type === 'practice'){
            this.firestore.delete('cases_trainer',item.id)
          }
          else{
            this.firestore.delete(item.type+'s_trainer',item.id)
          }
          this.item.itemIds.splice(index,1)
          this.update('courses','itemIds')
        }
      }
    })
  }

  editHtml(field:any){
    this.modalService.editHtmlItem({value:this.item[field]},(response:any)=>{
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

    this.modalService.inputFields('Publiceer een module','',[
      {title:'Titel van de module*',type:'text',value:this.item.title,required:true},
      {title:'Korte beschrijving*',type:'textarea',value:this.item.description,required:true},
      {title:'Startdatum*',type:'date',value:moment().format('YYYY-MM-DD'),required:true},
      {title:'Einddatum',type:'date',value:''},
      {title:'Max aantal deelnemers',type:'number',value:0},
      {title:'Prijs',type:'number',value:this.item.price},
      {title:'Valuta*',type:'select',value:this.item.currency,options:['CREDITS','EUR (€)','USD ($)','GBP (£)','JPY (¥)']},
      {title:'Foto URL*',type:'text',value:this.item.photo,required:true},
      {title:'Level*',type:'select',value:this.item.level ? this.item.level  : 1,options:[1,2,3,4,5],required:true},
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
            this.nav.go('/trainer/courses/active_courses')
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

  shortMenu:any
  async addCourseItem(){
    let optionList = [
      {title:'Kennis',type:'infoItem'},
      {title:'Oefenen / cases',type:'case'},
    ]
    
    this.showListMenu(optionList,async () => {
      if(this.selectMenuservice.selectedItem){
        if(this.selectMenuservice.selectedItem.type === 'infoItem'){
          this.showListMenu(this.filterKeyPipe.transform(this.infoItems,'courseId','empty'),(result:any) => {
            if(this.selectMenuservice.selectedItem){
              this.addInfoItem(this.selectMenuservice.selectedItem)
            }
          })
        }
        else if(this.selectMenuservice.selectedItem.type === 'case'){
          this.addPractice((practiceId:string)=>{
            this.showListMenu(this.filterKeyPipe.transform(this.cases,'courseId','empty'),(result:any) => {
              if(this.selectMenuservice.selectedItem){
                this.addCase(practiceId,this.selectMenuservice.selectedItem)
              }
            })
          })
        }
      }
    })
  }

  addCaseToItem(practiceId:string){
    this.showListMenu(this.filterKeyPipe.transform(this.cases,'courseId','empty'),(result:any) => {
      if(this.selectMenuservice.selectedItem){
        this.addCase(practiceId,this.selectMenuservice.selectedItem)
      }
    })
  }

  async showListMenu(list:any[],callback:Function){
    this.shortMenu = await this.popoverController.create({
      component: MenuPage,
      componentProps:{
        customMenu:true,
        pages:list,
        listShape:true,
      },
      cssClass: 'customMenu',
      event: event,
      translucent: false,
    });
    this.shortMenu.shadowRoot.lastChild.lastChild['style'].cssText = 'border-radius: 24px !important;';

    await this.shortMenu.present()
    await this.shortMenu.onWillDismiss();
    callback()
  }

  async addPractice(callback:Function){

    let newPracticeItem:any = {
      courseId:this.item.id,
      title:'Oefenen',
      description:'',
      trainerId:this.auth.userInfo.uid,
      type:'practice',
      photo:'assets/img/conversation_hologram.webp',
    }
    this.firestore.create('cases_trainer',newPracticeItem,(result:any) => {
      if(!this.item.itemIds){this.item.itemIds = []}
      this.item.itemIds.push({id:result.id,type:'practice'})
      this.update('courses','itemIds')
      callback(result.id)
    })
  }



  get currentFilterTypes() {
    return this.filterTypes();
  }
  get currentFilterLevels() {
    return this.filterLevels();
  }

  get filterIsEmpty() {
    return this.currentFilterTypes.types.length === 0 && this.currentFilterTypes.subjects.length === 0;
  }

  clearFilter(){
    for(let i = 0; i < this.infoService.conversation_types.length; i++){
      this.infoService.conversation_types[i].selected = false
      for(let j = 0; j < this.infoService.conversation_types[i].subjects.length; j++){
        this.infoService.conversation_types[i].subjects[j].selected = false
      }
    }
  }
  filterTypes() {
    let filter: any = {
      types: [],
      subjects: [],
      subjectTypes: {}
    };
  
    for (let i = 0; i < this.infoService.conversation_types.length; i++) {
      if (this.infoService.conversation_types[i].selected) {
        const conversationTypeId = this.infoService.conversation_types[i].id;
        filter.types.push(conversationTypeId);
  
        // Maak een lijst van subjects per conversationType
        filter.subjectTypes[conversationTypeId] = [];
  
        for (let j = 0; j < this.infoService.conversation_types[i].subjects.length; j++) {
          if (this.infoService.conversation_types[i].subjects[j].selected) {
            filter.subjects.push(this.infoService.conversation_types[i].subjects[j].id);
            filter.subjectTypes[conversationTypeId].push(this.infoService.conversation_types[i].subjects[j].id);
          }
        }
      }
    }
  
    return filter;
  }

  toggleFilter(filter:any,value:any){
    if(this.extraFilters[filter].indexOf(value) > -1){
      this.extraFilters[filter].splice(this.extraFilters[filter].indexOf(value),1)
    }
    else{
      this.extraFilters[filter].push(value)
    }
  }
  filterActive(filter:any,value:any){
    return this.extraFilters[filter].indexOf(value) > -1
  }

  filterLevels(){
    let levels:any = []
    for(let i = 0; i < this.levels.length; i++){
      if(this.levels[i].selected){
        levels.push(this.levels[i].nr)
      }
    }
    return levels
  }

  check(event:any){
    event.preventDefault()
    event.stopPropagation()
  }

  selectTypes(item:string,types:string[] = []){
    console.log(types)
    // types = ['family','politics']
    let items:any =[]; 
    for(let i = 0; i < this.infoService.conversation_types.length; i++){
      if(this.infoService.conversation_types[i].subjects?.length){
        items.push(this.infoService.conversation_types[i])
      }
    }
    let obj:any = {
      list:items,
      subList:'subjects',
      title:'Selecteer één of meerdere typen',
      value:types ? types : [],
    }
    this.modalService.selectMany(obj,(result:any)=>{
      console.log(result)
      if(result.data){
        this[item].types = result.data
        if(item === 'active_item'){
          this.updateActiveCourse('types',true)
        }
        else if(item === 'caseItem'){
          console.log('caseItem',this.caseItem)
          this.update('cases','types')
        }
        else if(item === 'infoItems'){
          this.update('infoItems','types')
        }
        else{
          this.update('courses','types')
        }
      }
    })
  }

  updateActiveCourse(field?:string,isArray:boolean = false){
    // const scrollPosition = window.scrollY;
    console.log(field,this.active_item,this.active_item[field!])
    if(field){
      this.firestore.set('active_courses',this.active_item.id,this.active_item[field],field,isArray).then(()=>{
        // setTimeout(() => {
        //   window.scrollTo(0, scrollPosition);
        // }, 100);
      })
    }
  }

  editActive(active_item:any,field:string,type:string){
    this.modalService.inputFields('Edit' + field,'',[{title:this.helper.capitalizeNames(field),type:type,value:active_item[field]}],(result:any) => {
      if(result.data){
        active_item[field] = result.data[0].value
        this.updateActiveCourse(field)
      }
    })
  }

  showEditor(){
    this.showHtml = false
    setTimeout(() => {
      let elements = document.getElementsByClassName("ql-container")
      for(let i=0;i<elements.length;i++){
        elements[i].setAttribute('style','height:calc(100% - 40px);border:0;')
      }
      elements = document.getElementsByClassName("ql-toolbar")
      for(let i=0;i<elements.length;i++){
        elements[i].setAttribute('style','border:0;')
      }
      setTimeout(() => {

        let htmlBtn:any = document.querySelector('.ql-HTML');
        htmlBtn.innerHTML = 'HTML'
        htmlBtn.style.width = '50px'
        htmlBtn.addEventListener('click', (event:any)=> {
          this.showHtml = true 
        });
      },300)
    },100)
  }

  async selectcategory(callback:Function){
    let list:any[] = []
    //filter out 'main'
    for(let i = 0; i < this.categories.length; i++){
      if(this.categories[i].id !== 'main'){
        list.push(this.categories[i])
      }
    }
    list = list.sort((a:any,b:any) => {
      return a.title.localeCompare(b.title)
    })
    this.modalService.selectItem('Select a category',list,(result:any) => {
      if(result.data){
        callback(result.data)
      }
    })
  }


  addTag(type:string,item:string){
    if(!this[type].tags){this[type].tags = []}

    if(this[type].tag&&!this[type].tags.includes(this[type].tag)){
      this[type].tags.push(this[type].tag)
      this.update(item,'tags')
      this[type].tag = ''
    }
  }

  removeTag(type:string,item:string,index:number){
    this[type].tags.splice(index,1)
    this.update(item,'tags')
  }


  async selectAvatar(event:Event){
    this.media.selectAvatar(event,(res:any)=>{
      console.log(res)
      if(res?.status==200&&res?.result.url){
        this.caseItem.photo = res.result.url
        this.caseItem.avatarName = ''
        this.update('cases','photo')
        this.update('cases','avatarName')
      }
      else if(res=='delete'){
        this.caseItem.photo = ''
        this.caseItem.avatarName = ''
        this.update('cases','photo')
        this.update('cases','avatarName')
      }
      else if(res.type=='library'){
        this.caseItem.photo = res.url
        this.caseItem.avatarName = ''
        this.update('cases','photo')
        this.update('cases','avatarName')
      }
    })
  }

  selectStreamingAvatar(event:Event){
    event.preventDefault()
    event.stopPropagation()
    this.modalService.selectImageLibrary({type:'streamingAvatar'},(res:any)=>{
      console.log(res)
      if(res.data){
        this.caseItem.photo = res.data.url
        this.caseItem.avatarName = res.data.avatarId
        this.update('caseItem','photo')
        this.update('caseItem','avatarName')
      }
    })
  }

  tagsBadge(tags:string[] | undefined){
    if(!tags) return ''
    let badge = ''
    for(let i = 0; i < tags.length; i++){
        badge += tags[i]
        if(i<tags.length-1){
          badge += ', '
      }
    }
    return badge
  }


  caseNotready(){
    let check = 
      this.caseItem?.title == '' || 
      this.caseItem?.role == '' ||
      this.caseItem?.user_info == '' ||
      ! this.caseItem?.level ||
      !this.caseItem?.attitude ||
      !this.caseItem?.steadfastness ||
      this.caseItem?.conversation == '' ||
      !this.caseItem?.translate ||
      this.caseItem?.photo == '' ||
      (
        this.caseItem?.editable_by_user?.free_answer == true &&
        this.caseItem?.free_question == ''
      )

      return check
  }

  caseReady(part:string){
    let check = false
    switch(part){
      case 'title':
        check = this.caseItem?.title && this.caseItem?.user_info
        break;
      case 'basics':
        check = this.caseItem?.role && this.caseItem?.conversation && this.caseItem?.level && this.caseItem?.attitude && this.caseItem?.steadfastness
        break;
      case 'looks':
        check = this.caseItem?.photo
        break;
      case 'settings':
        check = this.caseItem.translate && this.caseItem?.open_to_user
        break;
      case 'input':
        check = ((this.caseItem.openingMessage && this.caseItem.editable_by_user.openingMessage) || !this.caseItem.editable_by_user.openingMessage) && ((this.caseItem.editable_by_user.free_answer && this.caseItem?.free_question) || !this.caseItem.editable_by_user.free_answer)
        break;
      default:
        check = false
    }
    return check
  }

  async startTranslation(caseItem?:any){
    let id = ''
    if(!caseItem?.id){
      if(!this.caseItem.id){
        this.toast.show('Selecteer een casus')
        return
      }
      id = this.caseItem.id
    }
    else{
      id = caseItem.id
    }
    let list:any[] = []
    this.nav.langList.forEach((lang)=>{
      list.push({
        value:lang,
        title:this.translate.instant('languages.'+lang),
        icon:'faGlobeEurope'
      })
    })
    this.modalService.inputFields('Selecteer de originele taal','',[{
      type:'select',
      placeholder:'Selecteer de originele taal',
      value:this.translate.currentLang,
      optionKeys:list
    }],(result:any)=>{
      if(result.data){
        this.firestore.update('cases_trainer',id!,{original_language:result.data[0].value,translate:false})
        setTimeout(() => {
          this.firestore.update('cases_trainer',id!,{original_language:result.data[0].value,translate:true}).then(()=>{
            if(this.caseItem.id){
              this.caseItem = {}
            }
          })
        }, 1000);
        this.toast.show('Translation started')
      }
    })
     
  }
  
  newCase(){
    this.toast.showLoader()
    let casus:any = this.casesService.defaultCase('','')
    this.firestore.create('cases_trainer',casus).then(()=>{
      setTimeout(() => {
        for(let i = 0; i < this.cases.length; i++){
          if(this.cases[i].created === casus.created){
            this.caseItem = this.cases[i]
          }
        }
      }, 1000);
    })
  }

  changeCategory(){
    setTimeout(() => {
      this.caseItem.openingMessage = this.categoryInfo(this.caseItem.conversation).reaction.content
      this.update('openingMessage')
      this.toast.show(this.translate.instant('cases.change_category_message'))
    }, 100);
  }


  generateCasus(event:Event,caseItem:any){
    event.preventDefault()
    event.stopPropagation()
    
    caseItem.existing = true

    this.modalService.generateCase({admin:true,conversationInfo:this.categoryInfo(this.caseItem.conversation),...caseItem}).then((res:any)=>{
          console.log(res)
      if(res && res.id){
        delete res.admin
        delete res.conversationInfo
        delete res.existing
        if(res.casus!=caseItem.casus){
          res.translate = false
        }
        this.firestore.set('cases_trainer',res.id,res).then(()=>{
          this.load('cases_trainer',this.auth.userInfo.uid)
          this.caseItem = this.getCase(res.id)
        })
      }
    })
    this.selectMenuservice.selectedItem = undefined
  }

  editCasus(event:Event){
    event.preventDefault()
    event.stopPropagation()

    this.modalService.editHtmlItem({value:this.caseItem.casus},(result:any)=>{
      if(result.data && result.data.value!=this.caseItem.casus){
        this.caseItem.casus = result.data.value
        this.caseItem.translate = false
        this.firestore.update('cases_trainer',this.caseItem.id,{casus:result.data.value,translate:false})
      }
    })

  }

}
