import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute } from '@angular/router';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subject, take, takeUntil } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { MenuPage } from 'src/app/components/menu/menu.page';
import { FilterKeyPipe } from 'src/app/pipes/filter-key.pipe';
import { FilterSearchPipe } from 'src/app/pipes/filter-search.pipe';
import { AccountService } from 'src/app/services/account.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';
import { SelectMenuService } from 'src/app/services/select-menu.service';
import { ToastService } from 'src/app/services/toast.service';
import { TrainerService } from 'src/app/services/trainer.service';

@Component({
  selector: 'app-marketplace',
  templateUrl: './marketplace.page.html',
  styleUrls: ['./marketplace.page.scss'],
})
export class MarketplacePage implements OnInit {
  activeTab:string = ''
  newTrainingCode:string = ''
  elearnings:any[] = []
  item_id:string = ''
  authentication:any = {
    email:'',
    password:''
  }
  isVerified: boolean = false;
  emailResend:string = '';
  verifyCode:any = {}
  showVerifyOption: boolean = false
  searchParams:any = {};
  private leave$ = new Subject<void>();
  visibleItems:any[] = [];
  filteredItems:any[] = [];
  maxItems: number = 15;
  infiniteScroll:any;
  firstLoaded: boolean = false;
  inputSpecialCode: string = '';
  checkedSpecialCodes: any[] = [];
  showFilterTrainers: boolean = false;
  searchTrainers: string = '';
  startTrainersList: number = 0;
  endTrainersList: number = 10;
  trainerInfoLoaded: boolean = false;
  showFilterSmall:boolean = false;
  filterIsEmpty:boolean = true;
  showLogin:boolean = false;
  constructor(
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
    private filterSearchPipe:FilterSearchPipe,
    private filterKeyPipe:FilterKeyPipe,
    private popoverController:PopoverController,
    private selectMenuservice:SelectMenuService,
    private trainerService:TrainerService,
  ) { }

  ngOnInit() {

    let params:any = location.search;
    if(params){
      params = new URLSearchParams(params);
      if(params.has('search')){
        this.searchParams.search = params.get('search') || '';
      }
      if(params.has('trainingId')){
        this.searchParams.trainingId = params.get('trainingId').split(',') || [];
      }
      if(params.has('trainerIds')){
        this.searchParams.trainerIds = params.get('trainerIds').split(',') || [];
      }
      else{
        this.searchParams.trainerIds = [];
      }
      if(params.has('specialCode')){
        this.searchParams.specialCode = params.get('specialCode') || '';
        // this.inputSpecialCode = this.searchParams.specialCode;
      }
      else{
        this.searchParams.specialCode = '';
        // this.inputSpecialCode = '';
      }
      if(params.has('private') && params.get('private') == '1'){
        this.searchParams.private = params.get('private') || '';
        // this.inputSpecialCode = this.searchParams.specialCode;
      }
      else{
        this.searchParams.private = '';
        // this.inputSpecialCode = '';
      }
      if(params.has('open') && params.get('open') == '1'){
        this.searchParams.open = 1;
      }
      console.log('searchParams', this.searchParams);
    }
    
    this.getElearnings(() => {
      this.firstLoaded = true;
      // console.log('MarketplacePage loaded searchParams:', this.searchParams);
      // if(this.searchParams.open) {
      //   this.updateVisibleItems();
      //   console.log('Visible items for open:', this.visibleItems);
      //   if(this.visibleItems[0]){
      //     if(this.searchParams.specialCode){
      //       this.nav.go('marketplace/elearnings/' + this.visibleItems[0].id + '?specialCode=' + this.searchParams.specialCode );
      //       return;
      //     }
      //     else{
      //       this.nav.go('marketplace/elearnings/' + this.visibleItems[0].id);
      //       return;
      //     }
      //   }
      // }
      if(this.searchParams.specialCode){
        let elearningIds = this.checkPrivateVisibleItems().map(i => i.id);
        console.log('elearningIds for special code check:', elearningIds);
        if(elearningIds.length > 0) {
          this.toast.showLoader(this.translate.instant('marketplace.checking_code'));
          this.functions.httpsCallable('elearningCheckSpecialCodes')({ specialCodes: this.searchParams.specialCode.split(','), elearnings:elearningIds }).pipe(take(1)).subscribe((response:any)=>{
            console.log(response)
            this.toast.hideLoader();
            setTimeout(() => {
              this.toast.hideLoader();
            }, 1000);
            if(response.status==200){
              this.checkedSpecialCodes = response.result.validCodes;
              this.updateVisibleItems();
            }
            else{
              this.toast.show(this.translate.instant('marketplace.code_not_found'), 6000);
              this.checkedSpecialCodes = [];
              this.updateVisibleItems();
            }
          })
        }
      }
    });
    this.accountService.fetchProducts();
    this.accountService.fetchProductsElearnings();

    this.trainerService.trainerInfoLoaded.subscribe((loaded) => {
      this.trainerInfoLoaded = loaded;
    });
  }

