import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter, max, Subject, take, takeUntil } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { MaxLengthPipe } from 'src/app/pipes/max-length.pipe';
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

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  @ViewChild('file') file!: ElementRef;
  @ViewChild('fileBook') fileBook!: ElementRef;

  showPart:string = 'settings'
  products: any;
  products_unlimited: any;
  customers: any;
  subscriptionsStripe: any;
  showImportOption:boolean = false;
  searchingAdmin:boolean = false;
  newAdmin:any = null;
  errorAdmin:boolean = false;
  adminExists:boolean = false;
  showAddAdmin:boolean = false;
  newAdminEmail:string = '';
  isAdmin:boolean = false;
  segmentsLoaded:boolean = false;
  isTrainer:boolean = false;
  isTrainerPro:boolean = false;
  originalBankAccount:any = {}
  originalInvoice:any = {}
  showCustomerList:boolean = false;
  trainerDataLoaded:boolean = false;
  private leave$ = new Subject<void>();
  [x:string]: any;
  showHtml:boolean = false

  configModules={
    toolbar: {
      container:[
        ['bold', 'italic', 'underline'],
        [{ 'color': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        [{ 'align': [] }],
        [{'indent': '-1'}, {'indent': '+1'}],
        ['link'],
        ['clean'],
        ['HTML'],
      ],
      clipboard: {
        matchVisual: false
      }
    }
  }
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

  showEditor(){
    this.showHtml = false
    setTimeout(() => {
      let elements = document.getElementsByClassName("ql-container")
      for(let i=0;i<elements.length;i++){
        elements[i].setAttribute('style','height:calc(100% - 40px);border:0;')
      }
      elements = document.getElementsByClassName("ql-toolbar")
      for(let i=0;i<elements.length;i++){
        elements[i].setAttribute('style','border:0;')
      }
      setTimeout(() => {

        let htmlButtons = document.getElementsByClassName("ql-HTML")
        for(let i=0;i<htmlButtons.length;i++){
          htmlButtons[i].innerHTML = 'HTML'
          htmlButtons[i].setAttribute('innerHTML', 'HTML')
          htmlButtons[i].setAttribute('style','width:50px;')
          htmlButtons[i].addEventListener('click', (event:any)=> {
            if(event.target?.parentElement?.parentElement?.parentElement?.id){
              let field = event.target.parentElement.parentElement.parentElement.id.replace('quill_','')
              if(this.trainerService.trainerInfo[field]!=undefined){
                this.trainerService.trainerInfo[field] = this.cleanHtml(this.trainerService.trainerInfo[field])
              }
            }
            this.showHtml = true
          });
        }

        // let htmlBtn:any = document.querySelector('.ql-HTML');
        // htmlBtn.innerHTML = 'HTML'
        // htmlBtn.style.width = '50px'
        // htmlBtn.addEventListener('click', (event:any)=> {
        //   if(event.target?.parentElement?.parentElement?.parentElement?.id){
        //     let field = event.target.parentElement.parentElement.parentElement.id.replace('quill_','')
        //     if(this.trainerService.trainerInfo[field]!=undefined){
        //       this.trainerService.trainerInfo[field] = this.cleanHtml(this.trainerService.trainerInfo[field])
        //     }
        //   }
        //   this.showHtml = true 
        // });
      },300)
    },100)
  }
  
  cleanHtml(html:string){
    return html
    .split('</ol><p><br></p><p>').join('</ol>')
        .split('</p><p><br></p><ol>').join('<ol>')
        .split('</ul><p><br></p><p>').join('</ul>')
        .split('</p><p><br></p><ul>').join('<ul>')
        .split('<p><br></p>').join('<br>')
        .split('</p><br><p>').join('<br><br>')
        .split('</p><p>').join('<br>')
        .split('&nbsp;').join(' ')
  }


  ionViewWillLeave() {
    this.leave$.next();
    this.leave$.complete();
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
          this.nav.go('trainer/dashboard/')
        }
        // console.log('showPart',this.showPart)
        this.trainerService.trainerInfoLoaded$.pipe(filter(loaded => loaded === true))
        .subscribe(() => {
            if(!this.trainerService.trainerInfo.bank_account){
              this.trainerService.trainerInfo.bank_account = {
                iban: '',
                bic: '',
                name: ''
              }
              this.update('bank_account')
            }
            if(!this.trainerService.trainerInfo.invoice){
              this.trainerService.trainerInfo.invoice = {
                name: '',
                vat_number: '',
                address: '',
                zip: '',
                city: '',
                country: '',
                email: '',
                reference: '',
              }
              this.update('invoice')
            }
            this.originalBankAccount = JSON.parse(JSON.stringify(this.trainerService.trainerInfo.bank_account))
            this.originalInvoice = JSON.parse(JSON.stringify(this.trainerService.trainerInfo.invoice))
            this.trainerDataLoaded = true;
          
        })
      })


      this.auth.userInfo$.pipe(takeUntil(this.leave$)).subscribe(userInfo => {
        if (userInfo) {
          this.auth.hasActive('trainer').pipe(takeUntil(this.leave$)).subscribe((trainer)=>{
            if(trainer){

              this.trainerService.ensureLoadedForOrg(this.nav.activeOrganisationId)

              setTimeout(() => {
                // console.log('triggerTutorial')
                if(this.media.smallDevice){
                  this.tutorial.triggerTutorial('trainer/dashboard','onload_mobile')
                }
                else{
                  this.tutorial.triggerTutorial('trainer/dashboard','onload')
                }
              }, 1000);
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

  update(field:string,required?:boolean,html?:boolean){
    if(!this.trainerService.trainerInfo[field]&&required){
      return
    }
    if(html){
      this.trainerService.trainerInfo[field] = this.trainerService.trainerInfo[field]
      .split('</ol><p><br></p><p>').join('</ol>')
          .split('</p><p><br></p><ol>').join('<ol>')
          .split('</ul><p><br></p><p>').join('</ul>')
          .split('</p><p><br></p><ul>').join('<ul>')
          .split('<p><br></p>').join('<br>')
          .split('</p><br><p>').join('<br><br>')
          .split('</p><p>').join('<br>')
          .split('&nbsp;').join(' ')
    }
    this.firestore.update('trainers',this.nav.activeOrganisationId,{[field]:this.trainerService.trainerInfo[field]})
  }

  showTrainerInfo(trainerInfo:any, event:any){
    if(event){
      event.stopPropagation();
      event.preventDefault();
    }
    if(!trainerInfo || !trainerInfo){
      return;
    }

    this.modalService.showTrainerInfo(trainerInfo, (response:any)=>{})
  }
  
  request_amount_employees(type:string){

    this.modalService.inputFields(this.translate.instant('dashboard.request_title'),this.translate.instant('dashboard.request_amount_'+type+'_text'), [
      {
        type: 'textarea',
        title: '',
        text:'',
        value:'',
        required: true,
      }], (result: any) => {
        console.log('request_amount_employees',result)
        if(result?.data){
          this.functions.httpsCallable('requestFromTrainerAdmin')({
            trainerId: this.nav.activeOrganisationId,
            request: result.data[0].value
          }).pipe(takeUntil(this.leave$)).subscribe((response:any)=>{
            console.log('requestFromTrainerAdmin response',response)
            if(response?.status==200){
              this.toast.show(this.translate.instant('dashboard.request_send_success'),4000,'middle')
            }
            else {
              this.toast.show(this.translate.instant('error_messages.failure'),4000,'middle')
            }
          })
        }
      })
  }


  async selectLogo(event:Event){
    if(!this.trainerService.checkIsTrainerPro()){
      return
    }
    this.media.selectAvatar(event,(res:any)=>{
      console.log(res)
      if(res?.status==200&&res?.result.url){
        this.trainerService.trainerInfo.logo = res.result.url
        this.functions.httpsCallable('uploadLogo')({trainerId:this.nav.activeOrganisationId,logo:this.trainerService.trainerInfo.logo}).pipe(takeUntil(this.leave$)).subscribe((response:any)=>{})
      }
      else if(res=='delete'){
        this.trainerService.trainerInfo.logo = ''
        this.functions.httpsCallable('uploadLogo')({trainerId:this.nav.activeOrganisationId,logo:this.trainerService.trainerInfo.logo}).pipe(takeUntil(this.leave$)).subscribe((response:any)=>{})
      }

    },false,true)
  }


  addEmployee(){
    if(this.trainerService.trainerInfo.employees.length >= this.maximumEmployees){
      this.toast.show(this.translate.instant('dashboard.max_employees_reached'),4000,'middle')
      return
    }
    this.modalService.inputFields('Nieuwe deelnemer', 'Voeg een deelnemer toe', [
      {
        type: 'text',
        title: 'Naam',
        name: 'Name',
        value: '',
        required: true,
      },
      {
        type: 'email',
        title: 'Email',
        name: 'email',
        value: '',
        pattern:'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-z]{2,15}$',
        required: true,
      }
    ], (result: any) => {
      if (result.data) {
        let employee = {
          displayName: this.helper.capitalizeNames(result.data[0].value,true),
          email: result.data[1].value.toLowerCase(),
          created: Date.now(),
          status: 'active',
        }
        this.toast.showLoader()
        this.firestore.createSub('trainers', this.nav.activeOrganisationId, 'employees', employee).then(() => {
          this.trainerService.loadTrainerInfo(()=>{
             this.toast.hideLoader()
            //  console.log('Employee added:', employee);
          },true)
          // this.trainerService.loadTrainingsAndParticipants(() => {
          //   this.trainerService.trainingItem = this.trainerService.getTraining(this.trainerService.trainingItem.id)
          // })
        })
      }
    })
        
  }


  deleteEmployee(employee:any){
    this.modalService.showConfirmation(this.translate.instant('confirmation_questions.delete')).then(async (result:any) => {
      if(result){
        this.toast.showLoader()
        this.firestore.deleteSub('trainers',this.nav.activeOrganisationId,'employees',employee.id).then(()=>{
          console.log('Employee deleted:', employee);
          this.trainerService.loadTrainerInfo(()=>{
            this.toast.hideLoader()
          },true)
          // this.trainerService.loadTrainingsAndParticipants(()=>{
          //   this.trainerService.trainingItem = this.trainerService.getTraining(this.trainerService.trainingItem.id)
          // })
        })
      }
    })
  }

  setPageParam(){
    let param = 'trainer/dashboard'
     if(this.showPart){
      param = param + '/' + this.showPart
    }
    return param
  }

  setOptionsParam(){
    let param = ''
    param = 'trainer/dashboard'
    return param
  }

  reloadMenu(){
    setTimeout(() => {
      this.nav.reloadMenu.emit(true)
    }, 10);
  }

  setShowPart(part:string){
    if(this.showPart != part){
      this.showPart = part
    }
  }

  useAction(action:string){
    console.log('useAction',action)
    if(action.includes('.')){
      let parts = action.split('.');
      if(action.includes('(')){
        let params:any = action.substring(action.indexOf('(') + 1, action.indexOf(')'));
        console.log('params',params)
        if(params && params.includes(':')){
          params = params.split(':')
          params = this[params[0]][params[1]]
        }
        console.log('params',params)
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

  
  addAdmin(newAdmin:any){
    this.toast.showLoader()
    console.log('addAdmin',newAdmin)
    this.functions.httpsCallable('addNewAdmin')({trainerId:this.nav.activeOrganisationId,email:newAdmin.email,uid:'n/a'}).pipe(takeUntil(this.leave$)).subscribe((response:any)=>{
      console.log('addhNewAdmin response',response)
      this.searchingAdmin = false;
      this.errorAdmin = false;
      if(response?.status==200){
        this.trainerService.loadTrainerInfo(()=>{
          this.newAdminEmail = '';
          this.showAddAdmin = false;
          this.newAdmin = response.result;
          this.toast.hideLoader()
        },true)
      }
      else {
        this.errorAdmin = true;
        this.toast.show(this.translate.instant('error_messages.failure'),4000,'middle')
        this.toast.hideLoader()
      }
    })
  }

  deleteAdmin(admin:any){
    this.modalService.showConfirmation(this.translate.instant('confirmation_questions.delete')).then(async (result:any) => {
      if(result){
        this.toast.showLoader()
        this.functions.httpsCallable('deleteAdmin')({trainerId:this.nav.activeOrganisationId,uid:admin.uid}).pipe(takeUntil(this.leave$)).subscribe((response:any)=>{
          console.log('deleteAdmin response',response)
          
          if(response?.status==200){
            this.trainerService.loadTrainerInfo(()=>{
              this.toast.hideLoader()
              // this.toast.show(this.translate.instant('dashboard.admin_deleted'),4000,'middle')
            },true)
          }
          else{
            this.toast.hideLoader()
            this.toast.show(this.translate.instant('error_messages.failure'),4000,'middle')
          }
        })
      }
    })
  }

  toggleAddAdmin(){
    if(!this.trainerService.checkIsTrainerPro() && !this.trainerService.trainerInfo.organisation){
        return
    }
    if(!this.trainerService.trainerInfo.organisation && this.trainerService.trainerInfo.admins?.length>=this.maximumAdmins()){
      this.toast.show(this.translate.instant('dashboard.max_admins_reached'),4000,'middle')
      return
    }
    else if(!this.trainerService.trainerInfo.organisation){
      this.showAddAdmin = !this.showAddAdmin;
    }
    else{
      let list:any[] = []
      let listAdmins:any[] = []
      for(let i=0;i<this.trainerService.trainerInfo.adminsList.length;i++){
        listAdmins.push(this.trainerService.trainerInfo.adminsList[i].email)
      }
      console.log('listAdmins',listAdmins)
      for(let i=0;i<this.trainerService.trainerInfo.employees.length;i++){
        if(!listAdmins.includes(this.trainerService.trainerInfo.employees[i].email)){
          list.push({
            ...this.trainerService.trainerInfo.employees[i],
            title:this.trainerService.trainerInfo.employees[i].displayName,
            value:this.trainerService.trainerInfo.employees[i],
          })
        }
      }
      if(list.length==0){
        this.toast.show(this.translate.instant('dashboard.add_admin_employee_required'),4000,'middle')
        return
      }
      this.modalService.selectItem('',list,(result:any)=>{
        console.log('selectItem result',result.data)
        if(result?.data){
          this.addAdmin(result.data);
        }
      },false,this.translate.instant('dashboard.add_admin'),{multiple:true})
    }
  }
  
  searchAdmin(){
    if(!this.trainerService.checkIsTrainerPro()){
        return
    }
    if(!this.trainerService.trainerInfo.trainer){
      let checkEmployee = this.trainerService.trainerInfo.employees.find((employee:any)=>employee.email==this.newAdminEmail);
      if(!checkEmployee){
        this.toast.show(this.translate.instant('dashboard.add_admin_employee_required'),4000,'middle')
        return
      }
    }
    if(!this.trainerService.trainerInfo.organisation && this.trainerService.trainerInfo.admins>=2){

    }
    this.newAdmin = null;
    this.errorAdmin = false;
    this.searchingAdmin = true;
    this.functions.httpsCallable('searchNewAdmin')({trainerId:this.nav.activeOrganisationId,email:this.newAdminEmail}).pipe(takeUntil(this.leave$)).subscribe((response:any)=>{
      this.searchingAdmin = false;
      if(response?.status==200){

        if(this.trainerService.trainerInfo.admins.includes(response.result?.uid)){
          this.adminExists = true;
        }
        else{
          this.showAddAdmin = true;
          this.newAdmin = response.result;
        }
      }
      else {
        this.errorAdmin = true;
      }
    })
  }

  invalidEmail(email:string){
    if(!email || email.length<3){
      return true
    }
    let pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,15}$/;
    return !pattern.test(email);
  }

  get maximumEmployees(){
    if(!this.trainerService.trainerInfo?.organisation){
      return 0;
    }
    let maxEmployees = 0
    for(let i=0;i<this.trainerService.trainerInfo.settings.length;i++){
      if(this.trainerService.trainerInfo.settings[i].id=='organisation'){
        maxEmployees = this.trainerService.trainerInfo.settings[i].max_employees || 0;
        break;
      }
    }
    return maxEmployees;
  }

  maximumAdmins(onlyTrainer?:boolean):number{
    if(this.trainerService.trainerInfo?.organisation && !onlyTrainer){
      return this.maximumEmployees + this.maximumAdmins(true);
    }
    let maxAdmins = 0
    for(let i=0;i<this.trainerService.trainerInfo.settings.length;i++){
      if(this.trainerService.trainerInfo.settings[i].id=='trainer'){
        maxAdmins = this.trainerService.trainerInfo.settings[i].max_admins || 0;
        break;
      }
    }
    return maxAdmins;
  }

  downloadTemplate(){
      window.open('assets/template_import_employees.csv','_blank')
  }

  uploadClick(type?:string){
      this.file.nativeElement.click()
  }

  
  upload($event:any,type?:any) {
    if($event?.target?.files[0]){
      this.readFile($event.target.files[0],type)
    }

  } 

  readFile(file: File,type:any) {
    var reader = new FileReader();
    reader.onload = () => {
        ////console.log(reader.result);
        this.file2Data(reader.result,type)
    };
    reader.readAsText(file);
  }

  clearImportData(){
    this.importedData = []
  }

  importedData:any = []
  totalImports:number = 0
  countingImports:number = 0

  file2Data(fileData:any,type:any){

    this.importedData = []
    let arr = fileData.split(String.fromCharCode(10))
    let arrRow
    for(let i=1;i<arr.length;i++){
      arr[i] = arr[i].split('\r').join('')
      arrRow = arr[i].split(";")
      if(!arrRow[1]){
        arrRow = arr[i].split(",")
      }

      if(arrRow[0]&&arrRow[1]){
        this.importedData.push({
          displayName:this.helper.capitalizeNames(arrRow[0].trim()),
          email:arrRow[1].trim().toLowerCase(),
          admin:false
        })
      }
      else if(!arrRow[0]&&!arrRow[1]){

      }
      else{
        this.toast.show(this.translate.instant('error_messages.invalid_file'),4000,'middle')
        return
      }
    }
    let checkNewEmployees:any[] = []
    for(let i=0;i<this.importedData.length;i++){
      if(this.trainerService.trainerInfo.employees){
        for(let j=0;j<this.trainerService.trainerInfo.employees.length;j++){
          if(this.importedData[i].email==this.trainerService.trainerInfo.employees[j].email){
            this.importedData[i].exists = true
          }
          else{
            if(!checkNewEmployees.includes(this.importedData[i].email)){
              checkNewEmployees.push(this.importedData[i].email)
            }
          }
        }
      }
    }
    let checkErrorsEmails:any = []
    let reg = new RegExp("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-z]{2,15}$")
    for(let i=0;i<this.importedData.length;i++){
      if(!reg.test(this.importedData[i].email)){
        this.importedData[i].error = true
        this.importedData[i].emailError = true
        checkErrorsEmails.push(this.importedData[i].email)
      }
    }
    
    if(checkErrorsEmails.length>0){
      // let errors = checkErrorsEmails.join(', ')
      this.toast.show(this.translate.instant('trainings.error_import_emails'),10000,'middle')
      return
    }

    if(checkNewEmployees.length + this.trainerService.trainerInfo.employees.length > this.maximumEmployees){
      console.log('checkNewEmployees',checkNewEmployees.length, this.trainerService.trainerInfo.employees.length, this.maximumEmployees)
      this.toast.show(this.translate.instant('dashboard.max_employees_reached'),4000,'middle')
      return
    }

    let allEmails:any[] = []
    // let allItems:any[] = []
    this.totalImports = 0
    this.countingImports = 0
    const startLengthEmployees = this.trainerService.trainerInfo.employees ? this.trainerService.trainerInfo.employees.length : 0
    for(let i=0;i<this.importedData.length;i++){
      if(!this.importedData[i].exists){
        if(!allEmails.includes(this.importedData[i].email)){
          this.totalImports++
          this.firestore.createSub('trainers', this.nav.activeOrganisationId, 'employees',{
            email:this.importedData[i].email,
            displayName:this.importedData[i].displayName,
            status: 'active',
            created:Date.now(),
          },()=>{
            this.countingImports++
          })
          allEmails.push(this.importedData[i].email)
        }
      }
    }  
    let countChecking=0
    let checking = setInterval(() => {
      countChecking++
      if(this.countingImports == this.totalImports){
        clearInterval(checking)
        this.trainerService.loadTrainerInfo(() => {
          // this.trainerService.trainerInfo = this.trainerService.getTrainerInfo(this.trainerService.trainerInfo.id)
          // this.toast.show(this.translate.instant('trainings.import_participants')+this.countingImports,4000,'middle')
        })
      }
      else if(countChecking>50){
        clearInterval(checking)
        // this.toast.show(this.translate.instant('trainings.import_participants')+this.countingImports,4000,'middle')
      }
    },100)
    
    this.showImportOption = false
  }

  addKnowledgeItem(){
    if(!this.trainerService.checkIsTrainerPro()){
        return
    }
    this.modalService.inputFields(this.translate.instant('dashboard.add_knowledge_item'), this.translate.instant('dashboard.add_knowledge_item_instructions'), [
      {
        type: 'text',
        title: this.translate.instant('dashboard.knowledge_title'),
        name: 'title',
        value: '',
        required: true,
      },
      {
        type: 'text',
        title: this.translate.instant('dashboard.knowledge_original_language'),
        name: 'original_language',
        value: this.translate.instant('languages.'+this.translate.currentLang),
        required: true,
      },
      {
        type: 'html',
        title: this.translate.instant('dashboard.knowledge_description'),
        name: 'description',
        value: '',
        required: true,
        maxLength: 10000,
      }
    ], (result: any) => {
      if (result.data) {
        let item = {
          type: 'knowledge',
          title: result.data[0].value,
          original_language: result.data[1].value,
          description: result.data[2].value,
          language: this.translate.currentLang,
          created: Date.now(),
          updated: Date.now(),
          trainerId:this.nav.activeOrganisationId
        }
        this.firestore.createSub('trainers', this.nav.activeOrganisationId, 'knowledge', item).then(() => {
          this.trainerService.loadTrainerInfo(()=>{
            // console.log('Knowledge item added:', item);
          },true)
        })
      }
    })
  }

  editKnowledgeItem(item:any){
    if(!this.trainerService.checkIsTrainerPro()){
        return
    }
    this.modalService.inputFields(this.translate.instant('dashboard.edit_knowledge_item'), this.translate.instant('dashboard.add_knowledge_item_instructions'), [
      {
        type: 'text',
        title: this.translate.instant('dashboard.knowledge_title'),
        name: 'title',
        value: item.title,
        required: true,
      },
      {
        type: 'text',
        title: this.translate.instant('dashboard.knowledge_original_language'),
        name: 'original_language',
        value: item.original_language || this.translate.instant('languages.'+this.translate.currentLang),
        required: true,
      },
      {
        type: 'html',
        title: this.translate.instant('dashboard.knowledge_description'),
        name: 'description',
        value: item.description,
        required: true,
        maxLength: 10000,
      }
    ], (result: any) => {
      if (result.data) {
        item.title = result.data[0].value;
        item.original_language = result.data[1].value;
        item.description = result.data[2].value;
        item.language = this.translate.currentLang;
        item.updated = Date.now();
        this.firestore.updateSub('trainers', this.nav.activeOrganisationId, 'knowledge', item.id, item).then(() => {
          this.trainerService.loadTrainerInfo(()=>{
            // console.log('Knowledge item updated:', item);
          },true)
        })
      }
    })
  }
  
  editBook(item:any){
    if(!this.trainerService.checkIsTrainerPro()){
        return
    }
    this.modalService.inputFields(this.translate.instant('dashboard.edit_expert_book_summary'), this.translate.instant('dashboard.edit_expert_book_summary_instructions'), [
      // {
      //   type: 'text',
      //   title: this.translate.instant('dashboard.knowledge_title'),
      //   name: 'title',
      //   value: item.title,
      //   required: true,
      // },
      {
        type: 'textarea',
        title: this.translate.instant('dashboard.knowledge_summary'),
        name: 'summary',
        value: item.summary,
        required: true,
        maxLength: 1500,
      }
    ], (result: any) => {
      if (result.data) {
        // item.title = result.data[0].value;
        item.summary = result.data[0].value;
        item.language = this.translate.currentLang;
        item.updated = Date.now();
        this.firestore.updateSub('trainers', this.nav.activeOrganisationId, 'knowledge', item.id, item).then(() => {
          this.trainerService.loadTrainerInfo(()=>{
            // console.log('Knowledge item updated:', item);
          },true)
        })
      }
    })
  }

  deleteKnowledgeItem(item:any){
    this.modalService.showConfirmation(this.translate.instant('confirmation_questions.delete')).then(async (result:any) => {
      if(result){
        this.toast.showLoader()
        this.firestore.deleteSub('trainers',this.nav.activeOrganisationId,'knowledge',item.id).then(()=>{
          this.trainerService.loadTrainerInfo(()=>{
            this.toast.hideLoader()
            // console.log('Knowledge item deleted:', item);
          },true)
        })
      }
    })
  }


  toBeDeletedSegments:any[] = []
  deleteBook(item:any){
    this.modalService.showConfirmation(this.translate.instant('dashboard.knowledge_delete')).then(async (result:any) => {
      if(result){
        this.toast.showLoader()
        this.toBeDeletedSegments = []
        this.firestore.deleteSub('trainers',this.nav.activeOrganisationId,'knowledge',item.id).then(()=>{
        })

        // let deletingSubscription = this.firestore.queryTriple('segments','trainerId',this.nav.activeOrganisationId,'==','type','knowledge','==','metadata.book',item.title,'==')
        // .subscribe((segments:any[]) => {
        //   this.toBeDeletedSegments = segments.map(doc => doc.payload.doc.id);
        //   deletingSubscription.unsubscribe();
        //   if(this.toBeDeletedSegments.length>0){
        //     for(let i=0;i<this.toBeDeletedSegments.length;i++){
        //       this.firestore.delete('segments',this.toBeDeletedSegments[i]).then(()=>{
        //         // console.log('Segment deleted:', this.toBeDeletedSegments[i]);
        //       }).catch((error:any)=>{
        //         console.error('Error deleting segment:', error);
        //       })
        //     }
        //   }
          this.toast.hideLoader();
        // });
      }
    })
  }

  async addBook(item:any){
    if(!this.trainerService.checkIsTrainerPro()){
        return
    }
    this.modalService.inputFields(this.translate.instant('dashboard.new_expert_knowledge'), this.translate.instant('dashboard.expert_add_book_instructions'), [
        {
          type: 'file',
          title: '',
          name: 'file',
          value: '',
          required: true,
          infoItem:true,
          maxSize: 50, // in MB
          fileTypes:".pdf,.docx,.txt"
        },
      ], 
      async (resultTitle: any) => {
        
        console.log('uploadBookClick resultTitle',resultTitle.data)
         if(resultTitle.data){
          this.toast.showLoader();

          try {

              this.firestore.createSubSub('trainers', this.nav.activeOrganisationId, 'knowledge', item.id, 'documents',{
                filePath: resultTitle.data[0].value.replace('https://storage.googleapis.com/lwai-3bac8.firebasestorage.app/',''), // bijv. 'uploads/mijnbestand.pdf'
                fileName: resultTitle.data[0].fileName,
                created: Date.now(),
                updated: Date.now(),
              })
              
              await fetch("https://europe-west1-lwai-3bac8.cloudfunctions.net/embedBookKnowledge", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  filePath: resultTitle.data[0].value.replace('https://storage.googleapis.com/lwai-3bac8.firebasestorage.app/',''), // bijv. 'uploads/mijnbestand.pdf'
                  title: item.title,
                  userId:this.auth.userInfo.uid || 'unknown',
                  trainerId:this.nav.activeOrganisationId || 'unknown',
                  expertKnowledgeId:item.id
                })
              });
              

              this.toast.hideLoader();
              this.toast.show(this.translate.instant('dashboard.expert_knowledge_uploaded_extra'), 4000, 'middle');

              this.trainerService.loadTrainerInfo(()=>{
                // console.log('Knowledge item added:', item);
              },true)

          } catch (error) {
            console.error("Fout bij upload:", error);
            this.toast.hideLoader();
            this.toast.show("Fout bij upload");
            return;
          }
        }

      })
  }

  async uploadBook() {
    if(!this.trainerService.checkIsTrainerPro()){
        return
    }
     this.modalService.inputFields(this.translate.instant('dashboard.new_expert_knowledge'), this.translate.instant('dashboard.new_expert_knowledge_instructions'), [
            {
              type: 'text',
              title: this.translate.instant('dashboard.knowledge_expert_title'),
              name: 'title',
              value: '',
              required: true,
            },
            {
              type: 'file',
              title: '',
              name: 'file',
              value: '',
              required: true,
              infoItem:true,
              maxSize: 50, // in MB
              fileTypes:".pdf,.docx,.txt"
            },
            {
              type: 'textarea',
              title: this.translate.instant('dashboard.knowledge_expert_summary'),
              name: 'summary',
              value: '',
              required: true,
              maxLength: 1500,
            },
          ], 
          async (resultTitle: any) => {
            if(resultTitle.data){
              console.log('uploadBookClick resultTitle',resultTitle.data)
              this.toast.showLoader();

                    try {

                      let item = {
                        type: 'book',
                        title: resultTitle.data[0].value,
                        summary: resultTitle.data[2].value,
                        created: Date.now(),
                        updated: Date.now(),
                        trainerId:this.nav.activeOrganisationId,
                        // filePath: resultTitle.data[1].value.replace('https://storage.googleapis.com/lwai-3bac8.firebasestorage.app/','')
                      }
                      this.firestore.createSub('trainers', this.nav.activeOrganisationId, 'knowledge', item,async (response:any) => {
                        console.log('Knowledge item added:', response.id);

                        this.firestore.createSubSub('trainers', this.nav.activeOrganisationId, 'knowledge', response.id, 'documents',{
                          filePath: resultTitle.data[1].value.replace('https://storage.googleapis.com/lwai-3bac8.firebasestorage.app/',''), // bijv. 'uploads/mijnbestand.pdf'
                          fileName: resultTitle.data[1].fileName,
                          created: Date.now(),
                          updated: Date.now(),
                        })
                        
                        await fetch("https://europe-west1-lwai-3bac8.cloudfunctions.net/embedBookKnowledge", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            filePath: resultTitle.data[1].value.replace('https://storage.googleapis.com/lwai-3bac8.firebasestorage.app/',''), // bijv. 'uploads/mijnbestand.pdf'
                            title: resultTitle.data[0].value,
                            userId:this.auth.userInfo.uid || 'unknown',
                            trainerId:this.nav.activeOrganisationId || 'unknown',
                            expertKnowledgeId:response.id
                          })
                        });
                        

                        this.toast.hideLoader();
                        this.toast.show(this.translate.instant('dashboard.expert_knowledge_uploaded'), 4000, 'middle');

                        this.trainerService.loadTrainerInfo(()=>{
                          // console.log('Knowledge item added:', item);
                        },true)
                      })

                      

                    } catch (error) {
                      console.error("Fout bij upload:", error);
                      this.toast.hideLoader();
                      this.toast.show("Fout bij upload");
                      return;
                    }

              // this.media.uploadAnyFile(fileResult,async (res:any)=>{
              //   console.log("uploadAnyFile result",res);
              //   if(res?.result){

              //     // this.toast.showLoader();

              //     //   try {
              //     //     await fetch("https://europe-west1-lwai-3bac8.cloudfunctions.net/embedBookKnowledge", {
              //     //       method: "POST",
              //     //       headers: {
              //     //         "Content-Type": "application/json",
              //     //       },
              //     //       body: JSON.stringify({
              //     //         filePath: resultTitle.data[1].value.replace('https://storage.googleapis.com/lwai-3bac8.firebasestorage.app/',''), // bijv. 'uploads/mijnbestand.pdf'
              //     //         title: resultTitle.data[0].value,
              //     //         userId:this.auth.userInfo.uid || 'unknown',
              //     //         trainerId:this.nav.activeOrganisationId || 'unknown'
              //     //       })
              //     //     });
              //     //     let item = {
              //     //       type: 'book',
              //     //       title: resultTitle.data[0].value,
              //     //       summary: resultTitle.data[1].value,
              //     //       created: Date.now(),
              //     //       updated: Date.now(),
              //     //       trainerId:this.nav.activeOrganisationId
              //     //     }
              //     //     this.firestore.createSub('trainers', this.nav.activeOrganisationId, 'knowledge', item).then(() => {
              //     //       this.trainerService.loadTrainerInfo(()=>{
              //     //         // console.log('Knowledge item added:', item);
              //     //       },true)
              //     //     })

              //     //     this.toast.hideLoader();
              //     //     this.toast.show(this.translate.instant('dashboard.book_uploaded'), 4000, 'middle');

              //     //   } catch (error) {
              //     //     console.error("Fout bij upload:", error);
              //     //     this.toast.hideLoader();
              //     //     this.toast.show("Fout bij upload");
              //     //     return;
              //     //   }


              //     // res.result.url
              //     // this.uploadBook(res.result.url.replace('https://storage.googleapis.com/lwai-3bac8.firebasestorage.app/',''), resultTitle.data[0].value, (response: any) => {
              //     //   console.log("✅ Upload succeeded:", response);
              //     //   this.toast.show(this.translate.instant('dashboard.book_uploaded'), 4000, 'middle');
              //     // });
                  
              //   }
              // })
            }
      })


    // this.media.selectAnyFile(50,(fileResult:any)=>{
    //     if(fileResult){

    //       this.modalService.inputFields(this.translate.instant('dashboard.upload_book'), this.translate.instant('dashboard.upload_book_instructions'), [
    //         {
    //           type: 'text',
    //           title: this.translate.instant('dashboard.book_title'),
    //           name: 'title',
    //           value: '',
    //           required: true,
    //         },
    //         {
    //           type: 'html',
    //           title: this.translate.instant('dashboard.book_summary'),
    //           name: 'summary',
    //           value: '',
    //           required: true,
    //         },
    //       ], 
    //       (resultTitle: any) => {
    //         if(resultTitle.data){
    //           this.media.uploadAnyFile(fileResult,async (res:any)=>{
    //             console.log("uploadAnyFile result",res);
    //             if(res?.result){

    //               this.toast.showLoader();

    //                 try {
    //                   await fetch("https://europe-west1-lwai-3bac8.cloudfunctions.net/embedBookKnowledge", {
    //                     method: "POST",
    //                     headers: {
    //                       "Content-Type": "application/json",
    //                     },
    //                     body: JSON.stringify({
    //                       filePath: res.result.url.replace('https://storage.googleapis.com/lwai-3bac8.firebasestorage.app/',''), // bijv. 'uploads/mijnbestand.pdf'
    //                       title: resultTitle.data[0].value,
    //                       userId:this.auth.userInfo.uid || 'unknown',
    //                       trainerId:this.nav.activeOrganisationId || 'unknown'
    //                     })
    //                   });
    //                   let item = {
    //                     type: 'book',
    //                     title: resultTitle.data[0].value,
    //                     summary: resultTitle.data[1].value,
    //                     created: Date.now(),
    //                     updated: Date.now(),
    //                     trainerId:this.nav.activeOrganisationId
    //                   }
    //                   this.firestore.createSub('trainers', this.nav.activeOrganisationId, 'knowledge', item).then(() => {
    //                     this.trainerService.loadTrainerInfo(()=>{
    //                       // console.log('Knowledge item added:', item);
    //                     },true)
    //                   })

    //                   this.toast.hideLoader();
    //                   this.toast.show(this.translate.instant('dashboard.book_uploaded'), 4000, 'middle');

    //                 } catch (error) {
    //                   console.error("Fout bij upload:", error);
    //                   this.toast.hideLoader();
    //                   this.toast.show("Fout bij upload");
    //                   return;
    //                 }


    //               // res.result.url
    //               // this.uploadBook(res.result.url.replace('https://storage.googleapis.com/lwai-3bac8.firebasestorage.app/',''), resultTitle.data[0].value, (response: any) => {
    //               //   console.log("✅ Upload succeeded:", response);
    //               //   this.toast.show(this.translate.instant('dashboard.book_uploaded'), 4000, 'middle');
    //               // });
                  
    //             }
    //           })
    //         }
    //       })
    //     }
    // })

  }

  deleteExpertDocument(document:any,knowledgeItem:any){
    this.modalService.showConfirmation(this.translate.instant('confirmation_questions.delete')).then(async (result:any) => {
      if(result){
        this.toast.showLoader()
        this.firestore.deleteSubSub('trainers',this.nav.activeOrganisationId,'knowledge',knowledgeItem.id,'documents',document.id).then(()=>{
          this.trainerService.loadTrainerInfo(()=>{
            this.toast.hideLoader()
            // console.log('Document deleted:', document);
          },true)
        })
      }
    })
  }

  updateBankAccount(){
    if(!this.trainerService.checkIsTrainerPro()){
      return;
    }
    if(this.originalBankAccount.iban || this.originalBankAccount.bic || this.originalBankAccount.name){
      if(!this.trainerService.validBank(this.originalBankAccount)){
        this.toast.show(this.translate.instant('dashboard.invalid_bank_account'), 3000, 'middle');
        return;
      }
      if(!this.trainerService.validIban(this.originalBankAccount.iban)){
        this.toast.show(this.translate.instant('dashboard.invalid_iban'), 3000, 'middle');
        return
      }
    }
    this.trainerService.trainerInfo.bank_account = {
      iban: this.originalBankAccount.iban.trim().toUpperCase(),
      bic: this.originalBankAccount.bic.trim().toUpperCase(),
      name: this.originalBankAccount.name.trim()
    }

    this.update('bank_account')
  }

  changesInBankAccount(){
    if(!this.trainerService.trainerInfo?.bank_account || this.trainerService.trainerInfo.bank_account.iban==undefined || !this.originalBankAccount || this.originalBankAccount.iban==undefined){
      return false
    }
    if(this.originalBankAccount && this.trainerService.trainerInfo.bank_account){
      return this.originalBankAccount.iban.toUpperCase() != this.trainerService.trainerInfo.bank_account.iban.toUpperCase() ||
             this.originalBankAccount.bic.toUpperCase() != this.trainerService.trainerInfo.bank_account.bic.toUpperCase() ||
             this.originalBankAccount.name != this.trainerService.trainerInfo.bank_account.name;
    }
    return false;
  }

  undoBankAccount(){
    this.originalBankAccount = {
      iban: this.trainerService.trainerInfo.bank_account?.iban || '',
      bic: this.trainerService.trainerInfo.bank_account?.bic || '',
      name: this.trainerService.trainerInfo.bank_account?.name || ''
    };
  }

  updateInvoice(){
    if(!this.trainerService.checkIsTrainerPro()){
      return;
    }

    if(!this.originalInvoice.name && !this.originalInvoice.zip && !this.originalInvoice.city && !this.originalInvoice.address && !this.originalInvoice.vat_number && !this.originalInvoice.country && !this.originalInvoice.email && !this.originalInvoice.reference){
      this.trainerService.trainerInfo.invoice = {
        name: this.originalInvoice.name.trim(),
        zip: this.originalInvoice.zip.trim().toUpperCase(),
        city: this.originalInvoice.city.trim().toUpperCase(),
        country: this.originalInvoice.country.trim().toUpperCase(),
        address: this.originalInvoice.address.trim(),
        vat_number: this.originalInvoice.vat_number.trim().toUpperCase(),
        email: this.originalInvoice.email.trim().toLowerCase(),
        reference: this.originalInvoice.reference.trim()
      };

      this.update('invoice')
      return;
    }

    if(!this.originalInvoice.name || !this.originalInvoice.zip || !this.originalInvoice.city || !this.originalInvoice.address || !this.originalInvoice.vat_number || !this.originalInvoice.country || !this.originalInvoice.email || !this.originalInvoice.reference){
      this.toast.show(this.translate.instant('dashboard.invoice_all_fields'), 3000, 'middle');
      return;
    }
    // if(this.originalInvoice.name || this.originalInvoice.zip || this.originalInvoice.city || this.originalInvoice.address || this.originalInvoice.vat_number || this.originalInvoice.country || this.originalInvoice.email || this.originalInvoice.reference){

    if(!this.helper.validEmail(this.originalInvoice.email)){
      this.toast.show(this.translate.instant('dashboard.invalid_email'), 3000, 'middle');
      return;
    }
    // }
    this.trainerService.trainerInfo.invoice = {
      name: this.originalInvoice.name.trim(),
      zip: this.originalInvoice.zip.trim().toUpperCase(),
      city: this.originalInvoice.city.trim().toUpperCase(),
      country: this.originalInvoice.country.trim().toUpperCase(),
      address: this.originalInvoice.address.trim(),
      vat_number: this.originalInvoice.vat_number.trim().toUpperCase(),
      email: this.originalInvoice.email.trim().toLowerCase(),
      reference: this.originalInvoice.reference.trim()
    }

    this.update('invoice')
  }

  changesInInvoice(){
    if(!this.trainerService.trainerInfo?.invoice || this.trainerService.trainerInfo.invoice.name == undefined || !this.originalInvoice || this.originalInvoice.name==undefined){
      return false
    }
    if(this.originalInvoice && this.trainerService.trainerInfo.invoice){
      return this.originalInvoice.name != this.trainerService.trainerInfo.invoice.name ||
             this.originalInvoice.zip.trim().toUpperCase() != this.trainerService.trainerInfo.invoice.zip ||
             this.originalInvoice.city.trim().toUpperCase() != this.trainerService.trainerInfo.invoice.city ||
             this.originalInvoice.country.trim().toUpperCase() != this.trainerService.trainerInfo.invoice.country ||
             this.originalInvoice.address.trim()!= this.trainerService.trainerInfo.invoice.address ||
             this.originalInvoice.vat_number.trim().toUpperCase() != this.trainerService.trainerInfo.invoice.vat_number ||
             this.originalInvoice.email.trim().toLowerCase() != this.trainerService.trainerInfo.invoice.email ||
             this.originalInvoice.reference.trim() != this.trainerService.trainerInfo.invoice.reference;
    }
    return false;
  }

  undoInvoice(){
    this.originalInvoice = {
      name: this.trainerService.trainerInfo.invoice?.name || '',
      zip: this.trainerService.trainerInfo.invoice?.zip || '',
      city: this.trainerService.trainerInfo.invoice?.city || '',
      country: this.trainerService.trainerInfo.invoice?.country || '',
      address: this.trainerService.trainerInfo.invoice?.address || '',
      vat_number: this.trainerService.trainerInfo.invoice?.vat_number || '',
      email: this.trainerService.trainerInfo.invoice?.email || '',
      reference: this.trainerService.trainerInfo.invoice?.reference || ''
    };
  }
}