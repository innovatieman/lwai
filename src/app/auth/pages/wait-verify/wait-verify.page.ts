import { Component, ElementRef, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';
import { AuthService } from '../../auth.service';
import { ToastService } from 'src/app/services/toast.service';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { InfoService } from 'src/app/services/info.service';
import { TranslateService } from '@ngx-translate/core';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';
import { CountriesService } from 'src/app/services/countries.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { id } from '@swimlane/ngx-datatable';
import { HelpersService } from 'src/app/services/helpers.service';
import { LevelsService } from 'src/app/services/levels.service';
import { FilterKeyPipe } from 'src/app/pipes/filter-key.pipe';
import { CasesService } from 'src/app/services/cases.service';
import { CaseFilterPipe } from 'src/app/pipes/case-filter.pipe';

@Component({
  selector: 'app-wait-verify',
  templateUrl: './wait-verify.page.html',
  styleUrls: ['./wait-verify.page.scss'],
})
export class WaitVerifyPage implements OnInit {
  @ViewChild('myVideo') myVideo!: ElementRef<HTMLVideoElement>;
  @ViewChildren('otpBox') otpInputs!: QueryList<ElementRef>;
  [x:string]: any;
  code: string[] = ['1', '2', '3', '4', '5', '6'];
  loading: boolean = true;
  displayName = '';
  allSaved:boolean = false;
  isVerified: boolean = false;
  emailResend:string = '';
  conversationTypesLoaded:boolean = false;
  video_started:boolean = false;
  counter:number = 3;
  filterDone:boolean = false;
  selectedSubject:any = ''
  step:number = 0
  singleUse: any = {}
  suggestionCases: any[] = []
  verifyCode:any = {}
  initiated:boolean = false
  isLoggedIn:boolean = false
  useOptions: any[]=[
    {id:'my_understanding'},
    {id:'others_understanding'},
    {id:'achieve_conversation'},
    {id:'benefit_conversation'},
    {id:'better_persuade'},
    {id:'help_others'},
    {id:'solve_problem'},
    {id:'self_develop'},
  ]

  situationOptions: any[]=[
    {id:'friends',subjects:['friends'],filterId:'friends'},
    {id:'family',subjects:['family'],filterId:'friends'},
    {id:'neighbours',subjects:['neighbours'],filterId:'friends'},
    {id:'people_with_other_opinion',filterId:'opinions',subjects:['climate_environment','culture','debate','ethics','health','migration','politics','privacy','religion_belief','safety_crime','science','social_media','social_rights','technology']},
    {id:'colleagues',filterId:'work',subjects:['communication_colleagues','job_applications','leadership','organizational_changes','salary_conditions','work_conflict']},
    {id:'customer',filterId:'client',subjects:['childcare_clients','commercial_clients','education_clients','housing_clients']},
    {id:'patient',filterId:'client',subjects:['healthcare_clients']},
    {id:'citizen',filterId:'client',subjects:['housing_clients','safety_enforcement_clients']},
    {id:'my_profession',filterId:'professions',subjects:['childcare_profession','coaching','commercial','consulting','customer_service','education','government','healthcare','housing','leadership_profession','safety_enforcement','sports']},
    {id:'open_for_unknown',filterId:'non_human',subjects:['devices','objects','plants_animals','science_fiction']},
  ] 

  experienceOptions: any[]=[
    {id:'never',level:1},
    {id:'difficult',level:1},
    {id:'learn',level:2},
    {id:'satisfied',level:3},
    {id:'compliments', level:4},
    {id:'profession', level:5},
  ]

  constructor(
    public media: MediaService,
    public icon: IconsService,
    public auth: AuthService,
    private toast: ToastService,
    private functions: AngularFireFunctions,
    public infoService:InfoService,
    public translate:TranslateService,
    private modalService: ModalService,
    public nav:NavService,
    public countries:CountriesService,
    private firestore:FirestoreService,
    public helper:HelpersService,
    public levelService:LevelsService,
    private filterKeyPipe:FilterKeyPipe,
    private caseFilterPipe:CaseFilterPipe,
    private cases:CasesService
  ) { }

  ngOnInit() {
    this.auth.userInfo$.subscribe(userInfo => {
      if (userInfo) {
        this.isLoggedIn = true
       this.displayName = userInfo.displayName;
      //  console.log(userInfo)
       this.auth.getCredits(userInfo.uid)
       this.startingStep()
      }
      else{
        // this.nav.go('login')
      }
    });
    this.nav.changeLang.subscribe((lang) => {
      const video = this.myVideo.nativeElement;
      video.pause();
      video.autoplay = false;
      video.src = 'https://storage.googleapis.com/lwai-3bac8.firebasestorage.app/tutorials/welcome_'+this.translate.currentLang+'.mp4'
      video.load();
      setTimeout(() => {
        video.play();
      }, 1000);
      
    })
    setTimeout(() => {
      if(!this.isLoggedIn){
        this.nav.go('login')
      }
    }, 10000);
    this.auth.isVerified().subscribe((auth) => {
      if(auth){
        this.isVerified = true
        this.cases.casesLoaded.subscribe((res)=>{
          this.casesLoaded = true
        })
        this.startingStep()
      }
    });
    this.infoService.conversationTypesLoaded.subscribe((loaded)=>{
      if(loaded){
        this.conversationTypesLoaded = true
      }
    })
    this.infoService.loadInfo()
    setTimeout(() => {
      this.video_started = true;
      setTimeout(() => {
        if (this.myVideo && this.myVideo.nativeElement) {
          const video = this.myVideo.nativeElement;
          if(this.media.platform.is('ios')){
            video.muted = true;
          }
          video.muted = false;
          video.playsInline = true;
          video.autoplay = true;
          video.play();
        }
      }, 1000);
    }, 4000);
    let timer = setInterval(()=>{
      this.counter--
      if(this.counter==0){
        clearInterval(timer)
      }
    }
    ,1000)

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
    this.functions.httpsCallable('verifyEmailInitCode')({code:code,email:this.auth.userInfo.email}).subscribe((response:any)=>{
      console.log(response)
      if(response.status==200){
        this.isVerified = true
        this.verifyCode.valid = true
        setTimeout(async () => {
          await this.auth.refreshFirebaseUser()
          this.next(this.step)
        }, 1000);
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

  ionViewWillLeave(){
    if (this.myVideo && this.myVideo.nativeElement) {
      this.myVideo.nativeElement.pause();
    }
  }
  updateName(){
    if(!this.displayName) return;
    this.functions.httpsCallable('editUserName')({displayName:this.displayName}).subscribe((response:any)=>{
      if(response.status==200){
        this.toast.show(this.translate.instant('messages.saved'),3000,'bottom')
      }
      else{
        this.toast.show(this.translate.instant('error_messages.failure'),3000)
      }
      this.toast.hideLoader()
    })
  }

  get filterIsEmpty() {
    return this.currentFilterTypes.types.length === 0 && this.currentFilterTypes.subjects.length === 0;
  }
  get currentFilterTypes() {
    return this.filterTypes()
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
    });
  }

  async savePreferences(types?:any){
    if(!types){
      this.modalService.showConfirmation(this.translate.instant('page_wait_verify.preferences_no_content')).then((response)=>{
        if(response){
          this.savePreferences(this.currentFilterTypes)
        }
      })
    }
    else{
      this.toast.showLoader(this.translate.instant('messages.busy_saving'))
      this.functions.httpsCallable('editUserFilter')({filter:types}).subscribe(()=>{
        this.toast.hideLoader()
      })
      this.allSaved = true
    }
  }


  filterTypes(){
    let filter: any = {
      types: [],
      subjects: [],
      subjectTypes: {}
    };
  
    for(let i = 0; i < this.situationOptions.length; i++){
      if(this.situationOptions[i].selected){
        const conversationTypeId = this.situationOptions[i].filterId;
        filter.types.push(conversationTypeId);
        // Maak een lijst van subjects per conversationType
        filter.subjectTypes[conversationTypeId] = [];
      }
    }


    // for (let i = 0; i < this.infoService.conversation_types.length; i++) {
    //   if (this.infoService.conversation_types[i].selected) {
    //     const conversationTypeId = this.infoService.conversation_types[i].id;
    //     filter.types.push(conversationTypeId);
  
    //     // Maak een lijst van subjects per conversationType
    //     filter.subjectTypes[conversationTypeId] = [];
  
    //     for (let j = 0; j < this.infoService.conversation_types[i].subjects.length; j++) {
    //       if (this.infoService.conversation_types[i].subjects[j].selected) {
    //         filter.subjects.push(this.infoService.conversation_types[i].subjects[j].id);
    //         filter.subjectTypes[conversationTypeId].push(this.infoService.conversation_types[i].subjects[j].id);
    //       }
    //     }
    //   }
    // }
    return filter;
  }

  async wait(milliseconds:number){
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, milliseconds);
    });
  }

  filterTypesFromArray(filterArray:any[]){
    let filter: any = {
      types: [],
      subjects: [],
      subjectTypes: {}
    };
    console.log(filterArray)
    for(let i = 0; i < filterArray.length; i++){
      let type = this.infoService.getConversationType('',filterArray[i])
      if(type && filter.types.indexOf(type.conversation_type)<0){
        filter.types.push(type.conversation_type)
      }
      if(!filter.subjectTypes[type.conversation_type]){
        filter.subjectTypes[type.conversation_type] = []
      }
      if(filter.subjectTypes[type.conversation_type].indexOf(filterArray[i])<0){
        filter.subjectTypes[type.conversation_type].push(filterArray[i])
      }
      if(filter.subjects.indexOf(filterArray[i])<0){
        filter.subjects.push(filterArray[i])
      }
    }

    for(let i = 0; i < this.infoService.conversation_types.length; i++){
      let conversation_type = this.infoService.conversation_types[i]
      this.infoService.conversation_types[i].selected = false

      for(let j = 0; j < conversation_type.subjects.length; j++){
        this.infoService.conversation_types[i].subjects[j].selected = false
      }
    }

    for(let i = 0; i < this.infoService.conversation_types.length; i++){
      let conversation_type = this.infoService.conversation_types[i]
      if(filter.types.includes(conversation_type.id)){
        this.infoService.conversation_types[i].selected = true
      }
      for(let j = 0; j < conversation_type.subjects.length; j++){
        if(filter.subjects.includes(conversation_type.subjects[j].id)){
          this.infoService.conversation_types[i].subjects[j].selected = true
        }
      }
    }

  }
  doNothing(){}

  startWith(item:any){
    this.singleUse = item
    console.log(this.infoService.getConversationType('','culture'))
    setTimeout(() => {
      this.next(this.step)
    }, 300);
  }
  startWithSubject(item:any){
    this.selectedSubject = item
    setTimeout(() => {
      this.singleUse.subjects = [item]
      this.next(this.step)      
    }, 300);
  }

  async next(oldStep:number){
    let userTutorials = this.auth.tutorials.tutorials
    if(!userTutorials){
      userTutorials = {}
    }
    if(!userTutorials['onboarding'+oldStep]){
      userTutorials['onboarding'] = {}
    }
    userTutorials['onboarding'][oldStep] = true
    this.firestore.setSub('users',this.auth.userInfo.uid,'tutorials','tutorials',{tutorials:userTutorials})
    this.step = oldStep+1
    if(this.step==2){
      this.infoService.loadInfo()
      this.cases.reloadCases()
      this.checkOffer()
      this.checkregistrationCode()
    }
    this.fillSteps()
    console.log(this.step,this.singleUse)
    if(this.step == 5){
      if(!this.singleUse.id && this.itemsSelected('situationOptions',true)==1){
        this.singleUse = this.itemsSelected('situationOptions',false,true)
        this.next(this.step)
      }
    }
    if(this.step == 6){
      if(this.singleUse?.subjects?.length==1){
        this.next(this.step)
      }
    }
    if(this.step == 7){
      this.setSuggestionCases()
    }
  }

  prev(){
    this.step = this.step-1
    if(this.step==5){
      if(this.itemsSelected('useOptions',true)==1){
        this.step = this.step-1
      }
      else{
        this.singleUse = {}
      }
    }
  }

  async startingStep(){
    if(this.initiated){
      return
    }
    this.step = 0
    if(this.isVerified){
      this.step = 1
    }
    this.initiated = true
    // return
    // await this.wait(2000)
    this.loading = false
    // console.log('starting step',this.auth.tutorials)
    // if(!this.auth.tutorials?.tutorials?.onboarding){
    //   this.loading = false
    //   return
    // }
    // for(let i = 0; i < 7; i++){
    //   console.log('step',i,this.auth.tutorials.tutorials['onboarding'][i])
    //   if(this.auth.tutorials.tutorials['onboarding'][i]){
    //     this.step = i+1
    //   }
    // }
    // if(this.step >5 && !this.singleUse.id){
    //   this.step = 5
    // }
    // this.loading = false
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
        this.toast.showLoader()
        this.functions.httpsCallable('editUserCountry')({country:result.data.value}).subscribe((response:any)=>{
          this.toast.hideLoader()
          this.toast.show(this.translate.instant('languages.country_changed'))
        })
      }
    },null,this.translate.instant('languages.select_country'))
  }
  
  selectTypes(types:string[] = []){
    let items:any =[]; 
    for(let i = 0; i < this.infoService.conversation_types.length; i++){
      if(this.infoService.conversation_types[i].subjects?.length){
        items.push(this.infoService.conversation_types[i])
      }
    }
    let obj:any = {
      list:items,
      subList:'subjects',
      title:'Selecteer één of meerdere typen',
      value:types ? types : [],
    }
    this.modalService.selectMany(obj,(result:any)=>{
      // console.log(result)
      // this.filterTypesFromArray(result.data)
      // this.savePreferences(this.currentFilterTypes)
    })
  }

  itemsSelected(type:string,count?:boolean,single?:boolean){
    let counting = 0
    let selected = false
    for(let i = 0; i < this[type].length; i++){
      if(this[type][i].selected){
        selected = true
        if(count){
          counting++
        }
        else{
          if(single){
            return this[type][i]
          }
          else{
            break
          }
        }
      }
    }
    if(count){
      return counting
    }
    else{
      return selected
    }
  }

  save(item:string){
    this.toast.showLoader()
    let obj:any = {}
    obj[item] = this.getActiveItems(item)
    this.firestore.setSub('users',this.auth.userInfo.uid,'profile',item,obj).then(()=>{
      this.toast.hideLoader()
      this.next(this.step)
    })
  }

  getActiveItems(type:string){
    let selected = []
    for(let i = 0; i < this[type].length; i++){
      if(this[type][i].selected){
        selected.push(this[type][i])
      }
    }
    return selected
  }

  selectSingle(type:string,item:any){
    for(let i = 0; i < this[type].length; i++){
      if(this[type][i].id == item.id){
        this[type][i].selected = true
      }
      else{
        this[type][i].selected = false
      }
    }
  }

  fillSteps(){
    if(this.auth.profile['useOptions']){
      for(let i = 0; i < this.useOptions.length; i++){
        for(let j = 0; j < this.auth.profile['useOptions']['useOptions'].length; j++){
          if(this.useOptions[i].id == this.auth.profile['useOptions']['useOptions'][j].id){
            this.useOptions[i].selected = true
          }
        }
      }
    }
    if(this.auth.profile['experienceOptions']){
      for(let i = 0; i < this.experienceOptions.length; i++){
        for(let j = 0; j < this.auth.profile['experienceOptions']['experienceOptions'].length; j++){
          if(this.experienceOptions[i].id == this.auth.profile['experienceOptions']['experienceOptions'][j].id){
            this.experienceOptions[i].selected = true
          }
        }
      }
    }
    if(this.auth.profile['situationOptions']){
      for(let i = 0; i < this.useOptions.length; i++){
        for(let j = 0; j < this.auth.profile['situationOptions']['situationOptions'].length; j++){
          if(this.situationOptions[i].id == this.auth.profile['situationOptions']['situationOptions'][j].id){
            this.situationOptions[i].selected = true
          }
        }
      }
    }
  }

  showCaseInfo(caseItem:any){
    this.modalService.showCaseInfo(caseItem)
  }

  startConversation(caseItem:any,event?:any){
    if(event){
      event.preventDefault()
      event.stopPropagation()
    }
    if(caseItem.translation){
      caseItem.role = caseItem.translation.role
      if(caseItem.translation.free_question){
        caseItem.free_question = caseItem.translation.free_question
      }
    }
    this.modalService.showConversationStart(caseItem).then((res)=>{
      if(res){
        localStorage.setItem('activatedCase',caseItem.id)
        localStorage.setItem('personalCase',JSON.stringify(caseItem))
        this.nav.go('conversation/'+caseItem.id)
      }
    })

  }
  allCases:any[] = []
  casesLoaded:boolean = false
  // updateVisibleCases(){
  //   console.log('update cases')
  //   this.allCases = JSON.parse(JSON.stringify(this.cases.all))
  //   // this.casesLoaded = true
  // }

  updateFilter(){
    console.log(this.currentFilterTypes)
    this.functions.httpsCallable('editUserFilter')({filter:this.currentFilterTypes}).subscribe((response:any)=>{
      setTimeout(() => {
        this.infoService.fillConversationTypes(this.auth.userInfo.filter)
      }, 500);
    })
  }

  setSuggestionCases(){

    this.updateFilter()

    let conversationType = this.infoService.getConversationType('',this.singleUse.subjects[0])
    let types:any = {}
    types[conversationType.conversation_type] = this.singleUse.subjects
    let subjectCases = this.caseFilterPipe.transform(
      this.cases.all,
      [conversationType.conversation_type],
      types,
      [true]
    );

    let userLevel = this.experienceOptions[0].level
    let levels = [userLevel]
    let levelCases = this.filterKeyPipe.transform(subjectCases,'level',levels)
    if(!levelCases.length){
      if(userLevel<5){
        levels.push(userLevel+1)
      }
      else{
        levels.push(userLevel-1)
      }
    }
    levelCases = this.filterKeyPipe.transform(subjectCases,'level',levels)
    if(!levelCases.length){
      if(userLevel<4){
        levels.push(userLevel+2)
      }
      else{
        levels.push(userLevel-2)
      }
    }
    levelCases = this.filterKeyPipe.transform(subjectCases,'level',levels)
    if(!levelCases.length){
      if(userLevel<3){
        levels.push(userLevel+3)
      }
      else{
        levels.push(userLevel-3)
      }
    }
    levelCases = this.filterKeyPipe.transform(subjectCases,'level',levels)
    if(!subjectCases.length){
      levels = [1,2,3,4,5]
    }
    levelCases = this.filterKeyPipe.transform(subjectCases,'level',levels)


    let userUseCases = []
    for(let i = 0; i < this.useOptions.length; i++){
      if(this.useOptions[i].selected){
        userUseCases.push(this.useOptions[i].id)
      }
    }
    
    let useCases = this.filterKeyPipe.transform(levelCases,'useCases',userUseCases)

    if(!useCases.length){
      levelCases = this.helper.shuffle(levelCases)
      this.suggestionCases = JSON.parse(JSON.stringify(levelCases))
    }
    else{
      useCases = this.helper.shuffle(useCases)
      this.suggestionCases = JSON.parse(JSON.stringify(useCases))
    }


  }



  skipSuggestion(){
    this.modalService.showText(this.translate.instant('page_wait_verify.skip_suggestion_popup'),this.translate.instant('page_wait_verify.skip_suggestion_title'),false,[{text:this.translate.instant('buttons.back'),value:false,color:'dark'},{text:this.translate.instant('buttons.letsgo'),value:true,color:'primary'}],true,(res:any)=>{
      console.log(res)
      if(res.data){
        console.log('skip suggestion')
        this.nav.go('start/cases')
      }
    })
  }

  checkOffer(){
    console.log(this.nav.specialCode)
    if(this.nav.specialCode){
      this.functions.httpsCallable('checkOffer')({code:this.nav.specialCode}).subscribe((response:any)=>{
        console.log(response)
        this.nav.specialCode = ''
      })
    }
      
  }

  checkregistrationCode(){
    if(this.nav.registrationCode){
      this.auth.registerWithCode(this.nav.registrationCode)
    }
  }


}
