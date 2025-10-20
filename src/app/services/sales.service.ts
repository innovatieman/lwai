import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { takeUntil } from 'rxjs';
import { AccountService } from './account.service';
import { ToastService } from './toast.service';
import { TranslateService } from '@ngx-translate/core';
import { NavService } from './nav.service';
import { ModalService } from './modal.service';
import { AuthService } from '../auth/auth.service';
import { MenuPage } from '../components/menu/menu.page';
import { PopoverController } from '@ionic/angular';
import { TrainerService } from './trainer.service';
import { SelectMenuService } from './select-menu.service';
import { AngularFireFunctions } from '@angular/fire/compat/functions';

@Injectable({
  providedIn: 'root'
})
export class SalesService {
  elearnings:any[] = [];
  item_id:string = '';
  trainerInfoLoaded:boolean = false;
  checkedSpecialCodes:any[] = [];
  constructor(
    private firestoreService: FirestoreService,
    private accountService: AccountService,
    private toast: ToastService,
    private translate: TranslateService,
    private nav: NavService,
    private modalService: ModalService,
    private auth: AuthService,
    private popoverController: PopoverController,
    private trainerService: TrainerService,
    private selectMenuservice:SelectMenuService,
    private functions: AngularFireFunctions,
  ) { }

  customerFields(customer?:any){
    let fields = [
      {
        type:'text',
        title:this.translate.instant('form.company')+'*',
        value:customer?.company || '',
        required:true,
      },
      {
        type:'text',
        title:this.translate.instant('form.address')+'*',
        value:customer?.address || '',
        required:true,
      },
      {
        type:'text',
        title:this.translate.instant('form.zip')+'*',
        value:customer?.zip || '',
        required:true,
      },
      {
        type:'text',
        title:this.translate.instant('form.city')+'*',
        value:customer?.city || '',
        required:true,
      },
      {
        type:'text',
        title:this.translate.instant('form.country')+'*',
        value:customer?.country || '',
        required:true,
      },
      {
        type:'text',
        title:this.translate.instant('form.phone'),
        value:customer?.phone || '',
        required:false,
      },
      {
        type:'email',
        title:this.translate.instant('form.email')+'*',
        value:customer?.email || '',
        required:true,
      },
      {
        type:'email',
        title:this.translate.instant('form.email_invoice')+'*',
        value:customer?.email_invoice || '',
        required:true,
      },
      {
        type:'text',
        title:this.translate.instant('form.reference'),
        value:customer?.reference || '',
        required:false,
      },
      {
        type:'text',
        title:this.translate.instant('form.tax_nr'),
        value:customer?.tax_nr || '',
        required:false,
      },
    ]
    return fields
  }
  
  getElearnings(callback?:any) {
    this.firestoreService.query('elearnings', 'open_to_public', true).subscribe((elearnings:any[]) => {
      this.elearnings = elearnings.map(e => {
        
        return {
          ...e.payload.doc.data(),
          id: e.payload.doc.id
        };
      });
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
    return this.elearnings.find(e => (e.id === item_id || e.originalTrainingId === item_id)) || {};
  }


  buyItemOrganisation(item:any) {

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
              this.buyMultiple([productItem]).then((res:any) => {
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

   activateWithCode(elearning:any) {
    // console.log('Activating elearning with code:', elearning);
    this.toast.showLoader();
    if(!elearning || !elearning.id) {
      this.toast.hideLoader();
      this.toast.show(this.translate.instant('error_messages.failure'), 6000);
      return;
    }
    let specialCode = '';
    // console.log('checkedSpecialCodes',this.checkedSpecialCodes)
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
        this.auth.getMyElearnings(this.auth.userInfo.uid, () => {
          this.toast.hideLoader();
          this.auth.getCredits(this.auth.userInfo.uid);
          this.toast.show(this.translate.instant('marketplace.activation_successful'), 6000);
          setTimeout(() => {
            this.nav.go('start/my_trainings');
          }, 2000);
        })
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

  buyItem(item:any, skipCreditsCheck:boolean = false) {

    let productItem = this.accountService.getProductElearningById(item.stripeProductId);

    let products:any[] = [productItem]
    products.push(this.accountService.getUnlimitedChatProduct())
    // }

    this.accountService.buyMultiple(products).then((res:any) => {
    }).catch((error:any) => {
      console.error('Purchase failed:', error);
      this.toast.show(this.translate.instant('elearnings.purchase_failed'), 6000);
    });

  }

  async buyMultiple(items: any[],metadata?: any,userInfo?: any) {

    const user = await this.auth.userInfo;
    if (!user) return;

    const stripeProductIds = items.map(i => i.id); // 🔒 alleen IDs meegeven

    // ✅ Credits check en opslaan
    const creditsItem = items.find((item) => item.credits);
    if (creditsItem) {
      localStorage.setItem('buying Credits', creditsItem.credits);
      localStorage.setItem('oldCredits', this.auth.credits.total);
    }

    const successPath = window.location.origin + '/' + ('checkout/' + items[0].elearningId + '/success');
    const cancelPath = window.location.origin + '/' + ('checkout/' + items[0].elearningId + '/error' );

    try {
      let callObj:any = { stripeProductIds, successPath, cancelPath };
      if(items[0].organisationId){
        callObj['organisationId'] = items[0].organisationId;
      }
      if(metadata){
        callObj['metadata'] = metadata;
      }
      if(userInfo){
        callObj['userInfo'] = userInfo;
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

  }



}
