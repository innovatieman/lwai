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
import { LevelsService } from 'src/app/services/levels.service';
import { AccountService } from 'src/app/services/account.service';
import { ConversationService } from 'src/app/services/conversation.service';
import { TrainerService } from 'src/app/services/trainer.service';
import { Subscription, take } from 'rxjs';


@Component({
  selector: 'app-account',
  templateUrl: './account.page.html',
  styleUrls: ['./account.page.scss'],
})
export class AccountPage implements OnInit {

  activeTab = 'basics';
  [x:string]:any
  // account:any = {}
  subscriptions$: any;
  hasActiveSubscription: boolean = false;
  conversations$: any;
  courses$: any;
  activeSubscriptionTypes: any; 
  showOfferCode:boolean = false;
  offerCode: string = '';
  payments: any;
  // products: any;
  products_unlimited: any;
  customers: any;
  subscriptionsStripe: any;
  db: any;
  isTrainer: boolean = false;
  isTrainerPro: boolean = false;
  isOrganisation: boolean = false;
  
  // isAdmin: boolean = false;
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
  showInfoCredits:boolean = false


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
    public countries:CountriesService,
    public levelService:LevelsService,
    public accountService:AccountService,
    private conversationService:ConversationService,
    public trainerService:TrainerService
  ) { }

  ngOnInit() {
    this.accountService.init()
    // this.auth.isAdmin().subscribe((admin) => {
    //   this.isAdmin = admin;
    // });
    this.auth.hasActive('trainer').subscribe((trainer)=>{
      this.isTrainer = trainer
    })
    this.auth.hasActive('trainerPro').subscribe((trainerPro)=>{
      this.isTrainerPro = trainerPro
    })
    setTimeout(() => {
      this.auth.hasActive('trainer').subscribe((trainer)=>{
        this.isTrainer = trainer
      })
      this.auth.hasActive('trainerPro').subscribe((trainerPro)=>{
        this.isTrainerPro = trainerPro
      })
    }, 2000);
    
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
    // let interval = setInterval(()=>{
    //   this.account = JSON.parse(JSON.stringify(this.auth.userInfo))
    //   if(this.account.email){
    //     clearInterval(interval)
    //   }
    //   countInterval++
    //   if(countInterval > 100){
    //     clearInterval(interval)
    //   }
    // },200)

    this.db = this.firestore.firestore;
    this.subscriptions$ = this.auth.getSubscriptions();
    this.conversations$ = this.auth.getConversations();
    this.courses$ = this.auth.getCourses()

    // Controleren op actieve abonnementen
    this.auth.hasActiveSubscription().subscribe((active) => {
      this.hasActiveSubscription = active;
    });

    // this.fetchProducts()
    // this.fetchSubscriptionsStripe()

  }

  ionViewDidEnter() {
    this.auth.hasActive('trainer').pipe(
      take(1)
    ).subscribe((trainer) => {
      this.isTrainer = trainer
    })
    this.auth.hasActive('trainerPro').pipe(
      take(1)
    ).subscribe((trainerPro) => {
      this.isTrainerPro = trainerPro
    })
    // this.auth.hasActive('organisation').pipe(
    //   take(1)
    // ).subscribe((organisation) => {
    //   this.isOrganisation = organisation
    // });

    setTimeout(() => {
      this.auth.hasActive('trainer').pipe(
        take(1)
      ).subscribe((trainer) => {
        this.isTrainer = trainer
      })
      this.auth.hasActive('trainerPro').pipe(
        take(1)
      ).subscribe((trainerPro) => {
        this.isTrainerPro = trainerPro
      })
      // this.auth.hasActive('organisation').pipe(
      //   take(1)
      // ).subscribe((organisation) => {
      //   this.isOrganisation = organisation
      // });
    }, 2000);
  }


  async collectStripeProducts() {
    // const app = getApp();
    // this.payments = getStripePayments(app, {
    //   productsCollection: "products",
    //   customersCollection: "customers",
    // })
    // console.log(this.payments)
    // this.fetchProducts()
  }

  changeTab(tab:string){
    // this.activeTab = tab
    this.nav.go('account/'+tab)

  }


  async buy(item: any,metadata?: any) {

    // this.accountService.buyMultiple([item])
    // return
    const user = await this.auth.userInfo;
    if (!user) {
      console.error("User not authenticated");
      return;
    }
    console.log("Creating checkout session for product:", window.location.origin + (item.metadata?.type == 'subscription' ? '/account/subscriptions/success' : '/account/credits/success'));
    return
    
    this.toast.showLoader('Bezig met verwerking');
  
    if (item.credits) {
      localStorage.setItem('buying Credits', item.credits);
      localStorage.setItem('oldCredits', this.auth.credits.total);
    }
  
    let stripeId: any = '';
    if (this.auth.customer?.stripeCustomerId) {
      stripeId = this.auth.customer.stripeCustomerId;
    }
    if (!stripeId) {
      let newCustomer = await this.functions.httpsCallable('createCustomerId')({ email: user.email }).toPromise();
      stripeId = newCustomer.result?.stripeId;
    }
  
    if (!stripeId) {
      this.toast.hideLoader();
      this.toast.show('Error creating customer');
      return;
    }
    if(!metadata){
      metadata = {
        userId: user.uid
      };
    }

    let checkoutSessionData: any = {
      price: item.prices[0].id,
      success_url: window.location.origin + (item.metadata?.type == 'subscription' ? '/account/subscriptions/success' : '/account/credits/success'),
      cancel_url: window.location.origin + (item.metadata?.type == 'subscription' ? '/account/subscriptions/error' : '/account/credits/error'),
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      metadata: metadata,
      customer: stripeId
    };
  
    if (item.prices[0].type == 'one_time') {
      checkoutSessionData['mode'] = 'payment';
      checkoutSessionData['payment_intent_data'] = {
        setup_future_usage: 'off_session'
      };
      checkoutSessionData['invoice_creation'] = {
        enabled: true
      };
      
    } else {
      checkoutSessionData['mode'] = 'subscription';
    }
  
    console.log(checkoutSessionData);
  
    try {
      const checkoutSessionRef = this.firestore.collection(`customers/${user.uid}/checkout_sessions`);
      const docRef = await checkoutSessionRef.add(checkoutSessionData);
  
      console.log("Checkout session created:", docRef.id);
  
      this.firestoreService.getDocListen(`customers/${user.uid}/checkout_sessions/`, docRef.id).subscribe((value: any) => {
        setTimeout(() => {
          this.toast.hideLoader();
        }, 2000);
  
        if (value.url) {
          window.location.assign(value.url);
        } else if (value.error) {
          console.error("Stripe error:", value.error);
        }
      });
  
    } catch (error) {
      console.error("Error creating checkout session:", error);
    }
  }


  // async fetchSubscriptionsStripe() {
  //   this.firestoreService.queryDouble('products','metadata.type','subscription','==','active',true,'==').subscribe((products:any)=>{
  //     this.subscriptionsStripe = products.map((product:any)=>{
  //       let item = {
  //         id: product.payload.doc.id,
  //         credits: product.payload.doc.data().metadata?.credits ? parseInt(product.payload.doc.data().metadata.credits) : 0,
  //         title: product.payload.doc.data().metadata?.title ? product.payload.doc.data().metadata?.title : 'Basic',
  //         ...product.payload.doc.data()
  //       }
  //       //get subcollection prices
  //       this.firestoreService.get('products/'+item.id+'/prices').subscribe((prices:any)=>{
  //         item.prices = prices.map((price:any)=>{
  //           return {
  //             id: price.payload.doc.id,
  //             ...price.payload.doc.data()
  //           }
  //         })
  //       })
  //       return item
  //     })
  //     // console.log(this.subscriptionsStripe)
  //   })
  // }

  updateAccount(){
    if(this.accountService.account.displayName){
      this.toast.showLoader(this.translate.instant('messages.busy_saving'))
      this.functions.httpsCallable('editUserName')({displayName:this.accountService.account.displayName}).subscribe((response:any)=>{
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
      preferences:JSON.parse(JSON.stringify(this.accountService.account.preferences))
    }
    this.firestoreService.update('users',this.auth.userInfo.uid,obj)
  }

  openConversation(conversation:any,event?:any){
    if(event){
      event.stopPropagation()
    }
    localStorage.setItem('continueConversation',"true")
    localStorage.setItem('conversation',JSON.stringify(conversation))
    this.conversationService.originUrl = location.pathname.substring(1);
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


  

  selectingCountry:boolean = false
  // showCountryPicker(){
  //   if(this.selectingCountry){
  //     return
  //   }
  //   this.selectingCountry = true
  //   let list = JSON.parse(JSON.stringify(this.countries.list))
  //   for(let i = 0; i<list.length;i++){
  //     list[i].title = list[i].country,
  //     list[i].value= list[i].code
  //     list[i].flag = 'assets/flags/'+list[i].code.toLowerCase()+'.svg'
  //   }
  //   list.unshift(this.countries.country(this.auth.userInfo.country))



  //   this.modalService.selectItem('',list,(result:any)=>{
  //     this.selectingCountry = false
  //     if(result.data){
  //       this.functions.httpsCallable('editUserCountry')({country:result.data.value}).subscribe((response:any)=>{
  //         this.toast.show(this.translate.instant('languages.country_changed'))
  //       })
  //     }
  //   },null,this.translate.instant('languages.select_country'))
  // }

  // async editLang(){
  //   let list:any[] = []
  //   this.nav.langList.forEach((lang)=>{
  //     list.push({
  //       value:lang,
  //       title:this.translate.instant('languages.'+lang),
  //       icon:'faGlobeEurope'
  //     })
  //   })
  //   this.modalService.selectItem('',list,(result:any)=>{
  //     this.selectingCountry = false
  //     if(result.data){
  //       this.functions.httpsCallable('editUserLang')({language:result.data.language}).subscribe((response:any)=>{
  //         this.toast.show(this.translate.instant('languages.language_changed'))
  //       })
  //     }
  //   },null,this.translate.instant('languages.select_language'))
   
  // }

  // editCurrency(){
  //   let list:any[] = []
  //   this.countries.currencyNames.forEach((currency)=>{
  //     list.push({
  //       value:currency.code,
  //       title:currency.title,
  //     })
  //   })
  //   this.modalService.selectItem('',list,(result:any)=>{
  //     if(result.data){
  //       this.toast.showLoader()
  //       this.functions.httpsCallable('editUserCurrency')({currency:result.data.value}).subscribe((response:any)=>{
  //         this.toast.hideLoader()
  //         this.toast.show(this.translate.instant('currency.currency_changed'))
  //       })
  //     }
  //   },null,this.translate.instant('currency.select_currency'))
  // }

  // updateFilter(){
  //   console.log(this.currentFilterTypes)
  //   this.toast.showLoader(this.translate.instant('messages.busy_saving'))
  //   this.functions.httpsCallable('editUserFilter')({filter:this.currentFilterTypes}).subscribe((response:any)=>{
  //     this.toast.hideLoader()
  //     this.toast.show(this.translate.instant('messages.saved'))
  //   })
  // }

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

  removeUser(){
    this.modalService.showConfirmation(this.translate.instant('page_account.delete_account_confirm')).then((response)=>{
      if(response){
        console.log('/^'+this.translate.instant('page_account.DELETE')+'$/')
        this.modalService.inputFields(this.translate.instant('page_account.delete_account_title'),this.translate.instant('page_account.delete_account_confirm_input_text'),[
          {
            placeholder:this.translate.instant('page_account.DELETE'),
            type:'text',
            value:'',
            required:true,
            pattern:this.translate.instant('page_account.DELETE')

          }],(result:any)=>{
            if(result.data){
              this.deleteAccount()
            }
        })
      }
    })
  }

  deleteAccount(){
    if(this.accountService.isAdmin){
      this.toast.show(this.translate.instant('page_account.delete_account_admin'))
      return
    }
    this.toast.showLoader(this.translate.instant('page_account.busy_deleting'))
    this.functions.httpsCallable('deleteSelf')({}).subscribe((response:any)=>{
      this.toast.hideLoader()
      if(response.status==200){
        this.toast.show(this.translate.instant('page_account.delete_account_success'),3000)
        setTimeout(() => {
          this.auth.logout()
        }, 3000);
      }
      else{
        this.toast.show(this.translate.instant('page_account.delete_account_failure'),3000)
      }
    })
  }
  

  showProductInfo(product:any){
    console.log(product)
    let item = {
      title: product.credits +' '+ this.translate.instant('page_account.credits'),
      user_info: this.translate.instant('page_account.credits_buy_info'),
      type: 'product',
      id: product.id,
      photo:'assets/img/credits.webp',
      price: product.prices[0].unit_amount,
      currency: product.prices[0].currency,
    }
    this.modalService.showCaseInfo(item,(response:any)=>{
      console.log(response)
      if(response.data){
        this.buy(product)
      }
    })
  }

  checkOffer(){
    if(!this.offerCode){
      return
    }
    this.toast.showLoader()
    this.functions.httpsCallable('checkOffer')({code:this.offerCode}).subscribe((response:any)=>{
      this.toast.hideLoader()
      console.log(response)
      this.offerCode = ''
      this.showOfferCode = false
      if(response.status==200){
        this.toast.show(this.translate.instant('page_account.offer_code_success'))
      }
      else{
        this.toast.show(this.translate.instant('page_account.offer_code_failure'))
      }
    })
  }
  

  registerAsTrainerPro(invoice?:boolean){

    if(!this.isTrainer){
      this.trainerService.registerAsTrainer()
      return
    }

    if(!this.trainerService.trainerInfo?.invoice?.name){
      this.toast.show(this.translate.instant('dashboard.complete_invoice_info'),4000,'middle')
      this.nav.go('trainer/dashboard/bank')
      return
    }
    this.nav.go('trainer/dashboard/upgrade')
    // this.trainerService.registerAsTrainerPro(invoice);
  }

  
  
}