  clearFilter(){
    this.searchParams.search = ''
    this.searchParams.trainerIds = []
    this.searchParams.trainingId = []

    setTimeout(() => {
      this.updateVisibleItems();
    }, 100);
  }

  ionViewWillEnter() {
    let params:any = location.search;
    if(params){
      params = new URLSearchParams(params);
      if(params.has('search')){
        this.searchParams.search = params.get('search') || '';
      }
      if(params.has('trainingId')){
        this.searchParams.trainingId = params.get('trainingId').split(',') || [];
      }
      if(params.has('trainerId')){
        this.searchParams.trainerId = params.get('trainerId').split(',') || [];
      }
      if(params.has('specialCode')){
        this.searchParams.specialCode = params.get('specialCode') || '';
        // this.inputSpecialCode = this.searchParams.specialCode;
      }
      else{
        this.searchParams.specialCode = '';
        // this.inputSpecialCode = '';
      }
      if(params.has('open') && params.get('open') == '1'){
        this.searchParams.open = 1;
      }
      console.log('searchParams', this.searchParams);
    }

    this.route.params.pipe(takeUntil(this.leave$)).subscribe(params => {
      if(params['tab']){
        this.activeTab = params['tab'];
      }
      if(params['item_id']){
        this.item_id = params['item_id'];
      }
      if(this.item_id == 'error'){
        this.toast.show(this.translate.instant('error_messages.failure'), 6000);
        this.nav.go('marketplace/elearnings');
      }
      else if(this.item_id == 'success'){
        this.toast.show(this.translate.instant('marketplace.success_purchase'), 6000);
        setTimeout(() => {
          this.nav.go('start/my_trainings');
        }, 1000);
      }
    });
  }

  ionViewDidEnter() {
    setTimeout(() => {
      this.nav.reloadMenu.emit(true)
    }, 10);
  }
  
  ionViewWillLeave() {
    this.leave$.next();
    this.leave$.complete();
    this.showLogin = false;
  }

  addManualTraining(){
    this.toast.showLoader()
    this.auth.registerWithCode(this.newTrainingCode,(res:any) => {
      this.toast.hideLoader();
      if(res.status==200){
        this.auth.getActiveCourses(this.auth.userInfo,()=>{
          let code = this.auth.readJWT(this.newTrainingCode);
          console.log('code',code)
          let newTraining = this.auth.getTraining(code.trainingId)
          if(newTraining?.status_access == 'active'){
            this.toast.show(this.translate.instant('trainings.training_added'),6000)
          }
          else{
            this.toast.show(this.translate.instant('trainings.training_added_pending'),6000)
          }
          this.nav.go('start/my_trainings');
        },true)
      }
      else{
        this.toast.show(this.translate.instant('error_messages.invalid_code'),6000)
      }
    })
  }

  getElearnings(callback?:any) {
    this.firestoreService.query('elearnings', 'open_to_public', true).pipe(takeUntil(this.leave$)).subscribe((elearnings:any[]) => {
      this.elearnings = elearnings.map(e => {
        
        return {
          ...e.payload.doc.data(),
          id: e.payload.doc.id
        };
      });
      // console.log('elearnings', this.elearnings);
      this.updateVisibleItems();
      if (callback) {
        callback();
      }
    });
  }

  elearningItem(item_id:any) {
    if(!item_id && !this.item_id) {
      return {}
    }
    if(!item_id && this.item_id) {
      item_id = this.item_id;
    }
    return this.elearnings.find(e => e.id === item_id) || {};
  }

