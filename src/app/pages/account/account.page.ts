import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/auth/auth.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { InfoService } from 'src/app/services/info.service';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';
import { ToastService } from 'src/app/services/toast.service';
import { getApp, initializeApp } from "@firebase/app";
import { getStripePayments, getProducts} from "@invertase/firestore-stripe-payments";
import { environment } from 'src/environments/environment';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { addDoc, collection, onSnapshot } from 'firebase/firestore';
import { MediaService } from 'src/app/services/media.service';
import { CountriesService } from 'src/app/services/countries.service';


@Component({
  selector: 'app-account',
  templateUrl: './account.page.html',
  styleUrls: ['./account.page.scss'],
})
export class AccountPage implements OnInit {
  // @ViewChild('progressCircle1',{static:false}) progressCircle1: any;
  // @ViewChild('progressCircle2',{static:false}) progressCircle2: any;
  // @ViewChild('progressCircle3',{static:false}) progressCircle3: any;
  activeTab = 'basics';
  [x:string]:any
  account:any = {}
  subscriptions$: any;
  hasActiveSubscription: boolean = false;
  conversations$: any;
  courses$: any;
  activeSubscriptionTypes: any; 
  // creditsOptions:any = [
  //   {title:'10 credits',amount:10},
  //   {title:'20 credits',amount:20},
  //   {title:'50 credits',amount:50},
  //   {title:'100 credits',amount:100},
  // ]
  payments: any;
  products: any;
  customers: any;
  subscriptionsStripe: any;
  db: any;
  menuItems:any=[
    {title:this.translate.instant('page_account.account'),tab:'basics',icon:'faUser'},
    // {title:'Mijn profiel',tab:'profile',icon:'faSlidersH'},
    {title:this.translate.instant('page_account.my_finished_cases'),tab:'conversations',icon:'faComments'},
    // {title:this.translate.instant('page_account.my_finished_courses'),tab:'courses',icon:'faGraduationCap'},
    // {title:'Mijn prestaties',tab:'progress',icon:'faAward'},
    // {title:this.translate.instant('page_account.my_subscriptions'),tab:'subscriptions',icon:'faStar'},
    // {title:'Betaalinstellingen',tab:'payment',icon:'faCreditCard'},
    {title:this.translate.instant('page_account.credits'),tab:'credits',icon:'faCoins'},

  ]


  constructor(
    private firestoreService: FirestoreService,
    private firestore: AngularFirestore,
    public auth: AuthService,
    private toast:ToastService,
    public icon:IconsService,
    public helper:HelpersService,
    public translate:TranslateService,
    public nav:NavService,
    private modalService:ModalService,
    public infoService:InfoService,
    private functions:AngularFireFunctions,
    private route:ActivatedRoute,
    public media:MediaService,
    public countries:CountriesService
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params=>{
      if(params['tab']){
        this.activeTab = params['tab']
      }
      if(params['status']){
        if(params['status']=='success'){
          this.modalService.showText(this.translate.instant('page_account.payment_success'),this.translate.instant('messages.success'))
        }
        else if(params['status']=='error'){
          this.toast.show(this.translate.instant('error_messages.failure'),4000,'middle')
        }
        this.nav.go('account/'+ this.activeTab)
      }
        
    })
    let countInterval = 0
    let interval = setInterval(()=>{
      this.account = JSON.parse(JSON.stringify(this.auth.userInfo))
      if(this.account.email){
        clearInterval(interval)
      }
      countInterval++
      if(countInterval > 100){
        clearInterval(interval)
      }
    },200)

    this.db = this.firestore.firestore;
    this.subscriptions$ = this.auth.getSubscriptions();
    this.conversations$ = this.auth.getConversations();
    this.courses$ = this.auth.getCourses()

    // Controleren op actieve abonnementen
    this.auth.hasActiveSubscription().subscribe((active) => {
      this.hasActiveSubscription = active;
    });
    // let app
    // try {
    //   app = getApp(); // ✅ Probeer de bestaande Firebase-app op te halen
    // } catch (error) {
    //   console.warn('Firebase app niet gevonden, initialiseren...', error);
    //   app = initializeApp(environment.firebase); // 🚀 Initialiseer Firebase als het nog niet gebeurd is
    // }
    // this.payments = getStripePayments(app, {
    //   productsCollection: "products",
    //   customersCollection: "customers",
    // })
    // console.log(this.payments)
    // const app = getApp();
    // this.payments = getStripePayments(app, {
    //   productsCollection: "products",
    //   customersCollection: "customers",
    // })
    this.fetchProducts()
    this.fetchSubscriptionsStripe()

