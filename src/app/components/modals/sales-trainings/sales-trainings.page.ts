import { Component, Input, OnInit } from '@angular/core';
import { ModalController, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { IconsService } from 'src/app/services/icons.service';
import { MenuPage } from '../../menu/menu.page';
import { SelectMenuService } from 'src/app/services/select-menu.service';
import { ToastService } from 'src/app/services/toast.service';
import { NavService } from 'src/app/services/nav.service';

@Component({
  selector: 'app-sales-trainings',
  templateUrl: './sales-trainings.page.html',
  styleUrls: ['./sales-trainings.page.scss'],
})
export class SalesTrainingsPage implements OnInit {

  @Input() input: any;
  
  step = 1;
  customer: any = null;
  trainings: any[] = [];
  selectedTraining: any = null;
  users: { email: string; displayName?: string, lang:string }[] = [];
  basePrice:number | null = 0.00;
  basePriceIncl:number | null = 0.00;
  creditPricePerUser = 25 / 1.21; // 25 incl. 21% btw
  totalPriceExcl = 0;
  totalPriceIncl = 0;
  totalVAT = 0;
  vh:number = 0;
  validationError = '';
  onlyUser = false;
  hideBasePrice = false;
  hideBasePriceIncl = false;

  steps:any[] = [
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
    private nav:NavService
  ) {}

  ngOnInit() {
    if (this.input) {
      this.customer = this.input.customer || null;
      console.log('customer',this.customer)
      this.trainings = this.input.trainings || [];
      if(this.input.training){
        this.selectedTraining = this.trainings.find(t=>t.id==this.input.training.trainingId) || null;
        this.basePrice = this.input.training.price.trainingPrice || 0.00;
        this.updatePrice('basePrice');
        this.step = 2;
        this.selectedTraining.customerTrainingId = this.input.training.id;
      }
      this.onlyUser = this.input.onlyUser || false;
      // this.users = [{ email: '', displayName: '', lang:this.translate.currentLang }];
      this.users = [ { email:'test89@innovatieman.nl',displayName:'Test 89', lang:this.translate.currentLang } ];
    }
  }

  ngAfterViewInit(){
    this.vh = window.innerHeight * 0.01;
  }

  nextStep() {
    if(this.step === 1) {
      if (!this.selectedTraining) {
        this.toast.show(this.translate.instant('customers.select_training'));
        return;
      }
      this.validationError = '';
    }

    if (this.step === 2) {
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

    if (this.step === 3) {
      // this.calculatePrice();
    }

    this.step++;
  }

  prevStep() {
    this.step--;
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

    // Check of minstens één gebruiker een geldig e-mailadres heeft
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for(const user of this.users) {
      if((!user.email || user.email.trim() === '') && (!user.displayName || user.displayName.trim() === '')) {
        this.users = this.users.filter(u => u !== user);
      }
    }

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
    prices.trainingPrice = this.basePrice || 0;
    prices.creditCosts = prices.users * this.creditPricePerUser;

    prices.totalPriceExcl = prices.trainingPrice + prices.creditCosts;
    prices.totalVAT = prices.totalPriceExcl * 0.21;
    prices.totalPriceIncl = prices.totalPriceExcl + prices.totalVAT;

    prices.marginAliciaLabs = prices.trainingPrice * 0.05; // 5% marge op training

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
  }

  confirm() {
    this.modalCtrl.dismiss({
      customer: this.customer,
      training: this.selectedTraining,
      users: this.users,
      prices: this.prices(),
      onlyUser: this.onlyUser
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
      console.log('data',data)
      if(data?.value){
        this.taxInput = data.value;
      }
    });

  }

  taxInput:string = 'excl';
  shortMenu:any;
  async showshortMenu(event:any,list:any[],callback:Function){
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


}