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
import { AngularFirestore } from '@angular/fire/compat/firestore';

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
  product:any = {}

  constructor(
    public firestoreService:FirestoreService,
    private firestore: AngularFirestore,
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
          this.getCourseData(()=>{
            this.fetchProduct(this.courseData.stripeProductId)
          });

        }
      });
      // this.getCourseData()
      
    })
  }
  
  async fetchProduct(stripeProductId:string){
    this.firestoreService.getDoc('products',stripeProductId).subscribe((products:any)=>{
      this.product = products.payload.data()
      this.product.id = products.payload.id
      this.firestoreService.get('products/'+this.product.id+'/prices').subscribe((prices:any)=>{
        this.product.prices = prices.map((price:any)=>{
          return {
            id: price.payload.doc.id,
            ...price.payload.doc.data()
          }
        })
      })
      console.log(this.product)
    })
  }


  getCourseData(callback:Function){
    console.log('getting course data')
    if(!this.auth.publicCourses?.length){
      // this.auth.getPublicCourses()
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
          callback()
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
      callback()
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

      this.firestoreService.getDoc(collection,e.id).subscribe((data:any) => {
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

  async buy(item:any){
    const user = await this.auth.userInfo;
  if (!user) {
    console.error("User not authenticated");
    return;
  }
  this.toast.showLoader('Bezig met verwerking')
  let checkoutSessionData:any = {
    price: item.prices[0].id,
    success_url: window.location.href,
    cancel_url: window.location.href,
  };
  // if (item.prices[0].type=='one_time') {
    checkoutSessionData['mode'] = 'payment';
  // }
  // else{
    // checkoutSessionData['mode'] = 'subscription';
  // }

  try {
    // ✅ Firestore Collection Reference met compat API
    const checkoutSessionRef = this.firestore.collection(`customers/${user.uid}/checkout_sessions`);

    // ✅ Document toevoegen aan Firestore en document ID ophalen
    const docRef = await checkoutSessionRef.add(checkoutSessionData);

    this.firestoreService.getDocListen(`customers/${user.uid}/checkout_sessions/`,docRef.id).subscribe((value:any)=>{
      // console.log(value)
      setTimeout(() => {
        this.toast.hideLoader()
      }, 2000);
      if(value.url){
        window.location.assign(value.url);
      }
      else if(value.error){
        console.error("Stripe error:", value.error);
      }
    })


  } catch (error) {
    console.error("Error creating checkout session:", error);
  }
}


  enlistWithCode(){
    console.log('enlisting with code')
  }
}
