import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter, max, Subject, take, takeUntil } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { AccountService } from 'src/app/services/account.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';
import { ToastService } from 'src/app/services/toast.service';
import { TrainerService } from 'src/app/services/trainer.service';
import { tutorialService } from 'src/app/services/tutorial.service';
import * as moment from 'moment';
@Component({
  selector: 'app-customers',
  templateUrl: './customers.page.html',
  styleUrls: ['./customers.page.scss'],
})
export class CustomersPage implements OnInit {
  [x:string]:any;
  showPart:string = 'customers';
  showCustomerList:boolean = false;
  showCustomerListPrivate:boolean = false;
  showCustomerListDirect:boolean = false;
  private leave$ = new Subject<void>();
  trainerDataLoaded:boolean = false;
  isAdmin:boolean = false;
  isTrainer:boolean = false;
  isTrainerPro:boolean = false;
  searchTerm:string = '';

  constructor(
    public nav: NavService,
    public trainerService:TrainerService,
    public media:MediaService,
    private firestore:FirestoreService,
    public auth:AuthService,
    public icon:IconsService,
    private toast:ToastService,
    public translate:TranslateService,
    private functions:AngularFireFunctions,
    public helper:HelpersService,
    public accountService:AccountService,
    private route:ActivatedRoute,
    private modalService:ModalService,
    private tutorial:tutorialService,
  ) { }

  ngOnInit() {
    this.accountService.ngOnInit()
  }

  useAction(action:string){
    if(action.includes('.')){
      let parts = action.split('.');
      if(action.includes('(')){
        let params:any = action.substring(action.indexOf('(') + 1, action.indexOf(')'));
        if(params && params.includes(':')){
          params = params.split(':')
          params = this[params[0]][params[1]]
        }
        this[parts[0]][parts[1]](params);
      }
      else {
        this[parts[0]][parts[1]]();
      }
    } else if(action.includes('(')){
      let defAction = action.substring(0, action.indexOf('('));
      let params:any = action.substring(action.indexOf('(') + 1, action.indexOf(')'));
      if(params && params.includes(':')){
        params = params.split(':')
        params = this[params[0]][params[1]]
      }
      this[defAction](params);
    } else {
      this[action]();
    }
  }

  setPageParam(){
    let param = 'trainer/customers'
     if(this.showPart){
      param = param + '/' + this.showPart
    }
    return param
  }

  setOptionsParam(){
    let param = ''
    param = 'trainer/customers'
    return param
  }

  reloadMenu(){
    setTimeout(() => {
      this.nav.reloadMenu.emit(true)
    }, 10);
  }

