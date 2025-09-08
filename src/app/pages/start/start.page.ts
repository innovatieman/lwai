import { ChangeDetectorRef, Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonInfiniteScroll, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { theme } from 'highcharts';
import { AuthService } from 'src/app/auth/auth.service';
import { CaseFilterPipe } from 'src/app/pipes/case-filter.pipe';
import { FilterKeyPipe } from 'src/app/pipes/filter-key.pipe';
import { FilterSearchPipe } from 'src/app/pipes/filter-search.pipe';
import { BadgesService } from 'src/app/services/badges.service';
import { CasesService } from 'src/app/services/cases.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { InfoService } from 'src/app/services/info.service';
import { LevelsService } from 'src/app/services/levels.service';
import { MediaService } from 'src/app/services/media.service';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';
import { tutorialService } from 'src/app/services/tutorial.service';
import * as moment from 'moment';
import { ConversationService } from 'src/app/services/conversation.service';
import { MenuPage } from 'src/app/components/menu/menu.page';
import { SelectMenuService } from 'src/app/services/select-menu.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-start',
  templateUrl: './start.page.html',
  styleUrls: ['./start.page.scss'],
})
export class StartPage implements OnInit {
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;
  @HostListener('window:resize', ['$event'])
  onResize(){
    this.media.setScreenSize()
    this.rf.detectChanges()
    this.setupProgressCircles()
  }

  @ViewChild('progressCircle1',{static:false}) progressCircle1: any;
  @ViewChild('progressCircle2',{static:false}) progressCircle2: any;
  @ViewChild('progressCircle3',{static:false}) progressCircle3: any;

  @ViewChild('progressCircle1Mobile',{static:false}) progressCircle1Mobile: any;
  @ViewChild('progressCircle2Mobile',{static:false}) progressCircle2Mobile: any;
  @ViewChild('progressCircle3Mobile',{static:false}) progressCircle3Mobile: any;

  [x:string]:any
  selectedModule:any = null
  selectedConversation:any = null
  conversations$:any
  activeCategory:any = 'transformative' //null
  showAll:string = ''
  extraFilters: any = {
    open_to_user: [true]
  }
  searchTerm: string = '';
  showFilterSmall: boolean = false;
  levels: any = [
    {nr:1},
    {nr:2},
    {nr:3},
    {nr:4},
    {nr:5}
  ];
  showFlags: boolean = false;
  showFilter: boolean = false;
  showFilterLevel: boolean = false;
  showScoreLogic = false;
  showScoreFlow = false;
  showScoreImpact = false;
  // score = 0; 
  filteredCases: any[] = [];
  visibleCases: any[] = [];
  maxCases: number = 15;
  pathname: string = window.location.pathname.split('/').pop() || '';
  subTab: string = '';
  
  constructor(
    public nav:NavService,
    public cases:CasesService,
    public auth:AuthService,
    public icon:IconsService,
    public modalService:ModalService,
    public infoService:InfoService,
    public media:MediaService,
    private rf:ChangeDetectorRef,
    private firestore:FirestoreService,
    public helper:HelpersService,
    public translate:TranslateService,
    private route: ActivatedRoute,
    public tutorial:tutorialService,
    public levelService:LevelsService,
    private filterSearchPipe: FilterSearchPipe,
    private caseFilterPipe: CaseFilterPipe,
    private filterKeyPipe: FilterKeyPipe,
    public badges:BadgesService,
    private conversationService:ConversationService,
    private popoverController:PopoverController,
    private selectMenuservice:SelectMenuService,
    private toast:ToastService,
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {

      if(params['tab']&&(params['tab'] == 'cases' || params['tab'] == 'my_trainings' || params['tab'] == 'my_organisation')){
        this.showAll = params['tab']
        console.log(params['case_types'],params['case_types'] != 'create_self')
        if(!params['case_types']||params['case_types'] != 'create_self'){
          this.showCreateSelf = false
        }
        else{
          this.showCreateSelf = true
        }
        if((params['tab']=='my_trainings' || params['tab'] == 'my_organisation') && params['case_types']){
          this.selectModule(params['case_types'],params['tab'] == 'my_organisation')
        }
      }
      else{
        this.showAll = ''
      }
      if(params['tab']=='score'){
        setTimeout(() => {
          this.showAnimatedScore()
        }, 2000);
      }
      setTimeout(() => {
        let pathName = location.pathname.substring(1)
        let pathNameArr = pathName.split('/')
        if( pathNameArr.length > 2){
          pathName = pathNameArr[0] + '/' + pathNameArr[1]
        }
        if(this.media.smallDevice){
          this.tutorial.triggerTutorial(pathName,'onload_mobile')
        }
        else{
          this.tutorial.triggerTutorial(pathName,'onload')
        }
      }, 1000);
    });
    // this.auth.userInfo$.subscribe(userInfo => {
    //   if (userInfo) {
    //   }
    // });

