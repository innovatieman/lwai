import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { filter, Subject, take, takeUntil } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { MenuPage } from 'src/app/components/menu/menu.page';
import { AccountService } from 'src/app/services/account.service';
import { CountriesService } from 'src/app/services/countries.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';
import { SalesService } from 'src/app/services/sales.service';
import { SelectMenuService } from 'src/app/services/select-menu.service';
import { ToastService } from 'src/app/services/toast.service';
import { TrainerService } from 'src/app/services/trainer.service';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.page.html',
  styleUrls: ['./checkout.page.scss'],
})
export class CheckoutPage implements OnInit {
  item_id:string = ''
  status:string = ''
  firstLoaded:boolean = false;
  checkedSpecialCodes:any[] = [];
  specialCodeChecked:boolean = false;
  searchParams:any = {};
  userForm: FormGroup = new FormGroup({});
  showPassword: boolean = false;
  extraOrderList:any[] = [];
  processing: boolean = false;
  standAloneMode: boolean = false;
  pricesInclVat: boolean = true;
  private leave$ = new Subject<void>();
  constructor(
    private fb: FormBuilder,
    public afAuth: AngularFireAuth,
    public media: MediaService,
    public icon:IconsService,
    public auth:AuthService,
    public nav:NavService,
    private route: ActivatedRoute,
    public translate:TranslateService,
    private toast:ToastService,
    private firestoreService: FirestoreService,
    public helper:HelpersService,
    private functions: AngularFireFunctions,
    private accountService:AccountService,
    private modalService:ModalService,
    private selectMenuservice:SelectMenuService,
    public sales:SalesService,
    public countries:CountriesService,
    public trainerService:TrainerService,
    private popoverController:PopoverController,
  ) {
    this.userForm = this.fb.group({
      name: [{value: auth.userInfo?.displayName || '', disabled: !!auth.userInfo?.displayName}, [Validators.required]],
      email: [{value: auth.userInfo?.email || '', disabled: !!auth.userInfo?.email}, [Validators.required, Validators.email]],
      password: [{value:'', disabled: !!auth.userInfo?.email}, auth.userInfo?.email ? [] : [Validators.required, Validators.minLength(6)]],
      postal_code: ['', this.userForm?.controls['isCompany']?.value ? [Validators.required] : []],
      city: ['', this.userForm?.controls['isCompany']?.value ? [Validators.required] : []],
      address: ['', this.userForm?.controls['isCompany']?.value ? [Validators.required] : []],
      country: ['', this.userForm?.controls['isCompany']?.value ? [Validators.required] : []],
      isCompany: [false],
      company: ['', this.userForm?.controls['isCompany']?.value ? [Validators.required] : []],
      reference: ['', this.userForm?.controls['isCompany']?.value ? [] : []],
      terms_accepted: [false, [Validators.requiredTrue]],
    });
   }