    // this.setupProgressCircles()
    // this.collectStripeProducts()
  }


  // setupProgressCircles(){
  //   let count = 0
  //   let check:any = {}
  //   for(let i = 0; i<4;i++){
  //     check[i] = setInterval(()=>{
  //       count++
  //       if(count>500){
  //         clearInterval(check[i])
  //       }
  //       if( this['progressCircle'+i]?.elRef?.nativeElement?.firstChild.querySelector('text').children[0]){
  //         clearInterval(check[i])
  //         this['progressCircle'+i]?.elRef.nativeElement.firstChild?.style.setProperty('margin-top', '-50px');
  //         this['progressCircle'+i]?.elRef.nativeElement.firstChild?.style.setProperty('margin-bottom', '-50px');

  //         setTimeout(() => {
  //           const tspanElements:any = document.querySelectorAll('tspan');
  //           tspanElements.forEach((tspan:any, index:number) => {
  //               tspan.setAttribute('y', 125); // Verhoog met 10
  //           });            
  //         }, 500);

  //       }
  //     }, 20);
  //   }
  // }



  async collectStripeProducts() {
    // const app = getApp();
    // this.payments = getStripePayments(app, {
    //   productsCollection: "products",
    //   customersCollection: "customers",
    // })
    // console.log(this.payments)
    this.fetchProducts()
  }

  changeTab(tab:string){
    // this.activeTab = tab
    this.nav.go('account/'+tab)

  }

  async fetchProducts() {
    this.firestoreService.query('products','metadata.type','credits').subscribe((products:any)=>{
      this.products = products.map((product:any)=>{
        let item = {
          id: product.payload.doc.id,
          credits: product.payload.doc.data().metadata?.credits ? parseInt(product.payload.doc.data().metadata.credits) : 0,
          ...product.payload.doc.data()
        }
        //get subcollection prices
        this.firestoreService.get('products/'+item.id+'/prices').subscribe((prices:any)=>{
          item.prices = prices.map((price:any)=>{
            return {
              id: price.payload.doc.id,
              ...price.payload.doc.data()
            }
          })
        })
        return item
      })
      console.log(this.products)
    })
  }

  async buy(item:any){
    const user = await this.auth.userInfo;
    if (!user) {
      console.error("User not authenticated");
      return;
    }
    this.toast.showLoader('Bezig met verwerking')
    if(item.credits){
      localStorage.setItem('buying Credits',item.credits)
      localStorage.setItem('oldCredits',this.auth.credits.total)
    }

    let stripeId:any = ''
    if(this.auth.customer?.stripeCustomerId){
      stripeId = this.auth.customer.stripeCustomerId
    }

    if(!stripeId){
      let newCustomer = await this.functions.httpsCallable('createCustomerId')({email:user.email}).toPromise()
      const stripeId = newCustomer.stripeCustomerId
    }
    if(!stripeId){
      this.toast.hideLoader()
      this.toast.show('Error creating customer')
      return
    }

    let checkoutSessionData:any = {
      price: item.prices[0].id,
      success_url: window.location.origin + (item.metadata?.type=='subscription' ? '/account/subscriptions/success' : '/account/credits/success'),
      cancel_url: window.location.origin + (item.metadata?.type=='subscription' ? '/account/subscriptions/error' : '/account/credits/error'),
      metadata:{
        userId:user.uid
      },
      customer:stripeId
    };
    if (item.prices[0].type=='one_time') {
      checkoutSessionData['mode'] = 'payment';
    }
    else{
      checkoutSessionData['mode'] = 'subscription';
    }

    console.log(checkoutSessionData)
    try {
      // ✅ Firestore Collection Reference met compat API
      const checkoutSessionRef = this.firestore.collection(`customers/${user.uid}/checkout_sessions`);

      // ✅ Document toevoegen aan Firestore en document ID ophalen
      const docRef = await checkoutSessionRef.add(checkoutSessionData);

      console.log("Checkout session created:", docRef.id);

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


  async fetchSubscriptionsStripe() {
    this.firestoreService.query('products','metadata.type','subscription').subscribe((products:any)=>{
      this.subscriptionsStripe = products.map((product:any)=>{
        let item = {
          id: product.payload.doc.id,
          ...product.payload.doc.data()
        }
        //get subcollection prices
        this.firestoreService.get('products/'+item.id+'/prices').subscribe((prices:any)=>{
          item.prices = prices.map((price:any)=>{
            return {
              id: price.payload.doc.id,
              ...price.payload.doc.data()
            }
          })
        })
        return item
      })
      console.log(this.subscriptionsStripe)
    })
  }

  updateAccount(){
    if(this.account.displayName){
      this.toast.showLoader(this.translate.instant('messages.busy_saving'))
      this.functions.httpsCallable('editUserName')({displayName:this.account.displayName}).subscribe((response:any)=>{
        if(response.status==200){
          this.toast.show(this.translate.instant('messages.saved'),3000,'bottom')
        }
        else{
          this.toast.show(this.translate.instant('error_messages.failure'),3000)
        }
        this.toast.hideLoader()
      })
    }

  }
  updatePreference(){
    
    let obj:any =  {
      preferences:JSON.parse(JSON.stringify(this.account.preferences))
    }
    this.firestoreService.update('users',this.auth.userInfo.uid,obj)
  }

  openConversation(conversation:any){
    localStorage.setItem('continueConversation',"true")
    localStorage.setItem('conversation',JSON.stringify(conversation))
    this.nav.go('conversation/'+conversation.caseId)
  }



  // upgrade(type:string,paymentMethod:string){
  //   this.auth.upgradeSubscription(type,paymentMethod,(response:any)=>{
  //     console.log(response)
  //     this.toast.show('Abonnement geüpgraded')
  //   })
  // }  

  deleteConversation(event:any,conversation:any){
    event.stopPropagation()
    console.log(conversation)
    this.modalService.showConfirmation(this.translate.instant('page_account.delete_cases_confirm')).then((response)=>{
      if(response){
        this.firestoreService.deleteSub('users',this.auth.userInfo.uid, 'conversations',conversation.conversationId).then(()=>{
          this.toast.show(this.translate.instant('messages.deleted'))
        })
      }
    })
  }

  deleteCourse(event:any,course:any){
    event.stopPropagation()
    console.log(course)
    this.modalService.showConfirmation(this.translate.instant('page_account.delete_courses_confirm')).then((response)=>{
      if(response){
        this.firestoreService.deleteSub('users',this.auth.userInfo.uid, 'courses',course.courseId).then(()=>{
          this.toast.show(this.translate.instant('messages.deleted'))
        })
      }
    })

  }


  // buyCredits(amount:number){
  //   this.toast.showLoader('Bezig met verwerking')
  //   this.functions.httpsCallable('buyCredits')({amount:amount}).subscribe((response:any)=>{
  //     console.log(response)
  //     this.toast.hideLoader()
  //     this.toast.show('Credits gekocht')
  //   })
  // }

  openStripeDashboard(){
    // this.nav.goto(this.auth.customer.stripeLink,true)
    this.toast.showLoader('Opening Stripe dashboard')
    this.functions.httpsCallable('createStripePortalSession')({}).subscribe((response:any)=>{
      if(response?.url){
        this.toast.hideLoader()
        window.location.href = response?.url;
      }
      else{
        this.toast.hideLoader()
        this.toast.show('Error opening Stripe dashboard')
        console.log(response)
      }
      
    })
  }

  selectingCountry:boolean = false
  showCountryPicker(){
    if(this.selectingCountry){
      return
    }
    this.selectingCountry = true
    let list = JSON.parse(JSON.stringify(this.countries.list))
    for(let i = 0; i<list.length;i++){
      list[i].title = list[i].country,
      list[i].value= list[i].code
      list[i].flag = 'assets/flags/'+list[i].code.toLowerCase()+'.svg'
    }
    list.unshift(this.countries.country(this.auth.userInfo.country))



    this.modalService.selectItem('',list,(result:any)=>{
      this.selectingCountry = false
      if(result.data){
        this.functions.httpsCallable('editUserCountry')({country:result.data.value}).subscribe((response:any)=>{
          this.toast.show(this.translate.instant('languages.country_changed'))
        })
      }
    },null,this.translate.instant('languages.select_country'))
  }

  async editLang(){
    let list:any[] = []
    this.nav.langList.forEach((lang)=>{
      list.push({
        value:lang,
        title:this.translate.instant('languages.'+lang),
        icon:'faGlobeEurope'
      })
    })
    this.modalService.selectItem('',list,(result:any)=>{
      this.selectingCountry = false
      if(result.data){
        this.functions.httpsCallable('editUserLang')({language:result.data.language}).subscribe((response:any)=>{
          this.toast.show(this.translate.instant('languages.language_changed'))
        })
      }
    },null,this.translate.instant('languages.select_language'))
   
  }

  editCurrency(){
    let list:any[] = []
    this.countries.currencyNames.forEach((currency)=>{
      list.push({
        value:currency.code,
        title:currency.title,
      })
    })
    this.modalService.selectItem('',list,(result:any)=>{
      if(result.data){
        this.toast.showLoader()
        this.functions.httpsCallable('editUserCurrency')({currency:result.data.value}).subscribe((response:any)=>{
          this.toast.hideLoader()
          this.toast.show(this.translate.instant('currency.currency_changed'))
        })
      }
    },null,this.translate.instant('currency.select_currency'))
  }

  updateFilter(){
    console.log(this.currentFilterTypes)
    this.toast.showLoader(this.translate.instant('messages.busy_saving'))
    this.functions.httpsCallable('editUserFilter')({filter:this.currentFilterTypes}).subscribe((response:any)=>{
      this.toast.hideLoader()
      this.toast.show(this.translate.instant('messages.saved'))
    })
  }

  filterTypes(){
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

  get currentFilterTypes() {
    return this.filterTypes()
  }

  get filterEdited(){
    if(!this.auth.userInfo.filter && this.currentFilterTypes.types.length === 0 && this.currentFilterTypes.subjects.length === 0){
      return false
    }
    if(!this.auth.userInfo.filter && ( this.currentFilterTypes.types.length > 0 || this.currentFilterTypes.subjects.length > 0)){
      return true
    }
    return JSON.stringify(this.currentFilterTypes.types)!=JSON.stringify(this.auth.userInfo.filter.types) || JSON.stringify(this.currentFilterTypes.subjects)!=JSON.stringify(this.auth.userInfo.filter.subjects)
  }
}
