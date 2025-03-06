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


@Component({
  selector: 'app-account',
  templateUrl: './account.page.html',
  styleUrls: ['./account.page.scss'],
})
export class AccountPage implements OnInit {
  @ViewChild('progressCircle1',{static:false}) progressCircle1: any;
  @ViewChild('progressCircle2',{static:false}) progressCircle2: any;
  @ViewChild('progressCircle3',{static:false}) progressCircle3: any;
  activeTab = 'conversations';
  [x:string]:any
  account:any = {}
  subscriptions$: any;
  hasActiveSubscription: boolean = false;
  conversations$: any;
  activeSubscriptionTypes: any; 
  creditsOptions:any = [
    {title:'10 credits',amount:10},
    {title:'20 credits',amount:20},
    {title:'50 credits',amount:50},
    {title:'100 credits',amount:100},
  ]
  payments: any;
  products: any;
  customers: any;
  subscriptionsStripe: any;
  db: any;
  menuItems:any=[
    // {title:'Mijn gegevens',tab:'account',icon:'faPen'},
    // {title:'Mijn profiel',tab:'profile',icon:'faSlidersH'},
    // {title:'Mijn cursussen',tab:'courses',icon:'faGraduationCap'},
    {title:'Mijn gesprekken',tab:'conversations',icon:'faComments'},
    // {title:'Mijn prestaties',tab:'progress',icon:'faAward'},
    {title:'Mijn abonnementen',tab:'subscriptions',icon:'faStar'},
    // {title:'Betaalinstellingen',tab:'payment',icon:'faCreditCard'},
    {title:'Credits',tab:'credits',icon:'faCoins'},

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
    private route:ActivatedRoute
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params=>{
      if(params['tab']){
        this.activeTab = params['tab']
      }
    })
    let countInterval = 0
    let interval = setInterval(()=>{
      this.account = JSON.parse(JSON.stringify(this.auth.userInfo))
      if(this.account.email){
        console.log(this.auth.skills)
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

    this.setupProgressCircles()
    // this.collectStripeProducts()
  }

  setupProgressCircles(){
    let count = 0
    let check:any = {}
    for(let i = 0; i<4;i++){
      check[i] = setInterval(()=>{
        count++
        if(count>500){
          clearInterval(check[i])
        }
        if( this['progressCircle'+i]?.elRef?.nativeElement?.firstChild.querySelector('text').children[0]){
          clearInterval(check[i])
          this['progressCircle'+i]?.elRef.nativeElement.firstChild?.style.setProperty('margin-top', '-50px');
          this['progressCircle'+i]?.elRef.nativeElement.firstChild?.style.setProperty('margin-bottom', '-50px');

          setTimeout(() => {
            const tspanElements:any = document.querySelectorAll('tspan');
            tspanElements.forEach((tspan:any, index:number) => {
                tspan.setAttribute('y', 125); // Verhoog met 10
            });            
          }, 500);

        }
      }, 20);
    }
  }

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
    let checkoutSessionData:any = {
      price: item.prices[0].id,
      success_url: window.location.origin + '/account/credits',
      cancel_url: window.location.origin + '/account/credits',
      metadata:{
        userId:user.uid
      }
    };
    if (item.prices[0].type=='one_time') {
      checkoutSessionData['mode'] = 'payment';
    }
    else{
      checkoutSessionData['mode'] = 'subscription';
    }

    try {
      // ✅ Firestore Collection Reference met compat API
      const checkoutSessionRef = this.firestore.collection(`customers/${user.uid}/checkout_sessions`);

      // ✅ Document toevoegen aan Firestore en document ID ophalen
      const docRef = await checkoutSessionRef.add(checkoutSessionData);

      console.log("Checkout session created:", docRef.id);

      this.firestoreService.getDocListen(`customers/${user.uid}/checkout_sessions/`,docRef.id).subscribe((value:any)=>{
        // console.log(value)
        this.toast.hideLoader()
        if(value.url){
          window.location.assign(value.url);
        }
        else if(value.error){
          console.error("Stripe error:", value.error);
        }
      })

      // ✅ Snapshot listener om te luisteren naar wijzigingen in Firestore
      // docRef.get().then((snap) => {
      //   console.log("Checkout session updated:", snap.data());
      //   if (snap.exists) {
      //     const { error, url } = snap.data() as any;
      //     if (error) {
      //       console.error("Stripe error:", error);
      //       return;
      //     }
      //     if (url) {
      //       console.log("Redirecting to:", url);
      //       window.location.assign(url);
      //     }
      //   }
      // });

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
    this.firestoreService.set('users',this.auth.userInfo.uid,this.account.displayName,'displayName').then(()=>{
      this.toast.show('Account gegevens bijgewerkt')
    })
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
    this.nav.go('conversation/'+conversation.conversationType+'/'+conversation.caseId)
  }



  upgrade(type:string,paymentMethod:string){
    this.auth.upgradeSubscription(type,paymentMethod,(response:any)=>{
      console.log(response)
      this.toast.show('Abonnement geüpgraded')
    })
  }  

  deleteConversation(event:any,conversation:any){
    event.stopPropagation()
    console.log(conversation)
    this.modalService.showConfirmation('Weet je zeker dat je dit gesprek wilt verwijderen?').then((response)=>{
      if(response){
        this.firestoreService.deleteSub('users',this.auth.userInfo.uid, 'conversations',conversation.conversationId).then(()=>{
          this.toast.show('Gesprek verwijderd')
        })
      }
    })
  }

  buyCredits(amount:number){
    this.toast.showLoader('Bezig met verwerking')
    this.functions.httpsCallable('buyCredits')({amount:amount}).subscribe((response:any)=>{
      console.log(response)
      this.toast.hideLoader()
      this.toast.show('Credits gekocht')
    })
  }

}