  ngOnInit() {
    this.sales.getElearnings(() => {
      this.firstLoaded = true;

      let userSubscription = this.auth.userInfo$.pipe(
        filter(userInfo => !!userInfo?.uid), // wacht tot uid aanwezig is
        take(1) // pak alleen de eerste geldige waarde
      ).subscribe(userInfo => {
        if(userInfo && userInfo.uid){

          this.userForm = this.fb.group({
            name: [{value: userInfo?.displayName || '', disabled: !!userInfo?.displayName}, [Validators.required]],
            email: [{value: userInfo?.email || '', disabled: !!userInfo?.email}, [Validators.required, Validators.email]],
            password: [{value:'', disabled: !!userInfo?.email}, userInfo?.email ? [] : [Validators.required, Validators.minLength(6)]],
            postal_code: ['', this.userForm?.controls['isCompany']?.value ? [Validators.required] : []],
            city: ['', this.userForm?.controls['isCompany']?.value ? [Validators.required] : []],
            address: ['', this.userForm?.controls['isCompany']?.value ? [Validators.required] : []],
            country: ['', this.userForm?.controls['isCompany']?.value ? [Validators.required] : []],
            isCompany: [false],
            company: ['', this.userForm?.controls['isCompany']?.value ? [Validators.required] : []],
            reference: ['', this.userForm?.controls['isCompany']?.value ? [] : []],
            terms_accepted: [false, [Validators.requiredTrue]],
          });
        }
      });

      
      let params:any = location.search;
      if(params){
        params = new URLSearchParams(params);
        if(params.has('specialCode')){
          this.searchParams.specialCode = params.get('specialCode') || '';
          // this.inputSpecialCode = this.searchParams.specialCode;

          // let elearningIds = this.checkPrivateVisibleItems().map(i => i.id);
          let elearningIds = this.sales.elearnings.map(i => i.id);
          if(elearningIds.length > 0) {
            this.specialCodeChecked = false;
            let countCheck = 0;
            this.toast.showLoader(this.translate.instant('marketplace.checking_code'));
            let intervalChecking = setInterval(() => {
              if(this.specialCodeChecked){
                clearInterval(intervalChecking);
              }
              countCheck++;
              if(countCheck > 40){
                clearInterval(intervalChecking);
                this.toast.hideLoader();
              }
            }, 300);
            this.functions.httpsCallable('elearningCheckSpecialCodes')({ specialCodes: this.searchParams.specialCode.split(','), elearnings:elearningIds }).pipe(take(1)).subscribe((response:any)=>{
              this.toast.hideLoader();
              setTimeout(() => {
                this.toast.hideLoader();
              }, 1000);
              this.specialCodeChecked = true;
              if(response.status==200){
                this.checkedSpecialCodes = response.result.validCodes;
              }
              else{
                this.toast.show(this.translate.instant('marketplace.code_not_found'), 6000);
                this.checkedSpecialCodes = [];
              }
            })
          }


        }
        else{
          this.searchParams.specialCode = '';
          // this.inputSpecialCode = '';
        }
        if(params.has('pricesInclVat')){
          this.pricesInclVat = params.get('pricesInclVat') !== 'false';
        }
      }
    });
    this.accountService.fetchProducts();
    this.accountService.fetchProductsElearnings();
  }

  resetFormValidators(){
    if(this.userForm.controls['isCompany'].value){
      this.userForm.controls['company'].setValidators([Validators.required]);
      this.userForm.controls['postal_code'].setValidators([Validators.required]);
      this.userForm.controls['city'].setValidators([Validators.required]);
      this.userForm.controls['address'].setValidators([Validators.required]);
      this.userForm.controls['country'].setValidators([Validators.required]);
    }
    else{
      this.userForm.controls['company'].clearValidators();
      this.userForm.controls['postal_code'].clearValidators();
      this.userForm.controls['city'].clearValidators();
      this.userForm.controls['address'].clearValidators();
      this.userForm.controls['country'].clearValidators();
    }
    this.userForm.controls['company'].updateValueAndValidity();
    this.userForm.controls['postal_code'].updateValueAndValidity();
    this.userForm.controls['city'].updateValueAndValidity();
    this.userForm.controls['address'].updateValueAndValidity();
    this.userForm.controls['country'].updateValueAndValidity();
  }


  ionViewWillLeave() {
    this.leave$.next();
    this.leave$.complete();
  }

  ionViewWillEnter(){
    this.route.params.pipe(takeUntil(this.leave$)).subscribe(params => {
      if(params['status']){
        this.status = params['status'];
      }
      if(params['item_id']){
        this.item_id = params['item_id'];
      }
      if(this.status == 'error'){
        this.toast.show(this.translate.instant('checkout.failure'), 6000);
        this.processing = false;
        this.nav.go('checkout/'+this.item_id);
        // this.nav.go('marketplace/elearnings');
      }
      else if(this.status == 'success'){
        this.toast.show(this.translate.instant('marketplace.success_purchase'), 6000);
        setTimeout(() => {
          let count = 0
          const interval = setInterval(() => {
            count++
            if(count>50){
              clearInterval(interval);
              console.log('New training not found in user profile, redirecting to my trainings');
              this.nav.go('start/my_trainings');
            }
            if(this.auth.myElearnings?.findIndex((e:any) => e.originalTrainingId === this.item_id) > -1){
              console.log('New elearning found in user profile, redirecting to my trainings');
              clearInterval(interval);
              this.nav.go('start/my_trainings');
            }
          }, 300);
          //
        }, 4000);
      }
      else if(this.status == 'standalone'){
        this.standAloneMode = true;
      }
    });
  }

  inExtraOrderList = (id:string) => {
    if(!id) {
      return false;
    }
    return this.extraOrderList.findIndex(i => i.id === id) > -1;
  }