  countItems(item:any,type:string) {
    if(!item || !item.items) {
      return 0;
    }
    let itemsCount = this.countItemsInItems(item.items, type);
    return itemsCount;
  }


  countItemsInItems(items:any[], type:string) {
    if(!items || !Array.isArray(items)) {
      return 0;
    }
    let itemsCount = 0;
    items.forEach(item => {
      if(item.type === type) {
        itemsCount++;
      }
      if(item.items && Array.isArray(item.items)) {
        itemsCount += this.countItemsInItems(item.items, type);
      }
    });
    return itemsCount;
  }

  showCreditsOption:boolean = false;
  unlimitedCreditsOption:boolean = true;
  buyItem(item:any, skipCreditsCheck:boolean = false) {
    if(this.activeTab=='filter'){
      this.nav.goto(location.pathname.replace('/filter','/elearnings'), true);
      return;
    }
    if(!this.auth.userCredentials.emailVerified && !this.auth.userCredentials.email) {
      this.toast.show(this.translate.instant('marketplace.not_logged_in'), 6000);
      return;
    }
    // console.log('Buying item:', item, this.auth.credits);
    
    if(this.hasValidSpecialCode(item)){

    }

    if((!this.auth.credits_unlimited_type) && !skipCreditsCheck) {
      this.showCreditsOption = true;
      return;
    }

    let productItem = this.accountService.getProductElearningById(item.stripeProductId);


    // console.log(this.accountService.getUnlimitedChatProduct())
    // console.log('skip');
    let products:any[] = [productItem]
    if(this.showCreditsOption && this.unlimitedCreditsOption) {
      products.push(this.accountService.getUnlimitedChatProduct())
    }

    this.accountService.buyMultiple(products).then((res:any) => {
    }).catch((error:any) => {
      console.error('Purchase failed:', error);
      this.toast.show(this.translate.instant('elearnings.purchase_failed'), 6000);
    });


    
    
  }

  buyItemOrganisation(item:any) {
    if(this.activeTab=='filter'){
      this.nav.goto(location.pathname.replace('/filter','/elearnings'), true);
      return;
    }
    if(!this.auth.userCredentials.emailVerified && !this.auth.userCredentials.email) {
      this.toast.show(this.translate.instant('marketplace.not_logged_in'), 6000);
      return;
    }

    let productItem = this.accountService.getProductElearningById(item.stripeProductId);
    if(!productItem || !productItem.id) {
      this.toast.show(this.translate.instant('error_messages.failure'), 6000);
      return;
    }

    console.log('Buying item for organisation:', item, productItem);
    this.trainerInfoLoaded = false;
    this.trainerMenu(async () => {
      productItem.organisationId = this.nav.activeOrganisationId;

      
      let interval = setInterval(() => {
        if (this.trainerInfoLoaded) {
          clearInterval(interval);
          
          let employeesLength = this.trainerService.trainerInfo.employees ? this.trainerService.trainerInfo.employees.length : 0;

          let price = (productItem.prices[0].unit_amount / 100) * employeesLength;
          price = Math.round((price + Number.EPSILON) * 100) / 100;
          let priceMin = item.price_elearning_org_min ? parseFloat(item.price_elearning_org_min) * 1 : 0;
          let priceMax = item.price_elearning_org_max ? parseFloat(item.price_elearning_org_max) * 1 : 0;

          if(price < priceMin) {
            price = priceMin;
          }

          if(price > priceMax) {
            price = priceMax;
          }
          // productItem.originalPrice = Math.round((parseFloat(productItem.price) * (employeesLength)) * 100) / 100;
          // productItem.newPrice = (price * 100).toFixed(0);
          // productItem.quantity = employeesLength;
          this.modalService.showVerification('' + this.translate.instant('marketplace.confirm_purchase_title'), this.translate.instant('marketplace.confirm_purchase_organisation_text'), [
            {
              text: this.translate.instant('buttons.cancel'),
              color: 'dark',
              fill: 'clear',
              value: false
            },
            {
              text: this.translate.instant('buttons.buy_for') + ' € ' + price.toFixed(2),
              color: 'primary',
              fill: 'solid',
              value: true
            }
          ]).then((result:any) => {
            console.log('res', result);
            if(result) {
              this.accountService.buyMultiple([productItem]).then((res:any) => {
              }).catch((error:any) => {
                console.error('Purchase failed:', error);
                this.toast.show(this.translate.instant('elearnings.purchase_failed'), 6000);
              });
            }
          });



        }
      }, 100);

    });

  }
  
