import { ChangeDetectorRef, Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonInfiniteScroll } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { theme } from 'highcharts';
import { AuthService } from 'src/app/auth/auth.service';
import { CaseFilterPipe } from 'src/app/pipes/case-filter.pipe';
import { FilterKeyPipe } from 'src/app/pipes/filter-key.pipe';
import { FilterSearchPipe } from 'src/app/pipes/filter-search.pipe';
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


@Component({
  selector: 'app-start',
  templateUrl: './start.page.html',
  styleUrls: ['./start.page.scss'],
})
export class StartPage implements OnInit {
  @HostListener('window:resize', ['$event'])
    @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;
  
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
    private filterKeyPipe: FilterKeyPipe
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      if(params['tab']&&(params['tab'] == 'cases' || params['tab'] == 'modules')){
        this.showAll = params['tab']
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
        console.log('trigger tutorial')
        if(this.media.smallDevice){
          this.tutorial.triggerTutorial(location.pathname.substring(1),'onload_mobile')
        }
        else{
          this.tutorial.triggerTutorial(location.pathname.substring(1),'onload')
        }
      }, 1000);
    });

    this.conversations$ = this.auth.getConversations();
    this.auth.userInfo$.subscribe(userInfo => {
      if (userInfo) {
        // this.auth.getActiveCourses(this.auth.userInfo.uid)
        // this.auth.getPublicCourses()
        // this.levels[this.auth.userLevel-1].selected = true
      }
    });
    this.setupProgressCircles()

    this.cases.casesLoaded.subscribe((res)=>{
      this.updateVisibleCases();
    })
    this.nav.changeLang.subscribe((res)=>{
      // if(location.href.indexOf('start')>-1){
        location.reload()
      // }
    })
    // this.sendTestMail()
  }

  ngAfterViewInit(){
    this.updateVisibleCases();
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

        if( this['progressCircle'+i+'Mobile']?.elRef?.nativeElement?.firstChild.querySelector('text').children[0]){
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
    console.log('start conversation',caseItem)
    if(caseItem.translation){
      caseItem.role = caseItem.translation.role
      if(caseItem.translation.free_question){
        caseItem.free_question = caseItem.translation.free_question
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

  showCaseInfo(caseItem:any){
    this.modalService.showCaseInfo(caseItem)
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
      console.log(res)
      if(res){
        console.log('users',this.auth.userInfo.uid,'conversations',activeConversation.conversationId)
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
  //       to: 'test-3w79bed5p@srv1.mail-tester.com',
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

    updateVisibleCases() {
      // | caseFilter: currentFilterTypes.types : currentFilterTypes.subjectTypes : extraFilters.open_to_user | filterKey : 'level' : currentFilterLevels | filterSearch : searchTerm : false : ['title','tags']
      const filtered = this.caseFilterPipe.transform(
        this.cases.all,
        this.currentFilterTypes.types,
        this.currentFilterTypes.subjectTypes,
        this.extraFilters.open_to_user
      );
    
      const searched = this.filterSearchPipe.transform(
        filtered,
        this.searchTerm,
        false,
        ['title','tags','user_info']
      );
      console.log(this.filterLevels())
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
      setTimeout(() => {
        if (this.infiniteScroll) {
          this.infiniteScroll.disabled = this.visibleCases.length >= this.filteredCases.length;
        }
      }, 400);
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

}
