import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { IonSelect, ItemReorderEventDetail } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/auth/auth.service';
// import { CasesService } from 'src/app/services/cases.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { InfoService } from 'src/app/services/info.service';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';
import * as moment from 'moment';
import { ActivatedRoute } from '@angular/router';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-enlist',
  templateUrl: './enlist.page.html',
  styleUrls: ['./enlist.page.scss'],
})
export class EnlistPage implements OnInit {
  courseId: string = '';
  courseData: any;
  courseLoaded: boolean = false;
  showCode:boolean = false
  code:string = ''

  constructor(
    public firestore:FirestoreService,
    public icon:IconsService,
    public modalService:ModalService,
    public helpers:HelpersService,
    public translate:TranslateService,
    public infoService:InfoService,
    public auth:AuthService,
    // private casesService:CasesService,
    public nav:NavService,
    private route:ActivatedRoute,
    private rf:ChangeDetectorRef,
    private functions:AngularFireFunctions,
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

        }
      });
      // this.getCourseData()
      
    })
  }
  
  getCourseData(){
    console.log('getting course data')
    if(!this.auth.publicCourses?.length){
      this.auth.getPublicCourses()
      let count = 0
      let checkInterval = setInterval(() => {
        if(this.auth.publicCourses?.length){
          clearInterval(checkInterval)
          this.courseData = this.auth.getPublicCourse(this.courseId)
          if(!this.courseData){
            console.error('Could not find course data')
            // this.nav.go('start')
            return
          }
          this.courseLoaded = true
          console.log(this.courseData)
          this.rf.detectChanges()
          // this.loadCurrentItem()
          this.loadAllItems(() => {
            // this.loadCurrentItem()
          })
        }
        count++
        if(count > 20){
          console.log(this.auth.publicCourses)
          clearInterval(checkInterval)
          console.error('Could not load course data')
          this.nav.go('start')
          return
        }
      }, 300);
    }
    else{
      this.courseData = this.auth.getPublicCourse(this.courseId)
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
        // this.loadCurrentItem()
      })
    }
  }

  ionViewWillEnter(){
    this.courseLoaded = false
  }

  allItems:any = []

  async loadAllItems(callback:Function){
    console.log('loading all items')
    this.allItems = []
    //iterate async through all itemIds in courseData
    let count = 0
    this.courseData.itemIds.forEach((e:any) => {

      let collection = 'cases'
      if(e.type == 'infoItem'){
        collection = 'infoItems'
      }
      if(this.courseData.trainerId){
        collection = collection + '_trainer'
      }

      this.firestore.getDoc(collection,e.id).subscribe((data:any) => {
        if(data?.payload?.data()){
          // console.log(data.payload.data())
          if(data?.payload?.data()){
            let item:any = data.payload.data()
            item.id = data.payload.id
            this.allItems.push(item)
          }
          count++
          if(count == this.courseData.itemIds.length){
            // console.log(this.allItems)
            callback()
          }
        }
      })
    })
    callback()
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

  enlist(){
    console.log('enlisting')
    this.toast.showLoader()
    this.functions.httpsCallable('enlistCourse')({courseId:this.courseData.id}).subscribe((response:any)=>{
      console.log(response)
      if(response.status == '200'){
        this.toast.hideLoader()
        this.toast.show('Enrolled')
        this.nav.go('course/'+this.courseData.id)
      }
      else{
        this.toast.hideLoader()
        this.toast.show('Could not enroll')
      }
    })
  }

  enlistWithCode(){
    console.log('enlisting with code')
  }
}