  authenticate(){
    this.auth.registerOnPage(this.authentication.email, this.authentication.password,()=>{
      this.showLogin = false;
    })
  }

  onCodeChanged(code: string) {
    // console.log(code)
    this.emailResend = ''
  }
  
  // this called only if user entered full code
  onCodeCompleted(code: string) {
    console.log('complete', code)
    this.verifyCode = {
      code:code
    }
    this.toast.showLoader(this.translate.instant('page_wait_verify.code_checking'))
    this.functions.httpsCallable('verifyEmailInitCode')({code:code,email:this.auth.userInfo.email}).pipe(take(1)).subscribe((response:any)=>{
      if(response.status==200){
        this.isVerified = true
        this.verifyCode.valid = true
        setTimeout(async () => {
          await this.auth.refreshFirebaseUser()
        }, 1000);
        this.showLogin = false;
        this.toast.show(this.translate.instant('page_wait_verify.verified'),3000,'bottom')
      }
      else if (response.result == 'code not valid') {
        this.verifyCode.invalid = true
      }
      else if (response.result == 'code expired') {
        this.verifyCode.expired = true
      }
      else{
        this.verifyCode.error = true
      }
      this.toast.hideLoader()
    })
  }


  resend(){
    this.emailResend = ''
    this.toast.showLoader(this.translate.instant('page_wait_verify.issend'))
    this.auth.resendEmailVerification((response:any)=>{
      this.toast.hideLoader()
      if(response?.status==200){
        this.emailResend = this.translate.instant('page_wait_verify.issend')
        this.toast.hideLoader()
      }
      else{
        this.emailResend = this.translate.instant('error_messages.failure')
        this.toast.hideLoader()
      }
      setTimeout(() => {
        this.showVerifyOption = true;
      }, 5000);
    });
    
  }

  verifyOption(){

    this.modalService.showVerification(
      this.translate.instant('page_wait_verify.verify_option_title'),
      this.translate.instant('page_wait_verify.verify_option_text').replace('{email}',this.auth.userInfo.email),
      [
        {
          text:this.translate.instant('buttons.back'),
          value:false,
          color:'dark'
        },
        {
          text:this.translate.instant('buttons.confirm'),
          value:true,
          color:'primary'
        },
        {
          text:this.translate.instant('page_wait_verify.wrong_email_delete_account'),
          value:'delete',
          color:'medium',
          fill:'clear',
          full:true,
          fullWidth:true
        }
      ]
    ).then(response=>{
      // console.log(response)
      if(response=== 'delete'){
        this.modalService.showConfirmation(this.translate.instant('page_wait_verify.wrong_email_delete_account_confirm')).then((response:any)=>{
          if(response){
            this.toast.showLoader(this.translate.instant('page_wait_verify.deleting_account'))
            this.deleteAccount()
          }
        })
      }
      else if(response){
        this.toast.showLoader()
        this.functions.httpsCallable('confirmMyEmail')({}).pipe(take(1)).subscribe((response:any)=>{
          // console.log(response)
          if(response.status==200){
            this.isVerified = true
            this.showLogin = false;
            this.toast.show(this.translate.instant('page_wait_verify.verified'),3000,'bottom')
          }
          else{
            this.toast.show(this.translate.instant('error_messages.failure'),3000)
          }
          this.toast.hideLoader()
        })
      }
    })
  }

  deleteAccount(){
    this.toast.showLoader(this.translate.instant('page_account.busy_deleting'))
    this.functions.httpsCallable('deleteSelf')({}).pipe(take(1)).subscribe((response:any)=>{
      this.toast.hideLoader()
      if(response.status==200){
        this.toast.show(this.translate.instant('page_account.delete_account_success'),3000)
        setTimeout(() => {
          this.auth.logout('marketplace/elearnings');
        }, 3000);
      }
      else{
        this.toast.show(this.translate.instant('page_account.delete_account_failure'),3000)
      }
    })
  }