  ionViewWillEnter(){
    this.route.params.pipe(takeUntil(this.leave$)).subscribe(params=>{
        if(params['tab']){
          this.showPart = params['tab']
        }
        if(params['status']){
          if(params['status']=='success'){
            this.modalService.showText(this.translate.instant('page_account.payment_success'),this.translate.instant('messages.success'))
          }
          else if(params['status']=='error'){
            this.toast.show(this.translate.instant('error_messages.failure'),4000,'middle')
          }
          this.nav.go('trainer/customers/')
        }
        // console.log('showPart',this.showPart)
        this.trainerService.trainerInfoLoaded$.pipe(filter(loaded => loaded === true))
        .subscribe(() => {
            this.trainerDataLoaded = true;
          
        })
      })


      this.auth.userInfo$.pipe(takeUntil(this.leave$)).subscribe(userInfo => {
        if (userInfo) {
          this.auth.hasActive('trainer').pipe(takeUntil(this.leave$)).subscribe((trainer)=>{
            if(trainer){

              this.trainerService.ensureLoadedForOrg(this.nav.activeOrganisationId)

              // setTimeout(() => {
              //   if(this.media.smallDevice){
              //     this.tutorial.triggerTutorial('trainer/customers','onload_mobile')
              //   }
              //   else{
              //     this.tutorial.triggerTutorial('trainer/customers','onload')
              //   }
              // }, 1000);
            }
          })
        }
      })
      
      this.nav.organisationChange.pipe(takeUntil(this.leave$)).subscribe((res)=>{
        this.trainerService.ensureLoadedForOrg(this.nav.activeOrganisationId)
      })



      setTimeout(() => {
        // console.log('triggerTutorial')
        if(this.media.smallDevice){
          this.tutorial.triggerTutorial('trainer/dashboard','onload_mobile')
        }
        else{
          this.tutorial.triggerTutorial('trainer/dashboard','onload')
        }
      }, 1000);

      this.auth.isAdmin().pipe(takeUntil(this.leave$)).subscribe((isAdmin:boolean)=>{
        this.isAdmin = isAdmin;
      })
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
    }, 2000);
  }

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

  addCustomer(){
    let fields = this.customerFields();

    this.modalService.inputFields(this.translate.instant('customers.add_customer'),this.translate.instant('customers.add_customer_text'),fields,(result:any)=>{
      console.log('result',result)
      if(result?.data){
        let customer = {
          company:result.data[0].value,
          address:result.data[1].value,
          zip:result.data[2].value,
          city:result.data[3].value,
          country:result.data[4].value,
          phone:result.data[5].value,
          email:result.data[6].value,
          email_invoice:result.data[7].value,
          reference:result.data[8].value,
          tax_nr:result.data[9].value,
          created:moment().unix(),
          createdBy:this.auth.userInfo.uid,
          orgId:this.nav.activeOrganisationId,
        }

        this.toast.showLoader()
        this.firestore.createSub('trainers',this.nav.activeOrganisationId,'customers',customer,()=>{
          this.toast.show(this.translate.instant('customers.created_successfully'),3000,'bottom')
          this.toast.hideLoader()
        })
        
      }
    })
  }

  editCustomer(customer?:any,event?:Event){
    if(event){
      event.stopPropagation();
      event.preventDefault();
    }
    console.log('editCustomer',customer)
    let fields = this.customerFields(customer);

    this.modalService.inputFields(this.translate.instant('customers.add_customer'),this.translate.instant('customers.add_customer_text'),fields,(result:any)=>{
      console.log('result',result)
      if(result?.data){
        let updatedCustomer = {
          company:result.data[0].value,
          address:result.data[1].value,
          zip:result.data[2].value,
          city:result.data[3].value,
          country:result.data[4].value,
          phone:result.data[5].value,
          email:result.data[6].value,
          email_invoice:result.data[7].value,
          reference:result.data[8].value,
          tax_nr:result.data[9].value,
        }

        this.firestore.updateSub('trainers',this.nav.activeOrganisationId,'customers',customer.id,updatedCustomer).then(()=>{
          this.toast.show(this.translate.instant('customers.updated_successfully'),3000,'bottom')
        })
      }
    })
  }
  
  listUsers(customer:any,training:any){
    let users = []
    for(let u of customer.users){
      if(u.customerTrainingId==training.id){
        users.push(u)
      }
    }
    return users
  }


  ngOnDestroy(){
    this.leave$.next();
    this.leave$.complete();
  }

  addTraining(customer:any,training?:any){
      console.log(training)

    let trainings = this.trainerService.trainings.filter(t=>t.status!='closed');
    this.modalService.startSalesTraining({customer:customer,trainings:trainings,training:training,onlyUser: training ? true : false},(result:any)=>{
    
      if(!result || !result.data){
        return;
      }
      
      if(!result.data.users || !result.data.users.length){
        this.toast.show(this.translate.instant('customers.add_at_least_one_user'),4000,'middle')
        return;
      }

      let item:any = {
        onlyUsers: result.data.onlyUsers || false,
        users: result.data.users,
        trainerId: this.nav.activeOrganisationId,
        company: customer.company,
        company_email: customer.email,
        address:{
          line1: customer.address,
          postal_code: customer.zip,
          city: customer.city,
          country: customer.country,
        },
        price: result.data.prices,
        reference: customer.reference || '',
        products:[],
      }
      let product:any = {
        id: result.data.training.id,
      }
      item.products.push(product)

      console.log('item',item)
      this.toast.showLoader()
      this.functions.httpsCallable('sellElearningWithInvoice')(item).pipe(take(1)).subscribe({
        next: (res:any) => {
          console.log('res',res)
          if(res?.status!='200'){
            this.toast.hideLoader()
            this.toast.show(this.translate.instant('error_messages.failure'),4000,'middle')
          }
          else {
            if(!training){
              this.firestore.createSubSub('trainers',this.nav.activeOrganisationId,'customers',customer.id,'trainings',{
                trainingId: result.data.training.id,
                trainingTitle: result.data.training.title,
                price: result.data.prices,
                soldBy: this.auth.userInfo.uid,
                timestamp: moment().unix(),
                expires: moment().add(1,'year').unix(),
              },(response:any)=>{
                for(let u of result.data.users){
                  this.firestore.createSubSub('trainers',this.nav.activeOrganisationId,'customers',customer.id,'users',{
                    email: u.email,
                    displayName: u.displayName || '',
                    trainingId: result.data.training.id,
                    trainingTitle: result.data.training.title,
                    timestamp: moment().unix(),
                    soldBy: this.auth.userInfo.uid,
                    customerTrainingId: response.id,
                  })
                }
              })
            }
            else{
              for(let u of result.data.users){
                this.firestore.createSubSub('trainers',this.nav.activeOrganisationId,'customers',customer.id,'users',{
                  email: u.email,
                  displayName: u.displayName || '',
                  trainingId: result.data.training.id,
                  trainingTitle: result.data.training.title,
                  timestamp: moment().unix(),
                  soldBy: this.auth.userInfo.uid,
                  customerTrainingId: training.id,
                })
              }
            }
            this.toast.hideLoader()
            this.toast.show(this.translate.instant('customers.training_and_invoice_sent'),4000,'middle')
          }
        }
      })
    })


  }
}