  addToExtraOrderList = (item:any) => {
    if(!item || !item.id) {
      return;
    }
    const index = this.extraOrderList.findIndex(i => i.id === item.id);
    if(index > -1) {
      this.extraOrderList.splice(index, 1);
    } else {
      this.extraOrderList.push(item);
    }
  }

  hasValidSpecialCode(elearning:any) {
    if(!elearning || !this.checkedSpecialCodes || !Array.isArray(this.checkedSpecialCodes) || this.checkedSpecialCodes.length === 0) {
      return false;
    }
    for(let code of this.checkedSpecialCodes) {
      if(elearning.id === code.elearningId) {
        return true;
      }
    }
    return false;
  }

  calculatePrice(){
    let total = 0;
    if(this.sales.elearningItem(this.item_id)){
      if(this.hasValidSpecialCode(this.sales.elearningItem(this.item_id))) {
        total += 0;
      }
      else{
        total += this.sales.elearningItem(this.item_id).price_elearning || 0;
      }
    }
    if(this.extraOrderList && Array.isArray(this.extraOrderList) && this.extraOrderList.length > 0) {
      for(let item of this.extraOrderList) {
        if(item && item.price_elearning) {
          if(this.hasValidSpecialCode(this.sales.elearningItem(item.id))) {
            total += 0;
          }
          else{
            total += item.price_elearning;
          }
        }
      }
    }
    if(!this.auth?.credits_unlimited_type) {
      total += 20.66;
    } 
    return {
      total: total,
      tax: (total * 0.21).toFixed(2),
      // excl_tax: (total - (total * 0.21)).toFixed(2),
      incl_tax: (total + (total * 0.21)).toFixed(2)
    }
  }

  trainerInfoLoaded:boolean = false;
  buyItemsOrganisation(invoice?:boolean) {

    this.trainerInfoLoaded = false;
    this.trainerMenu(async () => {
      this.buyItems(invoice, this.nav.activeOrganisationId);
    });

  }
  
  shortMenu:any;
  async trainerMenu(callback:any){
      if(this.auth.organisations.length==1){
        this.nav.changeOrganisation(this.auth.organisations[0].id)
        callback()
        return
      }
  
      let list = []
      for(let i=0;i<this.auth.organisations.length;i++){
        list.push({
          title:this.auth.organisations[i].name,
          icon:this.auth.organisations[i].logo ? '' :'faStar',
          image:this.auth.organisations[i].logo ? this.auth.organisations[i].logo : '',
          logo:this.auth.organisations[i].logo !=undefined,
          id:this.auth.organisations[i].id,
          value:this.auth.organisations[i].id,
        })
      }
  
      this.shortMenu = await this.popoverController.create({
        component: MenuPage,
        componentProps:{
          customMenu:true,
          pages:list
        },
        cssClass: 'customMenu',
        event: event,
        translucent: false,
        reference:'trigger',
      });
      this.shortMenu.shadowRoot.lastChild.lastChild['style'].cssText = 'border-radius: 24px !important;';
      await this.shortMenu.present();
      await this.shortMenu.onWillDismiss().then((result:any)=>{
        if(this.selectMenuservice.selectedItem){
          this.nav.changeOrganisation(this.selectMenuservice.selectedItem.id)
          callback()
        }
      })
    }


