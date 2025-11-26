import { Component, Input, OnInit } from '@angular/core';
import { ModalController, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { IconsService } from 'src/app/services/icons.service';
import { MenuPage } from '../../menu/menu.page';
import { SelectMenuService } from 'src/app/services/select-menu.service';
import { ToastService } from 'src/app/services/toast.service';
import { NavService } from 'src/app/services/nav.service';
import { SalesService } from 'src/app/services/sales.service';
import { InputFieldsPage } from '../input-fields/input-fields.page';
import { TrainerService } from 'src/app/services/trainer.service';

@Component({
  selector: 'app-sales-trainings',
  templateUrl: './sales-trainings.page.html',
  styleUrls: ['./sales-trainings.page.scss'],
})
export class SalesTrainingsPage implements OnInit {

  @Input() input: any;
  
  visualStep = 1;

  step = 1;
  free:boolean = false;
  customer: any = null;
  trainings: any[] = [];
  selectedTraining: any = null;
  users: { email: string; displayName?: string, lang:string }[] = [];
  basePrice:number | null = 0.00;
  basePriceIncl:number | null = 0.00;

  basePriceUser:number | null = 0.00;
  basePriceUserIncl:number | null = 0.00;

  creditsOptions: any[] = [
    { label: 'unlimited', value: 1000000, price: 20.66, title: this.translate.instant('customers.credits_unlimited') },
    { label: '4000', value: 4000, price: 9.92, title: this.translate.instant('customers.credits_4000') },
    // { label: '0', value: 0, price: 0, title: this.translate.instant('customers.credits_0') },
  ];

  selectedCredits: any = this.creditsOptions[0];
  creditPricePerUser = this.creditsOptions[0].price; // 25 incl. 21% btw
  totalPriceExcl = 0;
  totalPriceIncl = 0;
  totalVAT = 0;
  vh:number = 0;
  validationError = '';
  onlyUser = false;
  onlyTraining = false;
  hideBasePrice = false;
  hideBasePriceIncl = false;
  searchTermCustomer = '';
  searchTermTraining = '';
  onlyUserAmount: boolean = false;
  maxCustomers: number = 0;
  allowedDomains: string = '';
  variable_amount: boolean = false;

  steps:any[] = [
    { title: this.translate.instant('customers.step_select_customer') },
    { title: this.translate.instant('customers.step_select_training') },
    { title: this.translate.instant('customers.step_add_users') },
    { title: this.translate.instant('customers.step_price') },
    { title: this.translate.instant('customers.step_confirm_and_send_invoice') },
  ]


  constructor(
    private modalCtrl: ModalController,
    public icon: IconsService,
    public translate:TranslateService,
    private popoverController:PopoverController,
    public selectMenuservice:SelectMenuService,
    private toast:ToastService,
    private nav:NavService,
    private sales:SalesService,
    public trainerService:TrainerService,

  ) {}

  ngOnInit() {
    if (this.input) {
      console.log('input trainings',this.input)
      this.customer = this.input.customer || null;
      if(this.customer && this.customer.id){
        this.step = 2;
      }
      else{
        this.onlyTraining = true;
      }
      if(this.input.onlyUserAmount){
        this.onlyUserAmount = true;
      }
      if(this.input.variable_amount){
        this.variable_amount = true;
      }
      if(this.input.free){
        this.free = true;
      }
      this.trainings = this.input.trainings || [];
      if(this.input.training){
        this.selectedTraining = this.trainings.find(t=>t.id==this.input.training.trainingId || t.id==this.input.training.id) || null;
        this.basePrice = this.input.training.price.trainingPrice || 0.00;
        this.updatePrice('basePrice');
        if((!this.onlyTraining && this.customer) || (this.free && this.customer)){
          this.step = 3;
        }
        this.selectedTraining.customerTrainingId = this.input.training.id;
      }
      this.onlyUser = this.input.onlyUser || false;
      this.users = [{ email: '', displayName: '', lang:this.translate.currentLang }];
      // this.users = [ { email:'test89@innovatieman.nl',displayName:'Test 89', lang:this.translate.currentLang } ];
    }
  }

  ngAfterViewInit(){
    this.vh = window.innerHeight * 0.01;
  }

  nextStep() {

    if(this.step === 1) {
      if (!this.customer) {
        this.toast.show(this.translate.instant('customers.select_customer'));
        return;
      }
      if(this.onlyTraining){
        this.visualStep = 2;
        this.step = 3;
        this.validationError = '';
        return;
      }
      this.validationError = '';
    }

    if(this.step === 2) {
      if (!this.selectedTraining) {
        this.toast.show(this.translate.instant('customers.select_training'));
        return;
      }
      this.validationError = '';
      
    }

    if (this.step === 3 && !this.onlyUserAmount && !this.variable_amount) {
      if(!this.users?.length){
        this.validationError = this.translate.instant('customers.add_user_message');
        return;
      }

      if (!this.isValidUserList()) {
        this.validationError = this.translate.instant('customers.invalid_user_list');
        return;
      }
      this.validationError = '';
    }
    else if (this.step === 3 && this.onlyUserAmount) {
      if(isNaN(this.maxCustomers) || this.maxCustomers<1){
        this.validationError = this.translate.instant('customers.add_user_message');
        return;
      }
      this.validationError = '';
    }

    else if (this.step === 3 && this.variable_amount) {
      if(isNaN(this.maxCustomers) || this.maxCustomers<0){
        this.maxCustomers = 0;
      }
      this.validationError = '';
    }

    if (this.step === 3 && this.free) {
      // this.step++;
      // this.calculatePrice();
    }

    this.step++;
    this.visualStep++;
  }

  prevStep() {
    if(this.step == 3 &&this.onlyTraining){
      this.visualStep = 1;
      this.step = 1;
      return;
    }
    this.step--;
    this.visualStep--;
    if(this.step<1){
      this.step = 1;
      this.visualStep = 1;
    }
    if(this.step==5 && this.free){
      this.step = 3;
      this.visualStep = 3;
    }
  }

  close() {
    this.modalCtrl.dismiss();
  }

  addUser() {
    this.users.push({ email: '', displayName: '', lang: '' });
    if(this.users.length>1){
      this.users[this.users.length-1].lang = this.users[this.users.length-2].lang;
    }
  }

  removeUser(index: number) {
    this.users.splice(index, 1);
  }

  isValidUserList(): boolean {
    if (!this.users || this.users.length === 0) {
      return false;
    }

    
    for(const user of this.users) {
      if((!user.email || user.email.trim() === '') && (!user.displayName || user.displayName.trim() === '')) {
        this.users = this.users.filter(u => u !== user);
      }
    }
    
    if(this.users.length === 0) {
      this.users = [{ email: '', displayName: '', lang:this.translate.currentLang }];
      return false;
    }

    // Check of minstens één gebruiker een geldig e-mailadres heeft
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let invalidEmails = this.users.filter(user => !emailRegex.test(user.email || ''));
    if (invalidEmails.length > 0) {
      return false;
    }

    return this.users.some(user => emailRegex.test(user.email || ''));
  }

  prices() {
    if (!this.selectedTraining) return {}
    let prices:any = {};
    prices.users = this.users.length;
    if(this.onlyUserAmount){
      prices.users = this.maxCustomers || 0;
    }

    prices.basicTrainerCosts = 0;
    if(!this.trainerService.isTrainerPro){
      prices.basicTrainerCosts = 100; // vaste kosten voor basic trainers
    }

    prices.trainingPrice = this.basePrice || 0;
    prices.trainingPriceVat = prices.trainingPrice * 0.21;
    prices.trainingPriceIncl = prices.trainingPrice + prices.trainingPriceVat;
    prices.creditCosts = prices.users * this.creditPricePerUser;

    prices.pricePerUserExcl = 0;
    prices.pricePerUserIncl = 0;
    prices.totalPricePerUserExcl = 0;
    prices.totalPricePerUserIncl = 0;

    if(this.variable_amount && this.basePriceUser){
      prices.pricePerUserExcl = this.basePriceUser || 0;
      prices.pricePerUserIncl = this.basePriceUserIncl || 0;
      prices.totalPricePerUserExcl = prices.pricePerUserExcl + this.creditPricePerUser;
      prices.totalPricePerUserVat = prices.totalPricePerUserExcl * 0.21;
      prices.totalPricePerUserIncl = prices.totalPricePerUserExcl + prices.totalPricePerUserVat;

      prices.marginAliciaLabs = prices.trainingPrice * 0.05; // 5% marge op training
      prices.marginAliciaLabsUser = prices.pricePerUserExcl * 0.05; // 5% marge op training
      prices.marginTrainer = prices.trainingPrice - prices.marginAliciaLabs; 
      prices.marginTrainerUser = prices.pricePerUserExcl - prices.marginAliciaLabsUser;

    }

    else{
      prices.totalPriceExcl = prices.trainingPrice + prices.creditCosts;

      if(prices.basicTrainerCosts){
        prices.totalPriceExcl += prices.basicTrainerCosts;
      }

      prices.totalVAT = prices.totalPriceExcl * 0.21;
      prices.totalPriceIncl = prices.totalPriceExcl + prices.totalVAT;
  
      prices.marginAliciaLabs = prices.trainingPrice * 0.05; // 5% marge op training
      prices.marginTrainer = prices.trainingPrice - prices.marginAliciaLabs;
  
      prices.pricePerUserExcl = this.basePriceUser || 0;
      prices.pricePerUserIncl = this.basePriceUserIncl || 0;
  
      prices.totalPricePerUserExcl = this.creditPricePerUser + prices.pricePerUserExcl;
      prices.totalPricePerUserIncl = this.creditPricePerUser + prices.pricePerUserIncl;

    }



    return prices;
  }
  updatePrice(input:string){
    if(input==='basePriceIncl'){
      if(this.basePriceIncl && this.basePriceIncl>0){
        this.basePrice = Math.round((this.basePriceIncl / 1.21)*100) / 100;
      } else {
        this.basePrice = 0.00;
      }
    }
    if(input==='basePrice'){
      if(this.basePrice && this.basePrice>0){
        this.basePriceIncl = Math.round((this.basePrice * 1.21)*100) / 100;
      } else {
        this.basePriceIncl = 0.00;
      }
    }
    if(input==='basePriceUserIncl'){
      if(this.basePriceUserIncl && this.basePriceUserIncl>0){
        this.basePriceUser = Math.round((this.basePriceUserIncl / 1.21)*100) / 100;
      } else {
        this.basePriceUser = 0.00;
      }
    }
    if(input==='basePriceUser'){
      if(this.basePriceUser && this.basePriceUser>0){
        this.basePriceUserIncl = Math.round((this.basePriceUser * 1.21)*100) / 100;
      } else {
        this.basePriceUserIncl = 0.00;
      }
    }
  }

  confirm() {
    let defCostumer = JSON.parse(JSON.stringify(this.customer));
    delete defCostumer.trainings;
    delete defCostumer.users;
    this.modalCtrl.dismiss({
      customer: defCostumer,
      training: this.selectedTraining,
      users: this.users,
      prices: this.prices(),
      onlyUser: this.onlyUser,
      maxCustomers: this.maxCustomers,
      allowedDomains: this.allowedDomains,
      credits: this.selectedCredits.value,
    });
  }

  changeTaxInput(event?:any){
    if(event){
      event.stopPropagation();
    }
    let list = [
      { title: this.translate.instant('customers.price_excl_tax'), value: 'excl' },
      { title: this.translate.instant('customers.price_incl_tax'), value: 'incl' },
    ];
    this.showshortMenu(event,list,(data:any)=>{
      if(data?.value){
        this.taxInput = data.value;
      }
    });

  }

  taxInput:string = 'excl';
  shortMenu:any;
  async showshortMenu(event:any,list:any[],callback:Function){
    this.selectMenuservice.selectedItem = undefined;
    this.shortMenu = await this.popoverController.create({
      component: MenuPage,
      componentProps:{
        pages:list,
        listShape:true,
        customMenu:true,
      },
      cssClass: 'shortMenu',
      event: event,
      translucent: false,
      reference:'trigger',
    });
    this.shortMenu.shadowRoot.lastChild.lastChild['style'].cssText = 'border-radius: 24px !important;';
    await this.shortMenu.present();
    await this.shortMenu.onDidDismiss()
    callback(this.selectMenuservice.selectedItem)
    this.selectMenuservice.selectedItem = undefined;
  }

  async selectLang(user:any){
    let list:any[] = []
    this.nav.langList.forEach((lang)=>{
      list.push({
        value:lang,
        title:this.translate.instant('languages.'+lang),
        icon:'faGlobeEurope'
      })
    })
    await this.showshortMenu(event,list,((response:any)=>{
      if(response.value){
        user.lang = response.value;
        // this.nav.setLang(response.value)
        this.selectMenuservice.selectedItem = undefined
        // location.reload()
      }
    }))
   
  }

  editCustomer(customer?:any,event?:Event){
    if(event){
      event.stopPropagation();
      event.preventDefault();
    }
    if(!customer){
      this.customer = null;
    }
    // console.log('editCustomer',customer)
    let fields = this.sales.customerFields(customer);

    this.inputFields(this.translate.instant('customers.add_customer'),this.translate.instant('customers.add_customer_text'),fields,(result:any)=>{
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

        if(!customer){
          this.customer = updatedCustomer;
        }
        else{
          customer.company = updatedCustomer.company;
          customer.address = updatedCustomer.address;
          customer.zip = updatedCustomer.zip;
          customer.city = updatedCustomer.city;
          customer.country = updatedCustomer.country;
          customer.phone = updatedCustomer.phone;
          customer.email = updatedCustomer.email;
          customer.email_invoice = updatedCustomer.email_invoice;
          customer.reference = updatedCustomer.reference;
          customer.tax_nr = updatedCustomer.tax_nr;
        }
      }
    })
    
  }

  async inputFields(title:string,text:string,fields:any[],callback:Function,extraData?:any){
      let cssClass = 'inputFieldsModal';
      for(let i=0;i<fields.length;i++){
        if(fields[i].type=='html'){
          cssClass = 'editHtmlModal';
          break;
        }
      }
      const modalItem = await this.modalCtrl.create({
        component:InputFieldsPage,
        componentProps:{
          text:text,
          fields:fields,
          title:title,
          extraData:extraData
        },
        cssClass:'infoModal',
      })
      modalItem.onWillDismiss().then(result=>{
        callback(result)
      })
      return await modalItem.present()
    }


    changeCredits(event?:any){
      if(event){
        event.stopPropagation();
      }
      let list = this.creditsOptions.map(option=>({
        title: option.title + ' (€ '+(option.price.toFixed(2).replace('.',','))+')',
        value: option.value,
        price: option.price,
        label: option.label,
        description: this.translate.instant('customers.credits_explanation_'+option.label),
      }));
      this.showshortMenu(event,list,(data:any)=>{
        if(data?.value!=undefined && data.value){
          this.selectedCredits = data;
          this.creditPricePerUser = data.price;
        }
      });

    }
}