  onFiltersChanged() {
    this.maxItems = 15; // reset zichtbaar aantal
    setTimeout(() => {
      this.updateVisibleItems();
    }, 200);
  }
  onSearchChanged() {
    this.maxItems = 15;
    this.updateVisibleItems();
  }

  updateVisibleItems() {  
    let startList = [...this.elearnings];
    if(this.searchParams.private && this.searchParams.private == '1' && this.checkedSpecialCodes && Array.isArray(this.checkedSpecialCodes) && this.checkedSpecialCodes.length > 0){
      let elearningIds = this.checkedSpecialCodes.map(c => c.elearningId);
      startList = startList.filter(e => elearningIds.includes(e.id));
      console.log('Filtered startList:', startList);
    }
    else if(this.searchParams.private){
      startList = [];
    }
    else{
      startList = startList.filter(e => e.marketplace === true);
    }

    const searched = this.filterSearchPipe.transform(
      startList,
      this.searchParams.search || '',
      false,
      ['title','user_info','tags','trainer.name']
    );
  
    const extraFiltered2 = this.filterKeyPipe.transform(
      searched,
      'trainerId',
      this.searchParams.trainerIds || []
    );
    

    const extraFiltered3 = this.filterKeyPipe.transform(
      extraFiltered2,
      'tags',
      this.searchParams.tags || ''
    );

    let extraFiltered4:any[] = [];

    extraFiltered4 = this.filterKeyPipe.transform(
      extraFiltered3,
      'originalTrainingId',
      this.searchParams.trainingId || []
    );

    this.filteredItems = extraFiltered4;
    // this.filteredCases = this.filteredCases.sort((a, b) => a.order_rating - b.order_rating);
    this.visibleItems = this.filteredItems.slice(0, this.maxItems);
    if (this.infiniteScroll) {
      this.infiniteScroll.disabled = this.visibleItems.length >= this.filteredItems.length;
    }

    if(this.searchParams.open) {
      console.log('Visible items for open:', this.visibleItems);
      if(this.visibleItems[0]){
        this.searchParams.open = 0;
        if(this.searchParams.specialCode){
          this.nav.go('marketplace/elearnings/' + this.visibleItems[0].id + '?specialCode=' + this.searchParams.specialCode );
          return;
        }
        else{
          this.nav.go('marketplace/elearnings/' + this.visibleItems[0].id);
          return;
        }
      }
    }

    setTimeout(() => {
      // console.log('disabled: ', this.visibleCases.length >= this.filteredCases.length)
      if( this.infiniteScroll){
        this.infiniteScroll.disabled = this.visibleItems.length >= this.filteredItems.length;
      }
    }, 400);
  }

  checkPrivateVisibleItems(){
    let startList = [...this.elearnings];
    startList = startList.filter(e => e.private === true);

    console.log(startList);
    const searched = this.filterSearchPipe.transform(
      startList,
      this.searchParams.search || '',
      false,
      ['title','user_info','tags','trainer.name']
    );
  
    const extraFiltered2 = this.filterKeyPipe.transform(
      searched,
      'trainerId',
      this.searchParams.trainerIds || []
    );

    const extraFiltered3 = this.filterKeyPipe.transform(
      extraFiltered2,
      'tags',
      this.searchParams.tags || ''
    );

    let extraFiltered4:any[] = [];

    extraFiltered4 = this.filterKeyPipe.transform(
      extraFiltered3,
      'originalTrainingId',
      this.searchParams.trainingId || []
    );

    return extraFiltered4;
    // this.filteredCases = this.filteredCases.sort((a, b) => a.order_rating - b.order_rating);
    
  }