  async buyItems(invoice?:boolean,organisationId?:string) {
    let userData = JSON.parse(JSON.stringify(this.userForm.value))
    if(this.processing) {
      return;
    }
    if(!this.userForm.valid) {
      this.toast.show(this.translate.instant('error_messages.fill_all_required'), 6000);
      return;
    }

    // if(userData.isCompany && !userData.company) {
    //   this.toast.show(this.translate.instant('error_messages.fill_all_required'), 6000);
    //   return;
    // }

    if(invoice){
      userData.invoice = true;
    }

    


    let products = [];
    let items = [];
    if(this.sales.elearningItem(this.item_id)){
      items.push(this.sales.elearningItem(this.item_id));
      if(organisationId){
        items[0].organisationId = organisationId;
      }
    }
    if(this.extraOrderList && Array.isArray(this.extraOrderList) && this.extraOrderList.length > 0) {
      for(let item of this.extraOrderList) {
        if(item) {
          if(this.hasValidSpecialCode(this.sales.elearningItem(item.id))) {
            item.price_elearning = 0;
            item.price_elearning_org_min = 0;
            item.price_elearning_org_max = 0;
            item.specialCode = this.searchParams.specialCode;
          }
          items.push(item);
        }
      }
    }

    for(let item of items) {
      if(item && item.stripeProductId) {
        let productItem = this.accountService.getProductElearningById(item.stripeProductId);
        if(productItem) {
          products.push({...productItem,elearningId: item.id, quantity: 1, amount:1,description:'temp'});
        }
      }
    }

    if(!this.auth?.credits_unlimited_type) {
      products.push({...this.accountService.getUnlimitedChatProduct(), quantity: 1, amount:1,description:'temp'});
    }


    // this.processing = true;
    this.toast.showLoader(this.translate.instant('checkout.processing'));
    let authentication = await this.authenticate();

    let count = 0
    const interval = setInterval(async () => {
      count++
      if(count>50){
        clearInterval(interval);
        this.toast.hideLoader();
        this.processing = false;
        this.toast.show(this.translate.instant('elearnings.purchase_failed'), 6000);
      }
      if(this.auth.userInfo && authentication!='logged_in'){
        if(this.auth.userInfo.language && this.auth.userInfo.language!=this.translate.currentLang){
          this.nav.setLang(this.auth.userInfo.language)
        }
        this.firestoreService.create('user_languages',{language:this.translate.currentLang,email:this.userForm.controls['email'].value,buy:true,displayName:this.userForm.controls['name'].value})
      }
      clearInterval(interval);
      if(!invoice){
        this.sales.buyMultiple(products,null, userData).then((res:any) => {
        }).catch((error:any) => {
          console.error('Purchase failed:', error);
          this.processing = false;
          this.toast.show(this.translate.instant('elearnings.purchase_failed'), 6000);
        });
      }
      else{
        const callable = this.functions.httpsCallable('buyElearningWithInvoice');
        callable({ 
          products: products,
          organisationId: organisationId || null,
          email: this.userForm.controls['email'].value,
          name: this.userForm.controls['name'].value,
          address: {
            line1: this.userForm.controls['address'].value,
            postal_code: this.userForm.controls['postal_code'].value,
            city: this.userForm.controls['city'].value,
            country: this.userForm.controls['country'].value,
          },
          company: userData.isCompany ? this.userForm.controls['company'].value : '',
          userId: this.auth.userInfo?.uid || '',
        }).pipe(take(1)).subscribe({
          next: (result:any) => {
            this.toast.hideLoader();
            this.processing = false;
            this.nav.go('checkout/'+this.item_id+'/success');
          }
        });
      }

      
    }, 300);

  }

  async authenticate(){

    if(this.auth.userInfo && this.auth.userInfo.uid){
      return 'logged_in';
    }

    try{
      await this.afAuth.createUserWithEmailAndPassword(this.userForm.controls['email'].value, this.userForm.controls['password'].value);
      return 'registered';
      // this.firestoreService.create('user_languages',{language:this.translate.currentLang,email:this.userForm.controls['email'].value,buy:true,displayName:this.userForm.controls['first_name'].value+' '+this.userForm.controls['last_name'].value,uid:this.auth.userInfo.uid})

    } catch (error:any) {
        this.toast.hideLoader();

        if(error.toString().includes('email-already-in-use')){
          try {
            const userCredential = await this.afAuth.signInWithEmailAndPassword(this.userForm.controls['email'].value, this.userForm.controls['password'].value);
            await userCredential.user?.reload();
            return 'signed_in';
          } catch (error) {
            // this.toast.hideLoader();
            console.error('Login error:', error);
            this.toast.show(this.translate.instant('checkout.login_failed'));
            this.processing = false;
            throw error;
          }
        }
        else{
          this.toast.show(this.translate.instant('page_register.registration_failed'));
          this.processing = false;
          throw error;
        }
      }
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
        this.userForm.patchValue({
          country: result.data.value
        });
      }
    }, null, this.translate.instant('languages.select_country'));
  }

  showExample(){
    this.toast.showLoader()
    this.functions.httpsCallable('exampleElearning')({ elearningId: this.item_id }).pipe(take(1)).subscribe((response:any)=>{
      this.toast.hideLoader()
      setTimeout(() => {
        this.toast.hideLoader()
      }, 2000);
      if(response.title){
        this.modalService.exampleTraining(response);
      }
      else{
        this.toast.show(this.translate.instant('error_messages.failure'), 6000);
      }
    })

  }    
}
