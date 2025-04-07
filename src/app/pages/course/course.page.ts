import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/auth/auth.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-course',
  templateUrl: './course.page.html',
  styleUrls: ['./course.page.scss'],
})
export class CoursePage implements OnInit {
  courseId: string = '';
  courseData: any;
  courseLoaded: boolean = false;
  currentLoadedItem:any = {}
  conversations$:any
  constructor(
    private route: ActivatedRoute,
    public nav: NavService,
    public auth:AuthService,
    private rf:ChangeDetectorRef,
    private firestore:FirestoreService,
    private modalService:ModalService,
    public media:MediaService,
    public icon:IconsService,
    private toast:ToastService
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.courseId = params['course_id'];
      if(!this.courseId){
        console.error('No course id provided')
        this.nav.go('start')
        return
      }
      this.auth.userInfo$.subscribe(userInfo => {
        if (userInfo) {
          this.getCourseData();
          this.conversations$ = this.auth.getConversations();

        }
      });
      // this.getCourseData()
      
    })
  }

  getCourseData(){
    console.log('getting course data')
    if(!this.auth.allCourses?.length){
      this.auth.getActiveCourses(this.auth.userInfo.uid)
      let count = 0
      let checkInterval = setInterval(() => {
        if(this.auth.activeCourses?.length){
          // console.log(this.auth.activeCourses)
          clearInterval(checkInterval)
          this.courseData = this.auth.getActiveCourse(this.courseId)
          if(!this.courseData){
            console.error('Could not find course data')
            this.nav.go('start')
            return
          }
          this.courseLoaded = true
          console.log(this.courseData)
          this.rf.detectChanges()
          // this.loadCurrentItem()
          this.loadAllItems(() => {
            this.loadCurrentItem()
          })
        }
        count++
        if(count > 20){
          console.log(this.auth.activeCourses)
          clearInterval(checkInterval)
          console.error('Could not load course data')
          this.nav.go('start')
          return
        }
      }, 300);
    }
    else{
      this.courseData = this.auth.getActiveCourse(this.courseId)
      if(!this.courseData){
        console.error('Could not find course data')
        this.nav.go('start')
        return
      }
      setTimeout(() => {
        this.courseLoaded = true
      }, 100);
      console.log(this.courseData)
      this.rf.detectChanges()
      this.loadAllItems(() => {
        this.loadCurrentItem()
      })
    }
  }

  ionViewWillEnter(){
    this.courseLoaded = false
  }

  allItems:any = []

  async loadAllItems(callback:Function){

    this.firestore.getSubSub('users',this.auth.userInfo.uid,'courses',this.courseData.id,'items').subscribe((items:any) => {
      console.log(items)
      this.allItems = items.map((token:any) => {
        return { id: token.payload.doc.id, ...token.payload.doc.data() }
      })
      callback()
    })


    // console.log('loading all items')
    // this.allItems = []
    // //iterate async through all itemIds in courseData
    // let count = 0
    // this.courseData.itemIds.forEach((e:any) => {

    //   let collection = 'cases'
    //   if(e.type == 'infoItem'){
    //     collection = 'infoItems'
    //   }
    //   if(this.courseData.trainerId){
    //     collection = collection + '_trainer'
    //   }

    //   this.firestore.getDoc(collection,e.id).subscribe((data:any) => {
    //     if(data?.payload?.data()){
    //       // console.log(data.payload.data())
    //       if(data?.payload?.data()){
    //         let item:any = data.payload.data()
    //         item.id = data.payload.id
    //         this.allItems.push(item)
    //       }
    //       count++
    //       if(count == this.courseData.itemIds.length){
    //         // console.log(this.allItems)
    //         callback()
    //       }
    //     }
    //   })
    // })

    // // this.courseData.itemIds.forEach(async (e:any) => {
    // //   let collection = 'cases'
    // //   if(e.type == 'infoItem'){
    // //     collection = 'infoItems'
    // //   }
    // //   if(this.courseData.trainerId){
    // //     collection = collection + '_trainer'
    // //   }
    // //   await this.firestore.getDoc(collection,e.id).subscribe((data:any) => {
    // //     console.log(data.payload.data())
    // //     if(data?.payload?.data()){
    // //       this.allItems.push(data.payload.data())
    // //     }
    // //   })
    // // })
    




    // callback()
  }

  loadCurrentItem(){
    if(!this.currentItem().id){
      return
    }
    this.allItems.forEach((e:any) => {
      if(e.id == this.currentItem().id){
        this.currentLoadedItem = e
      }
    })
    console.log(this.currentLoadedItem)
  }

  getItem(id:string){
    let item:any = {}
    this.allItems.forEach((e:any) => {
      if(e.id == id){
        item = e
      }
    })
    return item
  }

  loadItem(id:string){
    console.log(id)
    this.allItems.forEach((e:any) => {
      if(e.id == id){
        this.currentLoadedItem = e
        console.log(this.currentLoadedItem)
      }
    })
  }

  currentItem(){
    // console.log(this.courseData)
    if(!this.courseData){
      
      return {}
    }
    let item:any = {}
    this.courseData.itemIds.forEach((e:any) => {
      // console.log(e)
      if(!item.id){
        if(!e.completed){
          item = e
        }
      }
    })
    if(!item){
      return {id:'completed',completed:true,type:'infoItem'}
    }
    return item
  }

  get currentIndex(){
    let index = -1
    this.courseData.itemIds.forEach((e:any,i:number) => {
      if(e.id == this.currentLoadedItem.id){
        index = i
      }
    })
    return index
  }

  next(){
    let item = this.currentItem()
    if(item.id == 'completed'){
      return
    }
    this.courseData.itemIds.forEach((e:any,i:number) => {
      if(e.id == item.id){
        e.completed = true
        this.firestore.updateSub('users',this.auth.userInfo.uid,'courses',this.courseData.id,{itemIds:this.courseData.itemIds})
        this.loadCurrentItem()
      }
    })
  }

  gotoItem(index:number){
    if(index == 0){
      this.loadItem(this.courseData.itemIds[0].id)
      return
    }
    let prevItem = index - 1
    if(!this.courseData.itemIds[prevItem].completed){
      return
    }
    this.loadItem(this.courseData.itemIds[index].id)
  }

  finish(){
    let item = this.currentItem()
    item.finished = true
    this.currentLoadedItem.finished = true
    this.firestore.updateSub('users',this.auth.userInfo.uid,'courses',this.courseData.id,{itemIds:this.courseData.itemIds})
  }



  async startConversation(caseItem:any,restart:boolean = false){
    if(restart){
      await this.modalService.showConfirmation('Are you sure you want to restart this conversation?').then(async (res)=>{
        if(res){
          await this.deleteConversation(caseItem.id)
          caseItem.courseId = this.courseData.id
          this.modalService.showConversationStart(caseItem).then((res)=>{
            console.log(res)
            if(res){
              localStorage.setItem('activatedCase',caseItem.id)
              localStorage.setItem('personalCase',JSON.stringify(caseItem))
              this.nav.go('conversation/'+caseItem.id)
            }
          })
        }
      })
    }
    else{
      caseItem.courseId = this.courseData.id
      this.modalService.showConversationStart(caseItem).then((res)=>{
        console.log(res)
        if(res){
          localStorage.setItem('activatedCase',caseItem.id)
          localStorage.setItem('personalCase',JSON.stringify(caseItem))
          this.nav.go('conversation/'+caseItem.id)
        }
      })
    }
  }

  getConversation(trainerId:string,courseId:string,caseId:string):any{
    let conversation:any = null
    this.conversations$.forEach((e:any) => {
      for(let i = 0; i < e.length; i++){
        if(e[i].trainerId == trainerId && e[i].courseId == courseId && e[i].caseId == caseId){

          conversation = e[i]
          
        }
      }
    })
    return conversation
  }

  async deleteConversation(caseId:any){
    let conversation = this.getConversation(this.auth.userInfo.uid,this.courseData.id,caseId)
    if(conversation){
      this.firestore.deleteSub('users',this.auth.userInfo.uid,'conversations',conversation.conversationId)
    }
  }

  continueConversation(conversation:any){
    localStorage.setItem('continueConversation',"true")
    localStorage.setItem('conversation',JSON.stringify(conversation))
    this.nav.go('conversation/'+conversation.caseId)
  }

  showMenu(event:Event){
    console.log(event)
  }

  closeCourse(){
    this.toast.showLoader()
    this.firestore.updateSub('users',this.auth.userInfo.uid,'courses',this.courseData.id,{status:'finished'})
    setTimeout(() => {
      this.nav.go('start')
      this.toast.hideLoader()
    }, 2000);
  }
}
