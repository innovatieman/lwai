import { ChangeDetectorRef, Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { theme } from 'highcharts';
import { AuthService } from 'src/app/auth/auth.service';
import { CasesService } from 'src/app/services/cases.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { InfoService } from 'src/app/services/info.service';
import { MediaService } from 'src/app/services/media.service';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';


@Component({
  selector: 'app-start',
  templateUrl: './start.page.html',
  styleUrls: ['./start.page.scss'],
})
export class StartPage implements OnInit {
  @HostListener('window:resize', ['$event'])
  @ViewChild('progressCircle1',{static:false}) progressCircle1: any;
  @ViewChild('progressCircle2',{static:false}) progressCircle2: any;
  @ViewChild('progressCircle3',{static:false}) progressCircle3: any;
  [x:string]:any
  onResize(){
    this.media.setScreenSize()
    this.rf.detectChanges()
  }
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
  constructor(
    public nav:NavService,
    public cases:CasesService,
    public auth:AuthService,
    public icon:IconsService,
    private modalService:ModalService,
    public infoService:InfoService,
    public media:MediaService,
    private rf:ChangeDetectorRef,
    private firestore:FirestoreService,
    public helper:HelpersService,
    public translate:TranslateService,
    private route: ActivatedRoute,
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      if(params['tab']&&(params['tab'] == 'cases' || params['tab'] == 'courses')){
        this.showAll = params['tab']
      }
      else{
        this.showAll = ''
      }
    });

    this.conversations$ = this.auth.getConversations();
    this.auth.userInfo$.subscribe(userInfo => {
      if (userInfo) {
        this.auth.getActiveCourses(this.auth.userInfo.uid)
        this.auth.getPublicCourses()
        this.levels[this.auth.userLevel-1].selected = true
      }
    });
    this.setupProgressCircles()
    // this.sendTestMail()
  }

  setupProgressCircles(){
    let count = 0
    let check:any = {}
    for(let i = 0; i<4;i++){
      check[i] = setInterval(()=>{
        count++
        if(count>500){
          clearInterval(check[i])
        }
        if( this['progressCircle'+i]?.elRef?.nativeElement?.firstChild.querySelector('text').children[0]){
          clearInterval(check[i])
          this['progressCircle'+i]?.elRef.nativeElement.firstChild?.style.setProperty('margin-top', '-50px');
          this['progressCircle'+i]?.elRef.nativeElement.firstChild?.style.setProperty('margin-bottom', '-50px');

          setTimeout(() => {
            const tspanElements:any = document.querySelectorAll('tspan');
            tspanElements.forEach((tspan:any, index:number) => {
                tspan.setAttribute('y', 125); // Verhoog met 10
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

  startConversation(caseItem:any){

    if(this.activeConversations.length>2){
      this.modalService.showText('Je kunt maximaal 3 gesprekken tegelijk voeren','Maximum bereikt',false,[],true,null,'',{textBorder:false}).then((res)=>{
        console.log(res)
      })
      return
      // this.modalService.showConfirmation('Weet je zeker dat je een nieuw gesprek wilt beginnen?<br>het lopende gesprek wordt dan verwijderd').then((res)=>{
      //   console.log(res)
      //   if(res){
      //     this.firestore.deleteSub('users',this.auth.userInfo.uid,'conversations',this.activeConversation.conversationId)
      //     localStorage.setItem('activatedCase',caseItem.id)
      //     localStorage.setItem('personalCase',JSON.stringify(caseItem))
      //     this.nav.go('conversation/'+this.selectedConversation+'/'+caseItem.id)
      //   }
      // })
      // return
    }
    else{
      this.modalService.showConversationStart(caseItem).then((res)=>{
        console.log(res)
        if(res){
          localStorage.setItem('activatedCase',caseItem.id)
          localStorage.setItem('personalCase',JSON.stringify(caseItem))
          this.nav.go('conversation/'+this.selectedConversation+'/'+caseItem.id)
        }
      })
    }
  }
  
  continueConversation(conversation:any){
    localStorage.setItem('continueConversation',"true")
    localStorage.setItem('conversation',JSON.stringify(conversation))
    this.nav.go('conversation/'+conversation.conversationType+'/'+conversation.caseId)
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
    this.modalService.showConfirmation('Are you sure you want to remove this conversation?').then((res)=>{
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

}
