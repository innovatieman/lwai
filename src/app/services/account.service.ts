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
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  initStarted:boolean = false
  activeTab = 'basics';
  [x:string]:any
  account:any = {}
  subscriptions$: any;
  hasActiveSubscription: boolean = false;
  conversations$: any;
  courses$: any;
  activeSubscriptionTypes: any; 

  payments: any;
  products: any;
  products_trainer: any;
  products_elearnings: any;
  customers: any;
  subscriptionsStripe: any;
  db: any;
  isAdmin: boolean = false;
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
    public levelService:LevelsService
  ) { }

  init() {
    if(this.initStarted){
      return
    }
    this.initStarted = true
    this.auth.isAdmin().subscribe((admin) => {
      this.isAdmin = admin;
    });

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

    this.fetchProducts()
    this.fetchProductsTrainer()
    this.fetchProductsElearnings()
    // this.fetchSubscriptionsStripe()

  }

  changeTab(tab:string){
    // this.activeTab = tab
    this.nav.go('account/'+tab)

  }

  async fetchProducts() {
    // console.log('Fetching products...');
    this.firestoreService.queryDouble('products','metadata.type','credits','==','active',true,'==').subscribe((products:any)=>{
      this.products = products.map((product:any)=>{
        let item = {
          id: product.payload.doc.id,
          credits: product.payload.doc.data().metadata?.credits ? parseInt(product.payload.doc.data().metadata.credits) : 0,
          conversations: product.payload.doc.data().metadata?.conversations ? product.payload.doc.data().metadata?.conversations : '2-3',
          title: product.payload.doc.data().metadata?.title ? product.payload.doc.data().metadata?.title : 'Basic',
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
      // console.log(this.products)
    })
  }

  async fetchProductsTrainer() {
    this.firestoreService.queryDouble('products','metadata.type','trainer','==','active',true,'==').subscribe((products:any)=>{
      this.products_trainer = products.map((product:any)=>{
        let item = {
          id: product.payload.doc.id,
          level: product.payload.doc.data().metadata?.level ? product.payload.doc.data().metadata?.level : 'basic',
          title: product.payload.doc.data().metadata?.title ? product.payload.doc.data().metadata?.title : 'Basic',
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
      // console.log(this.products)
    })
  }

  async fetchProductsElearnings() {
    this.firestoreService.queryDouble('products','metadata.type','elearning','==','active',true,'==').subscribe((products:any)=>{
      this.products_elearnings = products.map((product:any)=>{
        let item = {
          id: product.payload.doc.id,
          credits: product.payload.doc.data().metadata?.credits ? parseInt(product.payload.doc.data().metadata.credits) : 0,
          title: product.payload.doc.data().metadata?.title ? product.payload.doc.data().metadata?.title : 'Basic',
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
      // console.log(this.products_elearnings)
    })
  }

  async buy(item: any,metadata?: any) {

    this.buyMultiple([item],metadata);
    return

    const user = await this.auth.userInfo;
    if (!user) {
      console.error("User not authenticated");
      return;
    }
  
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
  
    let checkoutSessionData: any = {
      price: item.prices[0].id,
      success_url: window.location.origin + (item.metadata?.type == 'subscription' ? '/account/subscriptions/success' : '/account/credits/success'),
      cancel_url: window.location.origin + (item.metadata?.type == 'subscription' ? '/account/subscriptions/error' : '/account/credits/error'),
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      metadata: {
        userId: user.uid
      },
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

  async buyMultiple(items: any[],metadata?: any) {

    const user = await this.auth.userInfo;
    if (!user) return;

    const stripeProductIds = items.map(i => i.id); // 🔒 alleen IDs meegeven

    // ✅ Credits check en opslaan
    const creditsItem = items.find((item) => item.credits);
    if (creditsItem) {
      localStorage.setItem('buying Credits', creditsItem.credits);
      localStorage.setItem('oldCredits', this.auth.credits.total);
    }

    let hasElearnings = items.some((item) => item.metadata?.type === 'elearning');
  // ✅ Bepaal of alle items subscription zijn of niet
    const hasOnlySubscriptions = items.every((item) => item.metadata?.type === 'subscription');
    // const hasOnlyOneTime = items.every((item) => item.prices[0].type === 'one_time');

    const successPath = window.location.origin + '/' + (hasElearnings ? 'marketplace/elearnings/success' : (hasOnlySubscriptions ? '/account/subscriptions/success' : '/account/credits/success'));
    const cancelPath = window.location.origin + '/' + (hasElearnings ? 'marketplace/elearnings/error' : (hasOnlySubscriptions ? '/account/subscriptions/error' : '/account/credits/error'));


    this.toast.showLoader();

    try {
      let callObj:any = { stripeProductIds, successPath, cancelPath };
      if(items[0].organisationId){
        callObj['organisationId'] = items[0].organisationId;
      }
      if(metadata){
        callObj['metadata'] = metadata;
      }
      // console.log('Creating checkout session with:', callObj);
      const result = await this.functions
        .httpsCallable('createCheckoutSession')(callObj)
        .toPromise();

      this.toast.hideLoader();

      if (result?.url) {
        window.location.assign(result.url);
      }
    } catch (error) {
      this.toast.hideLoader();
      console.error(error);
      this.toast.show(this.translate.instant('error_messages.failure'));
    }











      // const user = await this.auth.userInfo;
      // if (!user) {
      //   console.error("User not authenticated");
      //   return;
      // }

      // this.toast.showLoader();

      // // ✅ Credits check en opslaan
      // const creditsItem = items.find((item) => item.credits);
      // if (creditsItem) {
      //   localStorage.setItem('buying Credits', creditsItem.credits);
      //   localStorage.setItem('oldCredits', this.auth.credits.total);
      // }

      // let hasElearnings = items.some((item) => item.metadata?.type === 'elearning');

      // // ✅ Stripe customer ID ophalen of aanmaken
      // let stripeId: any = '';
      // if (this.auth.customer?.stripeCustomerId) {
      //   stripeId = this.auth.customer.stripeCustomerId;
      // }

      // if (!stripeId) {
      //   let newCustomer = await this.functions.httpsCallable('createCustomerId')({ email: user.email }).toPromise();
      //   stripeId = newCustomer.result?.stripeId;
      // }

      // if (!stripeId) {
      //   this.toast.hideLoader();
      //   this.toast.show(this.translate.instant('error_messages.failure'));
      //   return;
      // }

      // // ✅ Bepaal of alle items subscription zijn of niet
      // const hasOnlySubscriptions = items.every((item) => item.metadata?.type === 'subscription');
      // const hasOnlyOneTime = items.every((item) => item.prices[0].type === 'one_time');

      // const successPath = hasElearnings ? 'marketplace/elearnings/success' : (hasOnlySubscriptions ? '/account/subscriptions/success' : '/account/credits/success');
      // const cancelPath = hasElearnings ? 'marketplace/elearnings/error' : (hasOnlySubscriptions ? '/account/subscriptions/error' : '/account/credits/error');

      // // ✅ Bouw line_items array
      // const line_items = items.map(item => ({
      //   price: item.prices[0].id,
      //   quantity: 1
      // }));

      // // ✅ Bouw checkout session data
      // console.log(window.location.origin + successPath, window.location.origin + cancelPath);
      // let checkoutSessionData: any = {
      //   line_items,
      //   success_url: window.location.origin + '/' + successPath,
      //   cancel_url: window.location.origin + '/' + cancelPath,
      //   automatic_tax: { enabled: true },
      //   allow_promotion_codes: true,
      //   metadata: {
      //     userId: user.uid,
      //     organisationId: items[0].organisationId || ''
      //   },
      //   customer: stripeId
      // };

      // // ✅ Mode bepalen (alleen 'subscription' of 'payment')
      // if (hasOnlyOneTime) {
      //   checkoutSessionData['mode'] = 'payment';
      //   checkoutSessionData['payment_intent_data'] = {
      //     setup_future_usage: 'off_session'
      //   };
      //   checkoutSessionData['invoice_creation'] = {
      //     enabled: true
      //   };
      // } else {
      //   checkoutSessionData['mode'] = 'subscription';
      // }

      // console.log(checkoutSessionData);

      // try {
      //   const checkoutSessionRef = this.firestore.collection(`customers/${user.uid}/checkout_sessions`);
      //   const docRef = await checkoutSessionRef.add(checkoutSessionData);

      //   console.log("Checkout session created:", docRef.id);

      //   this.firestoreService.getDocListen(`customers/${user.uid}/checkout_sessions/`, docRef.id).subscribe((value: any) => {
      //     setTimeout(() => {
      //       this.toast.hideLoader();
      //     }, 2000);

      //     if (value.url) {
      //       window.location.assign(value.url);
      //     } else if (value.error) {
      //       console.error("Stripe error:", value.error);
      //     }
      //   });

      // } catch (error) {
      //   console.error("Error creating checkout session:", error);
      //   this.toast.hideLoader();
      //   this.toast.show(this.translate.instant('error_messages.failure'));
      // }
  }


  getUnlimitedChatProduct(){
    return this.products.find((product:any) => product.credits === 1000000) || null;
  }

  getProductElearningById(id:string){
    // console.log('Fetching elearning product with ID:', id, this.products_elearnings);
    return this.products_elearnings.find((product:any) => product.id === id) || null;
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

  openConversation(conversation:any,event?:any){
    if(event){
      event.stopPropagation()
    }
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
    if(this.isAdmin){
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
  
  activePrice(product:any){
    if(product.prices && Array.isArray(product.prices)){
      let price = product.prices.find((price:any)=>{
        return price.active
      })
      return price || {}
    }
    return {}
  }
  

  showProductInfo(product:any){
    console.log(product)
    let userInfo = this.translate.instant('page_account.credits_buy_info')
    userInfo = userInfo.replace('{conversations}', product.credits == 1000000 ? this.translate.instant('page_account.credits_unlimited_chat') : product.conversations)

    let item = {
      title: (product.credits == 1000000 ? this.translate.instant('page_account.credits_unlimited_chat') : product.credits) +' '+ this.translate.instant('page_account.credits'),
      user_info: userInfo,
      type: 'product',
      id: product.id,
      photo:'assets/img/credits.webp',
      price: this.activePrice(product).unit_amount * 1.21,
      currency: product.prices[0].currency,
    }
    this.modalService.showCaseInfo(item,(response:any)=>{
      console.log(response)
      if(response.data){
        this.buy(product)
      }
    })
  }
}