    this.conversations$ = this.auth.getConversations();
    this.setupProgressCircles()
    this.infoService.conversationTypesLoaded.subscribe((res)=>{
      this.updateVisibleCases()
    })
    this.cases.casesLoaded.subscribe((res)=>{
      this.updateVisibleCases();
    })
    this.auth.coursesLoaded.subscribe((res)=>{
      console.log('courses loaded', this.auth.activeCourses.length)
      this.rf.detectChanges()
    })
    this.nav.changeLang.subscribe((res)=>{
        location.reload()
    })

    this.nav.myOrganisationChange.subscribe((organisationId)=>{
      if(!organisationId){
        this.nav.go('start/my_organisation/');this.onFiltersChanged();this.selectedModule={}
      }
      else{
        this.auth.mySelectedOrganisation = this.auth.organisationTrainings.find(org => org.id === organisationId);
        localStorage.setItem('organisationTrainingId', this.auth.mySelectedOrganisation.id);
        this.nav.go('start/my_organisation');this.onFiltersChanged();this.selectedModule={}
      }
    })

    let urlParams = new URLSearchParams(window.location.search);
    let searchTerm = urlParams.get('searchTerm');
    if(searchTerm){
      this.searchTerm = searchTerm
      setTimeout(() => {
        this.updateVisibleCases();
      }, 1000);
    }
    // this.sendTestMail()
  }

  ngAfterViewInit(){
    this.subTab = ''
    this.updateVisibleCases();
    this.reloadMenu();
  }

  reloadMenu(){
    setTimeout(() => {
      this.nav.reloadMenu.emit(true)
    }, 10);
  }

  showAnimatedScore() {
    this.showScoreImpact = true;
    console.log('show score')
    setTimeout(() => {
      this.showScoreImpact = false;
      this.setupProgressCircles(1,1,1)
      setTimeout(() => {
        this.showScoreFlow = true;
      }, 100);
      setTimeout(() => {
        this.showScoreFlow = false;
        this.setupProgressCircles(2,2,3)
        setTimeout(() => {
          this.showScoreLogic = true;
        }, 100);
        setTimeout(() => {
          this.showScoreLogic = false;
          this.setupProgressCircles(3,3,5)
        }, 3000);
      }, 3000);
    }, 3000);
  }

  noCredits(event?:any){
    if(event){
      event.preventDefault()
      event.stopPropagation()
    }
    this.modalService.showInfo({
      title:this.translate.instant('credits.no_credits'),
      content:this.translate.instant('credits.no_credits_conversation'),
      buttons:[
        {text:'Terug',value:'',color:'secondary',fill:'outline'},
        {text:'Koop credits',value:'credits',color:'primary',fill:'solid'},
      ]
    },(response:any)=>{
      if(response.data=='credits'){
        this.nav.go('account/credits')
      }
    })
  }

  setupProgressCirclesDelay(){
    console.log('delay')
    setTimeout(() => {
      this.setupProgressCircles()
    }, 50);
  }

  setupProgressCircles(min:number=0,max:number=3,only?:number){
    let count:number = 0
    let check:any = {}
    for(let i = min; i<=max;i++){
      check[i] = setInterval(()=>{
        count++
        if(count>500){
          clearInterval(check[i])
        }
        let progressCirclesOffset = this.progressCirclesOffset()

        if( this['progressCircle'+i]?.elRef?.nativeElement?.firstChild?.querySelector&& this['progressCircle'+i]?.elRef?.nativeElement?.firstChild?.querySelector('text').children[0]){
          clearInterval(check[i])
          this['progressCircle'+i]?.elRef.nativeElement.firstChild?.style.setProperty('margin-top', progressCirclesOffset.margin);
          this['progressCircle'+i]?.elRef.nativeElement.firstChild?.style.setProperty('margin-bottom', progressCirclesOffset.marginBottom);

          setTimeout(() => {
            const tspanElements:any = document.querySelectorAll('tspan');
            let countSpans = 0
            tspanElements.forEach((tspan:any, index:number) => {
              countSpans++
              if(!only || (only && (countSpans === only || countSpans === only+1))){
                tspan.setAttribute('y', progressCirclesOffset.y); // Verhoog met 10
              }
            });            
          }, 10);
          setTimeout(() => {
            const tspanElements:any = document.querySelectorAll('tspan');
            let countSpans = 0
            tspanElements.forEach((tspan:any, index:number) => {
              countSpans++
              if(!only || (only && (countSpans === only || countSpans === only+1))){
                tspan.setAttribute('y', progressCirclesOffset.y); // Verhoog met 10
              }
            });            
          }, 100);
          setTimeout(() => {
            const tspanElements:any = document.querySelectorAll('tspan');
            let countSpans = 0
            tspanElements.forEach((tspan:any, index:number) => {
              countSpans++
              if(!only || (only && (countSpans === only || countSpans === only+1))){
                tspan.setAttribute('y', progressCirclesOffset.y); // Verhoog met 10
              }
            });            
          }, 200);
          setTimeout(() => {
            const tspanElements:any = document.querySelectorAll('tspan');
            let countSpans = 0
            tspanElements.forEach((tspan:any, index:number) => {
              countSpans++
              if(!only || (only && (countSpans === only || countSpans === only+1))){
                tspan.setAttribute('y', progressCirclesOffset.y); // Verhoog met 10
              }
            });            
          }, 500);

        }

        if( this['progressCircle'+i+'Mobile']?.elRef?.nativeElement?.firstChild?.querySelector && this['progressCircle'+i+'Mobile']?.elRef?.nativeElement?.firstChild?.querySelector('text').children[0]){
          clearInterval(check[i])
          this['progressCircle'+i+'Mobile']?.elRef.nativeElement.firstChild?.style.setProperty('margin-top', progressCirclesOffset.margin);
          this['progressCircle'+i+'Mobile']?.elRef.nativeElement.firstChild?.style.setProperty('margin-bottom', progressCirclesOffset.marginBottom);

          setTimeout(() => {
            const tspanElements:any = document.querySelectorAll('tspan');
            let countSpans = 0
            tspanElements.forEach((tspan:any, index:number) => {
              countSpans++
              if(!only || (only && (countSpans === only || countSpans === only+1))){
                tspan.setAttribute('y', progressCirclesOffset.y); // Verhoog met 10
              }
            });            
          }, 10);
          setTimeout(() => {
            const tspanElements:any = document.querySelectorAll('tspan');
            let countSpans = 0
            tspanElements.forEach((tspan:any, index:number) => {
              countSpans++
              if(!only || (only && (countSpans === only || countSpans === only+1))){
                tspan.setAttribute('y', progressCirclesOffset.y); // Verhoog met 10
              }
            });            
          }, 100);
          setTimeout(() => {
            const tspanElements:any = document.querySelectorAll('tspan');
            let countSpans = 0
            tspanElements.forEach((tspan:any, index:number) => {
              countSpans++
              if(!only || (only && (countSpans === only || countSpans === only+1))){
                tspan.setAttribute('y', progressCirclesOffset.y); // Verhoog met 10
              }
            });            
          }, 200);
          setTimeout(() => {
            const tspanElements:any = document.querySelectorAll('tspan');
            let countSpans = 0
            tspanElements.forEach((tspan:any, index:number) => {
              countSpans++
              if(only && (countSpans === only || countSpans === only+1)){
                tspan.setAttribute('y', progressCirclesOffset.y); // Verhoog met 10
              }
            });            
          }, 500);

        }

      }, 20);
    }
  }

  selectCategory(category:any){
    if(this.activeCategory === category){
      this.activeCategory = null
    }
    else{
      this.activeCategory = category
    }
  }

  selectConversation(conversation:any){
    if(this.selectedConversation === conversation){
      this.selectedConversation = null
    }
    else{
      this.selectedConversation = conversation
    }
  }

  startConversation(caseItem:any,event?:any){
    if(event){
      event.preventDefault()
      event.stopPropagation()
    }
    // console.log('start conversation',caseItem)
    if(caseItem.translation){
      caseItem.role = caseItem.translation.role
      if(caseItem.translation.free_question){
        caseItem.free_question = caseItem.translation.free_question
      }
      if(caseItem.translation.free_question2){
        caseItem.free_question2 = caseItem.translation.free_question2
      }
      if(caseItem.translation.free_question3){
        caseItem.free_question3 = caseItem.translation.free_question3
      }
      if(caseItem.translation.free_question4){
        caseItem.free_question4 = caseItem.translation.free_question4
      }
    }
    this.modalService.showConversationStart(caseItem).then((res)=>{
      // console.log(res)
      if(res){
        localStorage.setItem('activatedCase',caseItem.id)
        localStorage.setItem('personalCase',JSON.stringify(caseItem))
        this.nav.go('conversation/'+caseItem.id)
      }
    })

  }
  
  continueConversation(conversation:any){
    localStorage.setItem('continueConversation',"true")
    localStorage.setItem('conversation',JSON.stringify(conversation))
    this.nav.go('conversation/'+conversation.caseId)
  }

  showCaseInfo(caseItem:any, logo?:string,training?:any){
    // console.log('show case info',caseItem)
    if(logo){
      caseItem.logo = logo
    }
    if(training){
      if(caseItem.publishType!='elearning'){
        caseItem.trainingId = training.id
      }
      caseItem.trainerId =  training.trainerId || training.trainer_id
    }
    this.modalService.showCaseInfo(caseItem, (response:any)=>{
      // console.log('case info response',response)
      if(response.data == 'read'){
        // Mark the case as read
        this.selectTrainingItem(caseItem);
        this.scrollItemsToTop()
      }
    })
  }
  // get activeConversation():any{
  //   let conversation:any = null
  //   this.conversations$.forEach((e:any) => {
  //     for(let i = 0; i < e.length; i++){
  //       if(!e[i].closed){
  //         conversation = e[i]
  //       }
  //     }
  //   })
  //   return conversation
  // }

    showTrainerInfo(trainerInfo:any, event:any){
      console.log('show trainer info',trainerInfo)  
    if(event){
      event.stopPropagation();
      event.preventDefault();
    }
    if(!trainerInfo){
      return;
    }

    this.modalService.showTrainerInfo(trainerInfo.trainer ? trainerInfo.trainer : trainerInfo, (response:any)=>{})
  }

  isActiveConversation(conversation:any):boolean{
    let active = false
    this.conversations$.forEach((e:any) => {
      for(let i = 0; i < e.length; i++){
        if(e[i].caseId == conversation.id && !e[i].closed){
          // console.log('active conversation',e[i])
          active = true
        }
      }
    })
    return active
  }

  continueConversationFrom(item: any) {
  this.conversations$.subscribe((conversations:any) => {
    for (let conv of conversations) {
      if (conv.caseId === item.id && !conv.closed) {
        this.conversationService.originUrl = location.pathname.substring(1);
        this.continueConversation(conv);
        return;
      }
    }
  });
}

  // getConversationToContinue(conversation:any):any{
  //   this.conversations$.forEach((e:any) => {
  //     for(let i = 0; i < e.length; i++){
  //       console.log('check conversation',e[i],conversation)
  //       if(e[i].caseId == conversation.id && !e[i].closed){
  //         console.log('found conversation to continue',e[i])
  //         return e[i]
  //       }
  //     }
  //   })
  // }

  get activeConversationsIds():any{
    let conversations:any = []
    this.conversations$.forEach((e:any) => {
      for(let i = 0; i < e.length; i++){
        if(!e[i].closed){
          conversations.push(e[i].conversationId)
        }
      }
    })
    return conversations
  }

  get activeConversations():any{
    let conversations:any[] = []
    this.conversations$.forEach((e:any) => {
      for(let i = 0; i < e.length; i++){
        if(!e[i].closed){
          conversations.push(e[i])
        }
      }
    })
    return conversations
  }

  get closedConversations():any{
    let conversations:any[] = []
    this.conversations$.forEach((e:any) => {
      for(let i = 0; i < e.length; i++){
        if(e[i].closed){
          conversations.push(e[i])
        }
      }
    })
    return conversations
  }

  get activeConversationsCaseIds():any{
    let caseIds:any = []
    this.activeConversations.forEach((e:any) => {
      caseIds.push(e.caseId)
    })
    return caseIds
  }
  
  activeThemes(conversation:string):any{
    let themes:any = []
    let themeIds:any = []
    this.cases.all.forEach((e:any) => {
       if(themeIds.indexOf(e.theme) === -1 && e.conversation === conversation){
        themeIds.push(e.theme)
        themes.push(this.infoService.getTheme(e.theme))
       }
    })
    return themes
  }

  get activeCategories():any{
    let cats:any = []
    let catIds:any = []
    this.cases.all.forEach((e:any) => {
       if(catIds.indexOf(e.conversation) === -1){
        catIds.push(e.conversation)
        cats.push(e.conversation)
       }
    })
    return cats
  }

  themeInPreferences(themeId:string):boolean{
    let found = false
    if(!this.auth?.userInfo?.preferences){
      return false
    }
    for(let key in this.auth.userInfo.preferences.themes){
      if(key === themeId && this.auth.userInfo.preferences.themes[key]){
        found = true
      }
    }
    return found
  }

  removeActiveConversation(event:Event,activeConversation:any){
    event.stopPropagation()
    this.modalService.showConfirmation(this.translate.instant('page_account.delete_cases_confirm')).then((res)=>{
      if(res){
        this.firestore.deleteSub('users',this.auth.userInfo.uid,'conversations',activeConversation.conversationId)
      }
    })
  }

  subscribeCourse(course:any){
    console.log(course)
    this.nav.go('enlist/'+course.id)
  }

  // sendTestMail(){
  //   this.firestore.create('emailsToProcess',
  //     {
  //       to: 'trainer@innovatieman.nl',
  //       template: 'welcome',
  //       data:{
  //         name: 'Marky',
  //       },
  //       language: 'nl'
  //     },()=>{
  //       console.log('mail sent')
  //     }
  //   )
  // }



  get currentFilterTypes() {
    return this.filterTypes();
  }
  get currentFilterLevels() {
    return this.filterLevels();
  }

  get filterIsEmpty() {
    return this.currentFilterTypes.types.length === 0 && this.currentFilterTypes.subjects.length === 0;
  }
  get filterIsEmptyLevel() {
    return this.currentFilterLevels.length === 0;
  }

  clearFilter(){
    for(let i = 0; i < this.infoService.conversation_types.length; i++){
      this.infoService.conversation_types[i].selected = false
      for(let j = 0; j < this.infoService.conversation_types[i].subjects.length; j++){
        this.infoService.conversation_types[i].subjects[j].selected = false
      }
    }
    setTimeout(() => {
      this.updateVisibleCases();
    }, 100);
  }

  clearFiltersLevel(){
    for(let i = 0; i < this.levels.length; i++){
      this.levels[i].selected = false
    }
  }

  filterTypes() {
    let filter: any = {
      types: [],
      subjects: [],
      subjectTypes: {}
    };
    // console.log('filter types',this.infoService.conversation_types)
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

  toggleFilter(filter:any,value:any){
    if(this.extraFilters[filter].indexOf(value) > -1){
      this.extraFilters[filter].splice(this.extraFilters[filter].indexOf(value),1)
    }
    else{
      this.extraFilters[filter].push(value)
    }
  }
  filterActive(filter:any,value:any){
    return this.extraFilters[filter].indexOf(value) > -1
  }

  filterLevels(){
    let levels:any = []
    for(let i = 0; i < this.levels.length; i++){
      if(this.levels[i].selected){
        levels.push(this.levels[i].nr)
      }
    }
    return levels
  }

  check(event:any){
    event.preventDefault()
    event.stopPropagation()
  }

  progressCirclesOffset(){
   switch(this.media.screenSize){
      case 'xs':
        return {margin:'-80px',y:200,marginBottom:'-80px'}
      case 'sm':
        return {margin:'-60px',y:130,marginBottom:'-60px'}
      case 'md':
        return {margin:'-30px',y:115,marginBottom:'-35px'}
      case 'lg':
        return {margin:'-30px',y:115,marginBottom:'-45px'}
      case 'xl':
        return {margin:'-45px',y:115,marginBottom:'-45px'}
      default:
        return {margin:'-45px',y:115,marginBottom:'-45px'}
   }
  }


    caseSuggestions: any[] = [];
    updateCaseSuggestions(){
      this.caseSuggestions = [];
      const seed = this.helper.getDailySeed();
      let cases:any = JSON.parse(JSON.stringify(this.visibleCases));
      cases = cases.slice(0, 15);
      let caseSuggestions = this.helper.shuffleArrayDeterministic(cases, seed);

      if(this.visibleCases.length){
        // caseSuggestions = caseSuggestions.slice(0, 3 - (this.activeConversations.length > 2 ? 3 : this.activeConversations.length));
      }
      else{
        cases = JSON.parse(JSON.stringify(this.cases.all));
        cases = cases.sort((a:any, b:any) => a.order_rating - b.order_rating);
        cases = cases.slice(0, 15);
        caseSuggestions = this.helper.shuffleArrayDeterministic(cases, seed);
        // caseSuggestions = caseSuggestions.slice(0, 3 - (this.activeConversations.length > 2 ? 3 : this.activeConversations.length));
      }
      //| filterKey : '!id' : activeConversationsIds
      this.caseSuggestions = this.filterKeyPipe.transform(this.caseSuggestions, '!id', this.activeConversationsIds);
      this.cases.suggestions = JSON.parse(JSON.stringify(caseSuggestions));

    }
    showSuggestions:boolean = false;
    trackById(index: number, item: any) {
      return item?.id || index;
    }

    doNothing(){

    }
    showCreateSelf:boolean = false;
    updateVisibleCases() {
      // | caseFilter: currentFilterTypes.types : currentFilterTypes.subjectTypes : extraFilters.open_to_user | filterKey : 'level' : currentFilterLevels | filterSearch : searchTerm : false : ['title','tags']
      
      // console.log(this.cases.all)

      const filtered = this.caseFilterPipe.transform(
        this.cases.all,
        this.currentFilterTypes.types,
        this.currentFilterTypes.subjectTypes,
        // []
        this.extraFilters.open_to_user
      );
    
      let filteredTypes = []
      for(let i = 0; i < filtered.length; i++){
        if(!this.showCreateSelf){
          filteredTypes.push(filtered[i])
        }
        else if(this.showCreateSelf && filtered[i].create_self){
          filteredTypes.push(filtered[i])
        }
      }

      const searched = this.filterSearchPipe.transform(
        filteredTypes,
        this.searchTerm,
        false,
        ['title','tags','user_info','id']
      );
      const searchedLevels = this.filterKeyPipe.transform(
        searched,
        'level',
        this.filterLevels(),
      );
      
      // console.log('filtered')
      this.filteredCases = searchedLevels;
      this.filteredCases = this.filteredCases.sort((a, b) => a.order_rating - b.order_rating);
      this.visibleCases = this.filteredCases.slice(0, this.maxCases);
      if (this.infiniteScroll) {
        this.infiniteScroll.disabled = this.visibleCases.length >= this.filteredCases.length;
      }
      // setTimeout(() => {
      //   if (this.infiniteScroll) {
      //     console.log('update visible cases', this.visibleCases.length, this.filteredCases.length);
      //     this.infiniteScroll.disabled = this.visibleCases.length >= this.filteredCases.length;
      //   }
      // }, 400);

      // setTimeout(() => {
      //   if (this.infiniteScroll) {
      //     console.log('update visible cases', this.visibleCases.length, this.filteredCases.length);
      //     this.infiniteScroll.disabled = this.visibleCases.length >= this.filteredCases.length;
      //   }
      // }, 1000);

      // setTimeout(() => {
      //   if (this.infiniteScroll) {
      //     console.log('update visible cases', this.visibleCases.length, this.filteredCases.length);
      //     this.infiniteScroll.disabled = this.visibleCases.length >= this.filteredCases.length;
      //   }
      // }, 1500);
      this.updateCaseSuggestions();

    }

    loadMore(event?: any) {
      this.maxCases += 15;
      this.visibleCases = this.filteredCases.slice(0, this.maxCases);
    
      if (event) {
        event.target.complete();
      }
    
      if (this.maxCases >= this.filteredCases.length && event) {
        event.target.disabled = true;
      }
    }

    onFiltersChanged() {
      this.maxCases = 15; // reset zichtbaar aantal
      setTimeout(() => {
        this.updateVisibleCases();
      }, 200);
    }
    onSearchChanged() {
      this.maxCases = 15;
      this.updateVisibleCases();
    }

  
    selectModule(module:any,organisation?:boolean){
      let countCheck = 0
      let check = setInterval(() => {
        countCheck++
        if(countCheck > 100){
          clearInterval(check)
        }
        if(!organisation){
          
          if(this.auth.activeCourses.length > 0 || this.auth.myElearnings?.length > 0){
            clearInterval(check)
            this.selectedModule = this.auth.getActiveCourse(module)
          }
        }
        else{
          if(this.auth.mySelectedOrganisation?.id){
            clearInterval(check)
            this.selectedModule = this.auth.getActiveCourse(module,true)
            console.log('selected module',this.selectedModule)
          }
        }
      }, 100);
    }

    modulesBreadCrumbs:any[] = []
    trainingItem:any = null
    item_id:string | null = null
    selectSubModule(module:any){
      // console.log('select submodule',module)
      this.modulesBreadCrumbs.push(module)
    }

    selectTrainingItem(item:any,event?:Event,moveInModule?:boolean){
      if(event){
        event.preventDefault()
        event.stopPropagation()
      }
      // console.log('select item',item)
      this.trainingItem = ''
      setTimeout(() => {
        this.trainingItem = item
      }, 10);
      // this.scrollItemsToTop()
    }

    backBreadCrumbs(){
      if(this.modulesBreadCrumbs.length > 0){
        this.modulesBreadCrumbs.pop()
      }
      else{
        this.selectedModule = {}
        this.nav.go('start/'+this.showAll)
      }
    }

    scrollItemsToTop() {
      let chatDiv:any
      setTimeout(() => {
        chatDiv = document.getElementById('mainContent');
            chatDiv.scrollTop = 0;//chatDiv.scrollHeight;
      }, 50);
    }

    countActiveItems(items:any){
      if(!items || items.length == 0){
        return 0
      }
      let count = 0
      for(let i = 0; i < items.length; i++){
        if(this.itemAvailable(this.auth.getTrainingItem(this.selectedModule.id,items[i].id)) && !this.itemIsFinished(this.auth.getTrainingItem(this.selectedModule.id,items[i].id))){
          count++
        }
      }
      return count
    }

    currentItemIndex(){
      // return -1
      if(this.modulesBreadCrumbs?.length){
        // console.log('current item index',this.modulesBreadCrumbs,this.trainingItem)
        let items = this.modulesBreadCrumbs[this.modulesBreadCrumbs.length - 1].items
        return items.findIndex((i:any) => i.id === this.trainingItem.id);
      }
      if(this.selectedModule?.items){
        console.log('current item index',this.selectedModule,this.trainingItem)
        return this.selectedModule.items.findIndex((i:any) => i.id === this.trainingItem.id);
      }
      return -1
    }

    maxItemIndex(){
      if(this.modulesBreadCrumbs?.length){
        let items = this.modulesBreadCrumbs[this.modulesBreadCrumbs.length - 1].items
        return items.length - 1
      }
      if(this.selectedModule?.items){
        return this.selectedModule.items.length - 1
      }
      return -1
    }

    nextItem(){
      let currentIndex = this.currentItemIndex();
      let maxIndex = this.maxItemIndex();
      if(currentIndex > -1 && currentIndex < maxIndex){
        let nextIndex = currentIndex + 1
        let items = this.modulesBreadCrumbs?.length ? this.modulesBreadCrumbs[this.modulesBreadCrumbs.length - 1].items : this.selectedModule.items
        return this.auth.getTrainingItem(this.selectedModule.id,items[nextIndex].id,this.modulesBreadCrumbs,0,this.myOrganisationTraining())  
      }
      return null

    }

    myOrganisationTraining(){
      return location.pathname.indexOf('my_organisation') > -1
    }

    readInfoItem(organisation?:boolean,saveTrainingItem?:boolean){
      // console.log('read info item',this.selectedModule)
      let checked = false
      for(let i = 0; i < this.selectedModule.basics.used_items.length; i++){
        if(this.selectedModule.basics.used_items[i].id == this.trainingItem.id){
          checked = true
        }
      }
      if(!checked){
        this.selectedModule.basics.used_items.push({id:this.trainingItem.id,read:moment().unix()})
        if(!organisation){
          this.firestore.setSubSub('participant_trainings',this.auth.userInfo.email,'trainings',this.selectedModule.id,'items',this.trainingItem.id,{read:moment().unix()})
          .then((res)=>{
            console.log('read item',this.trainingItem.id)
            // this.auth.getActiveCourses(this.auth.userInfo.uid)
          })
        }
        else{
          this.firestore.setSubSub('participant_organisations',this.auth.userInfo.email,'organisations',this.auth.mySelectedOrganisation.id,'items',this.trainingItem.id,{read:moment().unix()})
          .then((res)=>{
            // this.auth.getMyOrganisations(this.auth.userInfo.uid,()=>{},true)
          })
        }
      }
      if(!saveTrainingItem){
        this.trainingItem = null
      }
    }

    itemIsFinished(item:any,organisation?:boolean){
      if(item.type=='infoItem'){
        if(this.auth.getActiveCourse(this.selectedModule.id,organisation)?.basics?.used_items){
          let items = this.auth.getActiveCourse(this.selectedModule.id,organisation).basics.used_items
          if(!items){
            items = []
          }
          for(let i = 0; i < items.length; i++){
            if(items[i].id == item.id && items[i].read){
              return true
            }
          }
        }
      }
      else if(item.type=='case'){
        let items = []
        if(this.auth.getActiveCourse(this.selectedModule.id,organisation)?.basics){
          items = this.auth.getActiveCourse(this.selectedModule.id,organisation).basics.used_items
        }
        if(!items){
          items = []
        }
        for(let i = 0; i < items.length; i++){
          if(items[i].id == item.id && items[i].closed){
            return true
          }
        }
      }
      return false
    }

    // nextItem(){
    //   console.log('read info item',this.selectedModule)
    //   if(this.selectedModule.module_type == 'game'){
    //     console.log(this.auth.getGameItemStatus(this.selectedModule.id,this.trainingItem.id))
    //     if(this.auth.getGameItemStatus(this.selectedModule.id,this.trainingItem.id).status != 'finished'){
    //       this.firestore.createSub('users',this.auth.userInfo.uid,'game_progress',{
    //         module_id:this.selectedModule.id,
    //         item_id:this.trainingItem.id,
    //         read:moment().unix(),
    //         status:'finished'
    //       })
    //     }
    //     else{
    //       console.log('item already finished')
    //     }
    //   }
    //   console.log('next item');
    // }

    itemAvailable(item:any){
      if(!item.available_date && !item.available_till){
        return true
      }
      if(item.available_date && moment(item.available_date).isAfter(moment())){
        return false
      }
      if(item.available_till && item.available_till < moment().format('YYYY-MM-DD')){
        return false
      }
      return true;
    }

    gotoOrganisation(event?:any,organisationId?:any){
      if(event){
        event.preventDefault()
        event.stopPropagation()
      }
      if(!organisationId){
        this.nav.go('start/my_organisation/');this.onFiltersChanged();this.selectedModule={}
      }
      else{
        this.auth.mySelectedOrganisation = this.auth.organisationTrainings.find(org => org.id === organisationId);
        localStorage.setItem('organisationTrainingId', this.auth.mySelectedOrganisation.id);
        this.nav.go('start/my_organisation');this.onFiltersChanged();this.selectedModule={}
      }
    }

    shortMenu:any;
    async selectOrganisation(event?:any){
      if(event){
        event.preventDefault()
        event.stopPropagation()
      }
      let list = []
      console.log('select organisation',this.auth.organisationTrainings)
      for(let i=0;i<this.auth.organisationTrainings.length;i++){
        list.push({
          title:this.auth.organisationTrainings[i].name,
          icon:this.auth.organisationTrainings[i].logo ? '' :'faGripHorizontal',
          image:this.auth.organisationTrainings[i].logo ? this.auth.organisationTrainings[i].logo : '',
          id:this.auth.organisationTrainings[i].id,
          value:this.auth.organisationTrainings[i].id,
          logo:this.auth.organisationTrainings[i].logo !=undefined,
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
        // console.log(this.selectMenuservice.selectedItem)
        if(this.selectMenuservice.selectedItem){
          this.gotoOrganisation(event,this.selectMenuservice.selectedItem.id)
        }
      })
    }
    

    deleteConversation(event:any,conversation:any){
      event.stopPropagation()
      this.modalService.showConfirmation(this.translate.instant('page_account.delete_cases_confirm')).then((response)=>{
        if(response){
          this.firestore.deleteSub('users',this.auth.userInfo.uid, 'conversations',conversation.conversationId).then(()=>{
            this.toast.show(this.translate.instant('messages.deleted'))
          })
        }
      })
    }

    openClosedConversation(conversation:any,event?:any){
      if(event){
        event.stopPropagation()
      }
      localStorage.setItem('continueConversation',"true")
      localStorage.setItem('conversation',JSON.stringify(conversation))
      this.conversationService.originUrl = location.pathname.substring(1);
      this.nav.go('conversation/'+conversation.caseId)
    }


    nextConversation(conversation:any,event?:any){
      if(event){
        event.preventDefault()
        event.stopPropagation()
      }
      // console.log('next conversation',conversation)
      // console.log(this.cases.all)
      let caseItem:any = JSON.parse(JSON.stringify(conversation))
      caseItem.previousConversationId = conversation.conversationId
      delete caseItem.conversationId
      delete caseItem.rating
      delete caseItem.timestamp
      delete caseItem.closed
      delete caseItem.trainerId
      delete caseItem.trainer_id
      delete caseItem.trainingId
      delete caseItem.training_id
      let newTitle = caseItem.title
      let caseTitleArr = newTitle.split(' ')
      let nr = 2
      try{
        nr = parseInt(caseTitleArr[caseTitleArr.length-1])
        if(isNaN(nr)){
          nr = 2
          caseItem.title = newTitle + ' ' + (nr+'')
        }
        else{
          nr++
          caseItem.title = caseTitleArr.slice(0, -1).join(' ') + ' ' + (nr+'')
        }
      }catch(e){
        nr = 2
        caseItem.title = newTitle + ' ' + (nr+'')
      }

      if(caseItem.translation){
        caseItem.role = caseItem.translation.role
        if(caseItem.translation.free_question){
          caseItem.free_question = caseItem.translation.free_question
        }
        if(caseItem.translation.free_question2){
          caseItem.free_question2 = caseItem.translation.free_question2
        }
        if(caseItem.translation.free_question3){
          caseItem.free_question3 = caseItem.translation.free_question3
        }
        if(caseItem.translation.free_question4){
          caseItem.free_question4 = caseItem.translation.free_question4
        }  
      }

      let id = caseItem.caseId || caseItem.id;
      if(!caseItem.steadfastness){
        console.log(id)
        if(id){
          let findCase = this.cases.all.find((c:any) => c.id === id);
          console.log('find case',findCase)
          if(findCase && findCase.steadfastness){
            caseItem.steadfastness = findCase.steadfastness;
          }
        }
      }
      if(!caseItem.steadfastness){
        caseItem.steadfastness = 80
      }
      caseItem.id = id
      this.modalService.showConversationStart(caseItem).then((res:any)=>{
        console.log(res)
        if(res){
          localStorage.setItem('activatedCase',res.id)
          localStorage.setItem('personalCase',JSON.stringify(res))
          this.nav.go('conversation/'+res.id)
        }
      })
    
    }
  }