  loadMore(event?: any) {
    this.maxItems += 15;
    this.visibleItems = this.filteredItems.slice(0, this.maxItems);
  
    if (event) {
      event.target.complete();
    }
  
    if (this.maxItems >= this.filteredItems.length && event) {
      event.target.disabled = true;
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

  activateWithCode(elearning:any) {
    this.toast.showLoader();
    if(!elearning || !elearning.id) {
      this.toast.hideLoader();
      this.toast.show(this.translate.instant('error_messages.failure'), 6000);
      return;
    }
    let specialCode = '';
    for(let code of this.checkedSpecialCodes) {
      if(elearning.id === code.elearningId) {
        specialCode = code.specialCode;
        break;
      }
    }
    if(!specialCode) {
      this.toast.hideLoader();
      this.toast.show(this.translate.instant('error_messages.failure'), 6000);
      return;
    }
    console.log('Activating elearning with code:', elearning, specialCode);

    this.functions.httpsCallable('activateElearningWithCode')({ elearningId: elearning.id, specialCode }).subscribe({
      next: (response:any) => {
        if(response.status == 500) {
          console.log('Purchase error:', response);
          this.toast.hideLoader();
          this.toast.show(this.translate.instant('marketplace.not_logged_in'), 6000);
          return;
        }
        else if(response.status == 404) {
          console.log('Purchase error:', response);
          this.toast.hideLoader();
          this.toast.show(this.translate.instant('error_messages.failure'), 6000);
          return;
        }
        else if(response.status == 400) {
          console.log('Purchase error:', response);
          this.toast.hideLoader();
          this.toast.show(this.translate.instant('marketplace.activation_failed_code'), 6000);
          return;
        }
        else if(response.status == 402) {
          console.log('Purchase error:', response);
          this.toast.hideLoader();
          this.toast.show(this.translate.instant('marketplace.activation_failed_used'), 6000);
          return;
        }
        else if(response.status == 405) {
          console.log('Purchase error:', response);
          this.toast.hideLoader();
          this.toast.show(this.translate.instant('marketplace.activation_already_used'), 6000);
          return;
        }
        else if(response.status == 406) {
          console.log('Purchase error:', response);
          this.toast.hideLoader();
          this.toast.show(this.translate.instant('marketplace.activation_not_private'), 6000);
          return;
        }
        else if(response.status !== 200) {
          console.log('Purchase error:', response);
          this.toast.hideLoader();
          this.toast.show(this.translate.instant('error_messages.failure'), 6000);
          return;
        }
        // console.log('Purchase successful:', response);
        this.toast.hideLoader();
        this.toast.show(this.translate.instant('marketplace.activation_successful'), 6000);
        setTimeout(() => {
          this.nav.go('start/my_trainings');
        }, 2000);
      },
      error: (error:any) => {
        console.error('Purchase failed:', error);
        this.toast.hideLoader();
        this.toast.show(this.translate.instant('error_messages.failure'), 6000);
      }
    });
  }

  async activateWithCodeOrganisation(elearning:any) {
    
    if(!elearning || !elearning.id) {
      this.toast.hideLoader();
      this.toast.show(this.translate.instant('error_messages.failure'), 6000);
      return;
    }
    let specialCode = '';
    for(let code of this.checkedSpecialCodes) {
      if(elearning.id === code.elearningId) {
        specialCode = code.specialCode;
        break;
      }
    }
    if(!specialCode) {
      this.toast.hideLoader();
      this.toast.show(this.translate.instant('error_messages.failure'), 6000);
      return;
    }
    // console.log('Activating elearning with code:', elearning, specialCode); 
    this.trainerMenu(() => {
      this.toast.showLoader();
      this.functions.httpsCallable('activateElearningWithCode')({ elearningId: elearning.id, specialCode, organisationId: this.nav.activeOrganisationId }).subscribe({
        next: (response:any) => {
          if(response.status == 500) {
            console.log('Purchase error:', response);
            this.toast.hideLoader();
            this.toast.show(this.translate.instant('marketplace.not_logged_in'), 6000);
            return;
          }
          else if(response.status == 404) {
            console.log('Purchase error:', response);
            this.toast.hideLoader();
            this.toast.show(this.translate.instant('error_messages.failure'), 6000);
            return;
          }
          else if(response.status == 400) {
            console.log('Purchase error:', response);
            this.toast.hideLoader();
            this.toast.show(this.translate.instant('marketplace.activation_failed_code'), 6000);
            return;
          }
          else if(response.status == 402) {
            console.log('Purchase error:', response);
            this.toast.hideLoader();
            this.toast.show(this.translate.instant('marketplace.activation_failed_used'), 6000);
            return;
          }
          else if(response.status == 405) {
            console.log('Purchase error:', response);
            this.toast.hideLoader();
            this.toast.show(this.translate.instant('marketplace.activation_already_used'), 6000);
            return;
          }
          else if(response.status == 406) {
            console.log('Purchase error:', response);
            this.toast.hideLoader();
            this.toast.show(this.translate.instant('marketplace.activation_not_private'), 6000);
            return;
          }
          else if(response.status !== 200) {
            console.log('Purchase error:', response);
            this.toast.hideLoader();
            this.toast.show(this.translate.instant('error_messages.failure'), 6000);
            return;
          }
          // console.log('Purchase successful:', response);
          this.toast.hideLoader();
          this.toast.show(this.translate.instant('marketplace.activation_successful'), 6000);
          setTimeout(() => {
            this.nav.go('start/my_organisation');
          }, 2000);
        },
        error: (error:any) => {
          console.error('Purchase failed:', error);
          this.toast.hideLoader();
          this.toast.show(this.translate.instant('error_messages.failure'), 6000);
        }
      });
    });
  }

  shortMenu:any;
  async trainerMenu(callback:any){
      console.log('trainerMenu',this.auth.organisations.length)
      if(this.auth.organisations.length==1){
        this.nav.changeOrganisation(this.auth.organisations[0].id)
        // this.nav.activeOrganisationId = this.auth.organisations[0].id
        // this.trainerInfoLoaded = true;
        callback()
        return
      }
  
      let list = []
      for(let i=0;i<this.auth.organisations.length;i++){
        list.push({
          title:this.auth.organisations[i].name,
          icon:this.auth.organisations[i].logo ? '' :'faStar',
          image:this.auth.organisations[i].logo ? this.auth.organisations[i].logo : '',
          // url:'/trainer/trainings',
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
  

  listAllTrainers(){
    let trainers:any[] = [];
    this.elearnings.forEach(e => {
      if(e.trainer && e.trainer.id && e.trainer.name && e.marketplace){
        if(!trainers.find(t => t.id == e.trainer.id)){
          trainers.push({
            id: e.trainer.id,
            name: e.trainer.name,
            logo: e.trainer.logo || '',
            nameLower: e.trainer.name.toLowerCase()
          });
        }
      }
    });
    return trainers;
  }

  selectTrainer(trainerId:string){
    if(!this.searchParams){
      this.searchParams = {};
    }
    if(!this.searchParams?.trainerIds || !Array.isArray(this.searchParams.trainerIds)){
      this.searchParams.trainerIds = [];
    }
    if(this.searchParams.trainerIds.includes(trainerId)){
      this.searchParams.trainerIds = this.searchParams.trainerIds.filter((id:string) => id !== trainerId);
    }
    else{
      this.searchParams.trainerIds.push(trainerId);
    }
    this.onFiltersChanged();
  }

  trainerSelected(trainerId:string){
    if(!this.searchParams?.trainerIds || !Array.isArray(this.searchParams.trainerIds)){
      return false;
    }
    return this.searchParams.trainerIds.includes(trainerId);
  }

  pageTrainers = 0;
  pageTrainerList(direction:number){
    if(direction>0){
      if(this.pageTrainers < this.countChunks(10) -1){
        this.pageTrainers += 1;
      }
    }
    else{
      if(this.pageTrainers > 0){
        this.pageTrainers -= 1;
      }
    }
    // console.log(this.startTrainersList,this.endTrainersList);
  }

  countChunks(chunkSize:number){
    if(!this.listAllTrainers() || !Array.isArray(this.listAllTrainers()) || this.listAllTrainers().length === 0 || chunkSize <= 0){
      return 0;
    }
    return Math.ceil(this.listAllTrainers().length / chunkSize);
  }

  getTrainer(trainerId:string){
    if(!trainerId){
      return {};
    }
    return this.listAllTrainers().find(t => t.id === trainerId) || {};
  }

  showTrainerInfo(elearning:any, event:any){
    if(event){
      event.stopPropagation();
      event.preventDefault();
    }
    if(!elearning || !elearning.trainer){
      return;
    }

    this.modalService.showTrainerInfo(elearning.trainer, (response:any)=>{})
  }
}