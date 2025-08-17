import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { IonInfiniteScroll, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/auth/auth.service';
import { FilterKeyPipe } from 'src/app/pipes/filter-key.pipe';
import { FilterSearchPipe } from 'src/app/pipes/filter-search.pipe';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { InfoService } from 'src/app/services/info.service';
import { LevelsService } from 'src/app/services/levels.service';
import { MediaService } from 'src/app/services/media.service';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';
import { ToastService } from 'src/app/services/toast.service';
import { TrainerService } from 'src/app/services/trainer.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { DndDropEvent } from 'ngx-drag-drop';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { MenuPage } from 'src/app/components/menu/menu.page';
import { SelectMenuService } from 'src/app/services/select-menu.service';
import { ActivatedRoute } from '@angular/router';
import { tutorialService } from 'src/app/services/tutorial.service';
import * as moment from 'moment';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-trainings',
  templateUrl: './trainings.page.html',
  styleUrls: ['./trainings.page.scss'],
})

export class TrainingsPage implements OnInit {
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;
  @ViewChild(ElementRef) el1!: ElementRef;
  @ViewChild(ElementRef) el2!: ElementRef;
  @ViewChild('file') file!: ElementRef;
  @ViewChild('import_training') import_training!: ElementRef;
  [x: string]: any;
  maxItems = 15;
  searchTerm: string = '';
  filteredItems: any[] = [];
  visibleItems: any[] = [];
  connectedCases:any[] = []
  connectedInfoItems:any[] = []
  itemsLoaded:boolean = false;
  showPart:string = 'items';
  showTitleInfo:boolean = true;
  numberList:any = this.helpers.createNumberList(1,100)
  showImportOption:boolean = false
  trainingFilter:any = ['published']
  selectedTags:any[] = []
  extraCostOptions:any = {}
  showHtml:boolean = false
  private leave$ = new Subject<void>();

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
  
    trackByItem = (_: number, item: { id: string }) => item.id;

  constructor(
    public nav: NavService,
    public icon:IconsService,
    private firestore: FirestoreService,
    public trainerService:TrainerService,
    public media:MediaService,
    private toast:ToastService,
    public auth:AuthService,
    public modalService:ModalService,
    public translate:TranslateService,
    public infoService:InfoService,
    public helpers:HelpersService,
    private filterSearchPipe:FilterSearchPipe,
    private filterKeyPipe:FilterKeyPipe,
    public levelService:LevelsService,
    private functions:AngularFireFunctions,
    private popoverController:PopoverController,
    private selectMenuservice:SelectMenuService,
    private route:ActivatedRoute,
    private tutorial:tutorialService,
  ) { }

  ngOnInit() {
    

    // this.route.params.subscribe((params:any)=>{

    // })
      // this.getCourseData()
      
    
      
  }

  ionViewWillEnter(){
    this.extraCostOptions = {}
    this.auth.userInfo$.pipe(takeUntil(this.leave$)).subscribe(userInfo => {
      if (userInfo) {
        this.auth.hasActive('trainer').pipe(takeUntil(this.leave$)).subscribe((trainer)=>{
          if(trainer){

            this.trainerService.ensureLoadedForOrg(this.nav.activeOrganisationId,()=>{
              this.updateVisibleItems();
              // this.itemsLoaded = true
              this.route.params.subscribe((params:any)=>{
                if(params?.training_id){
                  this.selectTraining(this.trainerService.getTraining('',params.training_id))
                }
              })
            })

              // this.trainerService.loadTrainingsAndParticipants(()=>{
              //   // console.log('loadedTrainingsAndParticipants')
              //   // console.log(this.trainerService.trainings)
              //   this.updateVisibleItems();
              //   this.itemsLoaded = true
              //   this.route.params.subscribe((params:any)=>{
              //     if(params?.training_id){
              //       this.selectTraining(this.trainerService.getTraining('',params.training_id))
              //     }
              //   })
              // });
              // this.trainerService.ensureLoadedForOrg(this.nav.activeOrganisationId,()=>{
              //   this.updateVisibleItems();
              // })
              // this.trainerService.loadModules(()=>{})
              // this.trainerService.loadCases(()=>{})
              // this.trainerService.loadInfoItems(()=>{})
              
            // console.log('loadTrainingsAndParticipants') 
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
      this.trainerService.trainings = []
      this.updateVisibleItems();
      this.trainerService.ensureLoadedForOrg(this.nav.activeOrganisationId,()=>{
        this.updateVisibleItems();
      })
      // this.trainerService.loadTrainingsAndParticipants(()=>{
      //   // console.log('loadTrainingsAndParticipants2')  
      //   this.updateVisibleItems();
      //   this.trainerService.loadModules(()=>{})
      //   this.trainerService.loadCases(()=>{})
      //   this.trainerService.loadInfoItems(()=>{})
      // })
    })

    if(this.trainerService.trainingItem?.id){
      setTimeout(() => {
        if(this.trainerService.trainingItem.type == 'module'){
          //this.trainerService.trainingItem = JSON.parse(JSON.stringify(this.trainerService.getModule(this.trainerService.trainingItem.id)))
        }
        else{
          this.trainerService.trainingItem = JSON.parse(JSON.stringify(this.trainerService.getTraining(this.trainerService.trainingItem.id)))
        }
      }, 100);
    }
  }

  ionViewWillLeave() {
    console.log('TrainingsPage left');
    this.leave$.next();
    this.leave$.complete();
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

        let htmlBtn:any = document.querySelector('.ql-HTML');
        htmlBtn.innerHTML = 'HTML'
        htmlBtn.style.width = '50px'
        htmlBtn.addEventListener('click', (event:any)=> {
          this.showHtml = true 
        });
      },300)
    },100)
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

  get trainingId(){
    if(this.trainerService.breadCrumbs.length>0){
      return this.trainerService.breadCrumbs[0].item.id
    }
    return ''
  }

  // dropHandler(event: any) {
  //   if (event.dropEffect === 'move' && event.index !== undefined) {
  //     const draggedItem = event.data;
  //     const previousIndex = this.trainerService.trainingItem.items.findIndex((item: any) => item.id === draggedItem.id);
  //     const currentIndex = event.index;

  //     if (previousIndex !== -1 && previousIndex !== currentIndex) {
  //       this.trainerService.trainingItem.items.splice(previousIndex, 1);
  //       this.trainerService.trainingItem.items.splice(currentIndex, 0, draggedItem);
  //       // update order between items
  //       for(let i=0;i<this.trainerService.trainingItem.items.length;i++){
  //         this.trainerService.trainingItem.items[i].order = i
  //       }

  //       if(this.trainerService.trainingItem.type== 'module'){
  //         this.firestore.setSubSub('trainers',this.nav.activeOrganisationId,'trainings',this.trainerService.breadCrumbs[0].item.id,'items',this.trainerService.trainingItem.id,this.trainerService.trainingItem)
  //       }
  //       else{
  //         this.update('items',true,this.trainerService.trainingItem);
  //       }
  //     }
  //   }
  // }

    dropHandler(event: any) {
    if (event.dropEffect === 'move' && event.index !== undefined) {
      const dragged = event.data;
      const prev = this.trainerService.trainingItem.items.findIndex((x: any) => x.id === dragged.id);
      const curr = event.index;

      if (prev !== -1 && prev !== curr) {
        const arr = this.trainerService.trainingItem.items;
        arr.splice(prev, 1);
        arr.splice(curr, 0, dragged);
        arr.forEach((x: any, i: number) => x.order = i);

        // bewaar signature van de nieuwe lokale staat
        this.trainerService.rememberLocalOrder(this.trainerService.trainingItem.id, this.trainerService.trainingItem.items);

        this.update('items', true, this.trainerService.trainingItem); // enkel veld
      }
    }
  }


  backBreadCrumbs(){
    console.log('backBreadCrumbs',this.trainerService.breadCrumbs)
    if(this.trainerService.breadCrumbs.length > 0){
      this.trainerService.breadCrumbs.pop()
    }
    if(this.trainerService.breadCrumbs.length > 0){
      console.log('backBreadCrumbs2',this.trainerService.breadCrumbs)
      let item = JSON.parse(JSON.stringify(this.trainerService.breadCrumbs[this.trainerService.breadCrumbs.length-1]))
      console.log('item',item)
      this.trainerService.breadCrumbs.pop()
      this.selectTraining(item.item)
    }
    else{
      this.trainerService.moduleItem = {}
      this.trainerService.breadCrumbs = []
    }
  }

  selectTraining(training:any,clearBreadCrumbs?:boolean){
    // console.log('selectTraining',JSON.parse(JSON.stringify(training)))
    this.showPart = 'items'
    if(training.results && training.results.length){
      training.organizedResults = this.trainerService.organizeResults(training.results,training)
    }
    else{
      training.results = {
        by_user: {},
        by_case: {},
        summaries:[],
        users: [],
        cases: []
      }
    }
    // console.log('selectTraining',training)
    if(clearBreadCrumbs){
      this.trainerService.breadCrumbs = []
    }
    this.trainerService.trainingItem = training;
    this.trainerService.breadCrumbs.push({
      type: 'training',
      item: training,
    })
    // console.log('selectTraining',this.trainerService.trainingItem)
    // console.log('breadCrumbs',this.trainerService.breadCrumbs)
    this.reloadMenu();
  }

  reloadMenu(){
    setTimeout(() => {
      this.nav.reloadMenu.emit(true)
    }, 10);
  }

  drop(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.trainerService.trainingItem.items, event.previousIndex, event.currentIndex);
  }
  
  
  addTraining(){
    this.modalService.inputFields('Nieuwe training', 'Hoe heet de nieuwe training?', [
      {
        type: 'text',
        placeholder: 'Naam van de training',
        value: '',
        required: true,
      }
    ], (result: any) => {
      console.log(result)
      if (result.data) {
        let module = {
          title: result.data[0].value,
          created: Date.now(),
          status: 'concept',
          amount_participants:10,
          expected_conversations:3,
          amount_period:2,
          trainerId: this.nav.activeOrganisationId,
          items: [],
          type_credits:'unlimited',
          user_info: ''
        }
        this.firestore.createSub('trainers', this.nav.activeOrganisationId, 'trainings', module).then(async () => {
        this.connectedCases = []
        try {
          const found = await this.trainerService.waitForItem('training', module.created, 5000, 'created');
          this.trainerService.trainingItem = found;
          // …openen/navigeer of modal sluiten
        } catch (err) {
          // Graceful fallback: direct openen met lokale data
          this.trainerService.trainingItem = {}
          // this.trainerService.caseItem = { id: casus.id, ...casus };
        }

          // this.trainerService.loadTrainingsAndParticipants(()=>{
          //   this.connectedCases = []
          //   let item = this.trainerService.trainings.filter((e:any) => {
          //     return e.created === module.created
          //   })
          //   if(item.length){
          //     this.trainerService.trainingItem = item[0]
          //   }
          //   else{
          //     this.trainerService.trainingItem = {}
          //   }
          // })
        })
      }
    })
  }

  copyTraining(item?:any){
    this.toast.showLoader()
    if(!item){
      item = this.trainerService.breadCrumbs[0].item
    }
    let copy = JSON.parse(JSON.stringify(item))
    // console.log('copy',copy)
    let old_id = copy.id
    delete copy.id
    delete copy.created
    delete copy.participants
    delete copy.trainingItems
    delete copy.code_created
    delete copy.code
    delete copy.credits
    delete copy.results
    delete copy.organizedResults
    copy.created = Date.now()
    copy.title = copy.title + ' (copy)'
    copy.status = 'concept'
    this.firestore.createSub('trainers',this.nav.activeOrganisationId,'trainings',copy,(result:any)=>{
      if(result && result.id){
        // let oldItem = this.trainerService.getTraining(old_id)
        this.firestore.getSubSub('trainers',this.nav.activeOrganisationId,'trainings',old_id,'items').pipe(takeUntil(this.leave$)).subscribe((oldItems:any)=>{
          oldItems.forEach((allItem:any) => {
            let oldItem = allItem.payload.doc.data()
            this.firestore.setSubSub('trainers',this.nav.activeOrganisationId,'trainings',result.id,'items',allItem.payload.doc.id,oldItem)
          })
          setTimeout(async() => {
            try {
              const found = await this.trainerService.waitForItem('training', copy.created, 5000, 'created');
              this.selectTraining(found,true);
              this.filterWith('concept')
              this.updateVisibleItems()
              this.toast.hideLoader();
              // this.trainerService.trainingItem = found;
              // …openen/navigeer of modal sluiten
            } catch (err) {
              // Graceful fallback: direct openen met lokale data
              this.trainerService.trainingItem = {}
              this.filterWith('concept')
              this.updateVisibleItems()
              this.toast.hideLoader();
              // this.trainerService.caseItem = { id: casus.id, ...casus };
            }

            // this.trainerService.loadTrainingsAndParticipants(()=>{
            //   let trainings = this.trainerService.trainings.filter((e:any) => {
            //     return e.id === result.id
            //   })
            //   if(trainings.length){
            //     this.selectTraining(trainings[0],true)
            //   }
            //   else{
            //     this.trainerService.trainingItem = {}
            //   }
            //   // this.trainerService.breadCrumbs = []
            //   this.toast.hideLoader();
            //   this.filterWith('concept')
            //    this.updateVisibleItems()
            // })
          }, 1500);
          
        })
      }
      else{
        this.toast.show(this.translate.instant('error_messages.failure'),3000)
        this.toast.hideLoader()
      }

    })
  }


  deleteTraining(training:any){
    if(this.trainerService.breadCrumbs.length>0){
      training = this.trainerService.breadCrumbs[0].item
    }
    this.modalService.showConfirmation(this.translate.instant('confirmation_questions.delete')).then(async (result:any) => {
      if(result){
        this.firestore.deleteSub('trainers',this.nav.activeOrganisationId,'trainings',training.id).then(()=>{
          this.trainerService.trainingItem = {}
          this.trainerService.breadCrumbs = []
          this.showPart = 'items'
          this.updateVisibleItems();

          // this.trainerService.loadTrainings(()=>{
          // })
        })
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
    // <!-- <ion-col [size]="helpers.cardSizeSmall" *ngFor="let caseItem of cases | caseFilter: currentFilterTypes.types : currentFilterTypes.subjectTypes : extraFilters.open_to_user | filterSearch : searchTerm : false : ['title']"> -->

    // const filtered = this.caseFilterPipe.transform(
    //   this.trainerService.cases,
    //   this.currentFilterTypes.types,
    //   this.currentFilterTypes.subjectTypes,
    //   this.extraFilters.open_to_user
    // );
  
    const searched = this.filterSearchPipe.transform(
      this.trainerService.trainings,
      this.searchTerm,
      false,
      ['title','user_info','tags']
    );
  
    const extraFiltered2 = this.filterKeyPipe.transform(
      searched,
      'status',
      this.trainingFilter
    );

    const extraFiltered3 = this.filterKeyPipe.transform(
      extraFiltered2,
      'tags',
      this.selectedTags
    );

    // const extraFiltered3 = this.filterKeyPipe.transform(
    //   extraFiltered2,
    //   'free_question',
    //   this.extraFilters.photo
    // );

    this.filteredItems = extraFiltered3;
    // this.filteredCases = this.filteredCases.sort((a, b) => a.order_rating - b.order_rating);
    this.visibleItems = this.filteredItems.slice(0, this.maxItems);
    if (this.infiniteScroll) {
      this.infiniteScroll.disabled = this.visibleItems.length >= this.filteredItems.length;
    }
    setTimeout(() => {
      // console.log('disabled: ', this.visibleCases.length >= this.filteredCases.length)
      this.infiniteScroll.disabled = this.visibleItems.length >= this.filteredItems.length;
    }, 400);
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

  showFieldsStatus(part:string,event:Event){
    if(event){
      event.stopPropagation()
    }
    this.modalService.showText(this.moduleReadyInfo(part),this.translate.instant('error_messages.not_complete'))
  }

  moduleReadyInfo(part:string){
    let text = ''//this.translate.instant('cases.check_incomplete')
    let fields = []
    switch(part){
      case 'title':
        if(!this.trainerService.trainingItem?.title){
          fields.push(this.translate.instant('cases.title'))
        }
        if(!this.trainerService.trainingItem?.user_info){
          fields.push(this.translate.instant('cases.short_info'))
        }
        if(!this.trainerService.trainingItem?.photo){
          fields.push(this.translate.instant('cases.photo'))
        }
        text = text + this.translate.instant('cases.check_incomplete') + '<ul>'
        for(let i=0;i<fields.length;i++){
          text = text + '<li>' + fields[i] + '</li>'
        }
        text = text + '</ul>'

        return text

      case 'content':
        if(!this.trainerService.trainingItem?.items?.length){
          // if(text.length){
          //   text = text + '<br><br>'
          // }
          text = text + this.translate.instant('trainings.no_connected_items')
        }
        return text
    }
    return ''
  }
  
  moduleReady(part:string){
    let check = false
    switch(part){
      case 'title':
        check = this.trainerService.trainingItem?.title && this.trainerService.trainingItem?.user_info && this.trainerService.trainingItem?.photo
        break;
      case 'content':
        check = this.trainerService.trainingItem?.items?.length>0
        break
      default:
        check = false
    }
    return check
  }

  shortMenu:any
  onRightClick(event:Event,item:any){
    event.preventDefault()
    event.stopPropagation()
    let list = [
      {
        title:this.translate.instant('trainings.edit_training_long'),
        icon:'faEdit',
        value:'edit'
      },
      {
        title:this.translate.instant('trainings.copy_training'),
        icon:'faCopy',
        value:'copy'
      },
      {
        title:this.translate.instant('trainings.delete_training'),
        icon:'faTrashAlt',
        value:'delete'
      },
      {
        title:this.translate.instant('cases.check_example'),
        icon:'faEye',
        value:'view'
      },
      {
        title:this.translate.instant('trainings.export'),
        icon:'faFileExport',
        value:'export'
      },
    ]
    this.showshortMenu(event,list,(result:any)=>{
      if(result?.value){
        switch(result.value){
          case 'edit':
            this.selectTraining(item)
            break;
          case 'delete':
            this.deleteTraining(item)
            break;
          case 'copy':
            this.copyTraining(item)
            break;
          case 'view':
            this.example(item)
            break;
          case 'export':
            if(!this.trainerService.checkIsTrainerPro()){
                return
            }
            this.exportTraining(item)
            break;
        }
      }
      this.selectMenuservice.selectedItem = undefined
    })
  }

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

  update(field?:string,isArray:boolean = false,trainingItem?:any){
    if(!trainingItem?.id){
      trainingItem = this.trainerService.trainingItem
    }
    if(this.trainerService.breadCrumbs[0].item){
      trainingItem = this.trainerService.breadCrumbs[0].item
    }
    // console.log('update',field,trainingItem)
    const scrollPosition = window.scrollY;
    if(field){
      // console.log('update field',this.nav.activeOrganisationId,field,trainingItem)
      this.firestore.setSub('trainers',this.nav.activeOrganisationId,'trainings',trainingItem.id,trainingItem[field],field,()=>{
          // console.log('breadCrumbs length',this.trainerService.breadCrumbs.length)

        setTimeout(() => {
          window.scrollTo(0, scrollPosition);
        }, 100);
      },isArray)

      if(trainingItem.status=='published' && trainingItem.publishType == 'elearning'){
        console.log('adjustElearning',field,trainingItem[field])
        this.functions.httpsCallable('adjustElearning')({
          elearningId: trainingItem.id,
          trainerId: this.nav.activeOrganisationId,
          updates: {
            [field]: trainingItem[field]
          }
        }).pipe(takeUntil(this.leave$)).subscribe((res:any)=>{
          console.log('adjustElearning response',res)
        });
      }
    }
  }


  moduleNotReady(){
    let check = 
      this.trainerService.trainingItem?.title == '' || 
      this.trainerService.trainingItem?.user_info == '' ||
      this.trainerService.trainingItem?.photo == ''

      return check
  }

  async selectAvatar(event:Event){
    this.media.selectAvatar(event,(res:any)=>{
      console.log(res)
      if(res?.status==200&&res?.result.url){
        this.trainerService.trainingItem.photo = res.result.url
        this.changeItem(this.trainerService.breadCrumbs[0].item.items, this.trainerService.trainingItem.id,'photo',this.trainerService.trainingItem.photo)
        this.update('photo')
        this.update('items',true)
      }
      else if(res=='delete'){
        this.trainerService.trainingItem.photo = ''
        this.changeItem(this.trainerService.breadCrumbs[0].item.items, this.trainerService.trainingItem.id,'photo',this.trainerService.trainingItem.photo)
        this.update('photo')
         this.update('items',true)
      }
      else if(res.type=='library'){
        this.changeItem(this.trainerService.breadCrumbs[0].item.items, this.trainerService.trainingItem.id,'photo',this.trainerService.trainingItem.photo)
        this.trainerService.trainingItem.photo = res.url
        this.update('photo')
         this.update('items',true)
      }
      else if(res=='download'){
        this.nav.goto(this.trainerService.trainingItem.photo,true)
      }
      else if(res=='generate'){
        if(!this.trainerService.checkIsTrainerPro()){
            return
        }
        this.createPhoto(this.trainerService.infoItem)
      }
    },true,true)
  }

  async createPhoto(moduleItem:any){
    // console.log(caseItem)


    let fields = [
      {
        type: 'textarea',
        title: 'Input',
        value: this.translate.instant('cases.generate_photo_standard_input'),
        required: true,
      },
      {
        type: 'textarea',
        title: 'Extra instructions',
        value: this.translate.instant('cases.generate_photo_standard_instructions')
      }
    ]

    if(localStorage.getItem('generated_photo_input')){
      fields[0].value = localStorage.getItem('generated_photo_input') || ''
    }

    if(localStorage.getItem('generated_photo_instructions')!== null && localStorage.getItem('generated_photo_instructions') !== undefined){
      fields[1].value = localStorage.getItem('generated_photo_instructions') || ''
    }

    this.modalService.inputFields(this.translate.instant('cases.generate_photo_standard_title'), this.translate.instant('cases.generate_photo_standard_info'), fields, async (result: any) => {
        if (result.data) {

          localStorage.setItem('generated_photo_input', result.data[0].value);
          localStorage.setItem('generated_photo_instructions', result.data[1].value);

          // setTimeout(async () => {
          let prompt = result.data[0].value + '\n' + result.data[1].value
            console.log(prompt)
            this.toast.showLoader()

            let url = 'https://europe-west1-lwai-3bac8.cloudfunctions.net/generateAndStoreImageRunway'
            
            let obj:any = {
              "userId": this.nav.activeOrganisationId,
              "size": "1024x1024",
              prompt:prompt || '',
              akool: false,
              noPadding: true
            }
        
            const response = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(obj),
            });
            if (!response.ok) {
              console.error("Request failed:", response.status, response.statusText);
              return;
            }
            const responseData = await response.json();
            if(responseData?.imageURL){
              this.trainerService.trainingItem.photo = responseData.imageURL
              this.changeItem(this.trainerService.breadCrumbs[0].item.items, this.trainerService.trainingItem.id,'photo',this.trainerService.trainingItem.photo)
              this.update('photo')
              this.update('items',true)
            }
              console.log('hiding loader')
              this.toast.hideLoader()
            // }, 2000);

        }
      },{buttons:[{action:'standards_generate_photo',title:this.translate.instant('cases.generate_instructions_original'),color:'dark',fill:'outline'}]});

  }

  async addItemToModule(event:any){
    // console.log(this.trainerService.breadCrumbs)
    // console.log(this.trainerService.trainingItem)
    let options:any[] = [
      {
        title:this.translate.instant('standards.cases'),
        icon:'faUser',
        id:'cases',
      },
      {
        title:this.translate.instant('standards.info_items'),
        icon:'faInfoCircle',
        id:'infoItems',
      },
      {
        title:this.translate.instant('standards.modules'),
        icon:'faTh',
        id:'modules',
      },
    ]

    this.shortMenu = await this.popoverController.create({
      component: MenuPage,
      componentProps:{
        customMenu:true,
        pages:options,
        listShape:true
      },
      cssClass: 'customMenu',
      event: event,
      translucent: false,
    });
    this.shortMenu.shadowRoot.lastChild.lastChild['style'].cssText = 'border-radius: 24px !important;';

    await this.shortMenu.present()
    await this.shortMenu.onWillDismiss();


    if(this.selectMenuservice.selectedItem){

      let list:any[] =[]
      if(this.selectMenuservice.selectedItem.id == 'modules'){
        list = JSON.parse(JSON.stringify(this.trainerService.modules))
        if(this.trainerService.breadCrumbs.length>0){
          for(let i=0;i<this.trainerService.breadCrumbs.length;i++){
            if(this.trainerService.breadCrumbs[i].item){
              list = list.filter((e:any) => {
                return e.id !== this.trainerService.breadCrumbs[i].item.id
              })
              list = list.filter((e:any) => {
                return e.id !== this.trainerService.breadCrumbs[i].item.moduleId
              })
            }
          }
          
        }
        list = list.sort((a:any,b:any) => {
          return a.title.localeCompare(b.title)
        })
      }
      else if(this.selectMenuservice.selectedItem.id == 'cases'){
        list = this.trainerService.cases
        list = list.sort((a:any,b:any) => {
          return a.title.localeCompare(b.title)
        })
      }
      else if(this.selectMenuservice.selectedItem.id == 'infoItems'){
        list = this.trainerService.infoItems
        list = list.sort((a:any,b:any) => {
          return a.title.localeCompare(b.title)
        })
      }
      if(!list.length){
        this.toast.show(this.translate.instant('modules.no_available_items'))
        return
      }
      this.modalService.selectItem(this.translate.instant('buttons.select'), list, async (result: any) => {

        if (result.data) {
          // console.log('breadCrumbs length',this.trainerService.breadCrumbs.length)
          if(this.selectMenuservice.selectedItem.id == 'modules'){
            for(let i=0;i<result.data.length;i++){
              if(this.trainerService.checkForLoopModules(result.data[i],[this.trainerService.trainingItem.id])){
                this.toast.show(this.translate.instant('modules.cannot_add_module_to_itself'))
                return
              }
              let newItem:any = await this.copyItemsToTraining(result.data[i], true)
              // console.log('newItem',newItem.id)
              newItem.type = 'module'
              newItem.order = 999
              // newItem.id  = (Date.now() + Math.floor(Math.random() * 1000)) + ''
              // console.log('breadCrumbs length',this.trainerService.breadCrumbs.length)

              if(this.trainerService.breadCrumbs.length>1){
                this.addItemToModuleById(this.trainerService.breadCrumbs[0].item, this.trainerService.breadCrumbs[this.trainerService.breadCrumbs.length-1].item.id,newItem)
                this.update('items',true)
              }
              else{
                this.trainerService.trainingItem.items.push(newItem)
                this.update('items',true)
              }



              // let items = this.trainerService.breadCrumbs[this.trainerService.breadCrumbs.length-1].item.items
              // items.push(newItem)
              // if(this.trainerService.breadCrumbs.length>1){
              //   this.firestore.updateSubSub('trainers',this.nav.activeOrganisationId,'trainings',this.trainerService.trainingItem.id,'items',this.trainerService.breadCrumbs[this.trainerService.breadCrumbs.length-1].item.id,{items:items})
              // }
              // else{
              //   this.trainerService.trainingItem.items.push(newItem)
              //   this.update('items',true)
              // }
            }
          }
          else if(this.selectMenuservice.selectedItem.id == 'cases' || this.selectMenuservice.selectedItem.id == 'infoItems'){
            for(let i=0;i<result.data.length;i++){
              this.firestore.createSubSub('trainers',this.nav.activeOrganisationId,'trainings',this.trainerService.breadCrumbs[0].item.id,'items',result.data[i],(response:any)=>{
                this.firestore.updateSubSub('trainers',this.nav.activeOrganisationId,'trainings',this.trainerService.breadCrumbs[0].item.id,'items',response.id,{id:response.id})
                // console.log('response',this.trainerService.breadCrumbs[0])
                if(this.trainerService.breadCrumbs[0].item.status == 'published' && this.trainerService.breadCrumbs[0].item.publishType == 'elearning'){
                  let newItem:any = JSON.parse(JSON.stringify(result.data[i]))
                  newItem.id = response.id
                  this.functions.httpsCallable('adjustElearning')({
                    elearningId: this.trainerService.breadCrumbs[0].item.id,
                    trainerId: this.nav.activeOrganisationId,
                    items: [newItem]
                  }).pipe(takeUntil(this.leave$)).subscribe((res:any)=>{
                    // console.log('adjustElearning response',res)
                  });
                }
                // this.trainerService.breadCrumbs = JSON.parse(JSON.stringify(breadCrumbs))
                // console.log('breadCrumbs length',this.trainerService.breadCrumbs.length)

                if(this.trainerService.breadCrumbs.length>1){
                  let newItem:any = {
                    type: this.selectMenuservice.selectedItem.id.substring(0, this.selectMenuservice.selectedItem.id.length - 1),
                    title: result.data[i].title,
                    created: result.data[i].created,
                    id: response.id,
                    order:999,
                  }
                  this.addItemToModuleById(this.trainerService.breadCrumbs[0].item, this.trainerService.breadCrumbs[this.trainerService.breadCrumbs.length-1].item.id,newItem)
                  this.update('items',true)
                  // this.trainerService.trainingItem.items.push({
                  //   type: 'case',
                  //   title: result.data[i].title,
                  //   created: result.data[i].created,
                  //   id: response.id,
                  //   order:999,
                  // })
                }
                else{
                  this.trainerService.trainingItem.items.push({
                    type: this.selectMenuservice.selectedItem.id.substring(0, this.selectMenuservice.selectedItem.id.length - 1),
                    title: result.data[i].title,
                    created: result.data[i].created,
                    id: response.id,
                    order:999,
                  })
                  this.update('items',true)
                }
              })
              
              // for(let j=0;j<this.trainerService.cases.length;j++){
                //   if(this.trainerService.cases[j].id == result.data[i].id){
                  //     this.trainerService.cases[j].modules.push(this.trainerService.trainingItem.id)
                  //     this.firestore.setSub('trainers',this.nav.activeOrganisationId,'cases',result.data[i].id,this.trainerService.cases[j].modules,'modules',null,true)
                  //   }
                  // }
            }
          }

          // this.update('items',true)
        }
      }, undefined, 'Items',{multiple:true,object:true,field:'title'})
    }
  }

  // async copyItemsToTraining(module:any){
  //   if(module.items && module.items.length){
  //     for(let i=0;i<module.items.length;i++){
  //       let item = module.items[i]
  //       if(item.type == 'case'){
  //         item = this.trainerService.getCase(item.id)
  //         item.type='case'
  //         for(let key in item){
  //           if(item[key]==undefined){
  //             item[key] = ''
  //           }
  //         }
  //         this.firestore.createSubSub('trainers',this.nav.activeOrganisationId,'trainings',this.trainerService.trainingItem.id,'items',item).then((res:any)=>{
  //           this.firestore.updateSubSub('trainers',this.nav.activeOrganisationId,'trainings',this.trainerService.trainingItem.id,'items',res.id,{id:res.id})
  //           module.items
  //         })
  //       }
  //       else if(item.type == 'infoItem'){
  //         item = this.trainerService.getInfoItem(item.id)
  //         item.type='infoItem'
  //         for(let key in item){
  //           if(item[key]==undefined){
  //             item[key] = ''
  //           }
  //         }
  //         this.firestore.createSubSub('trainers',this.nav.activeOrganisationId,'trainings',this.trainerService.trainingItem.id,'items',item).then((res:any)=>{
  //           this.firestore.updateSubSub('trainers',this.nav.activeOrganisationId,'trainings',this.trainerService.trainingItem.id,'items',res.id,{id:res.id})
  //         })
  //       }
  //       else if(item.type == 'module'){
  //         this.firestore.createSubSub('trainers',this.nav.activeOrganisationId,'trainings',this.trainerService.trainingItem.id,'items',item).then((res:any)=>{
  //           this.firestore.updateSubSub('trainers',this.nav.activeOrganisationId,'trainings',this.trainerService.trainingItem.id,'items',res.id,{id:res.id})
  //           if(item.items?.length){
  //             this.copyItemsToTraining(item)
  //           }
  //         })
  //       }
  //     }
  //   }
  // }

addItemToModuleById(module: any, targetId: string, newItem: any): boolean {
  // Als dit de gezochte module is
  // console.log('addItemToModuleById',module,targetId,newItem)
  if (module.id === targetId) {
    if (!module.items) module.items = [];
    module.items.push(newItem);
    return true; // gevonden en toegevoegd
  }
  console.log('addItemToModuleById2',module.id,targetId,newItem)
  // Als deze module zelf items heeft, zoek daarin verder
  if (module.items && Array.isArray(module.items)) {
    for (let item of module.items) {
      if (item.type === 'module') {
        const added = this.addItemToModuleById(item, targetId, newItem);
        if (added) return true; // gevonden in submodule
      }
    }
  }

  return false; // niet gevonden
}

deleteItemToModuleById(module: any, targetId: string, itemId: any): boolean {
  // console.log('deleteItemToModuleById',module,targetId,itemId)
  // Als dit de gezochte module is
  if (module.id === targetId) {
    if (!module.items) module.items = [];
    const index = module.items.findIndex((item: any) => item.id === itemId);
    if (index > -1) {
      module.items.splice(index, 1);
    }
    return true; // gevonden en verwijderd
  }

  // Als deze module zelf items heeft, zoek daarin verder
  if (module.items && Array.isArray(module.items)) {
    for (let item of module.items) {
      if (item.type === 'module') {
        const removed = this.deleteItemToModuleById(item, targetId, itemId);
        if (removed) return true; // gevonden in submodule
      }
      // Als het geen module is, maar een item, controleer dan of het overeenkomt
      // console.log('item',itemId,item.id)
      if (item.id === itemId) {
        const index = module.items.findIndex((i: any) => i.id === itemId);
        if (index > -1) {
          module.items.splice(index, 1);
        }
        return true; // gevonden en verwijderd
      }
    }
  }

  return false; // niet gevonden
}

async copyItemsToTraining(module: any, returnItem?: boolean): Promise<any> {
  if (!module.items || !module.items.length) {
    return returnItem ? module : undefined;
  }

  for (let i = 0; i < module.items.length; i++) {
    let item = module.items[i];
    let newItem;
    // console.log('copyItemsToTraining', item);
    if (item.type === 'case') {
      newItem = await this.trainerService.getCase(item.id);
      newItem.type = 'case';
    } else if (item.type === 'infoItem') {
      newItem = await this.trainerService.getInfoItem(item.id);
      newItem.type = 'infoItem';
    } else if (item.type === 'module') {
      newItem = await this.copyItemsToTraining(item, true);
      newItem.type = 'module';
    } else {
      continue;
    }

    for (let key in newItem) {
      if (newItem[key] === undefined) {
        newItem[key] = '';
      }
    }

    // Gebruik nu je Promise-wrapper
    const res: any = await this.firestore.createSubSubAsync(
      'trainers',
      this.nav.activeOrganisationId,
      'trainings',
      this.trainerService.breadCrumbs[0].item.id,
      'items',
      newItem
    );

    await this.firestore.updateSubSub(
      'trainers',
      this.nav.activeOrganisationId,
      'trainings',
      this.trainerService.breadCrumbs[0].item.id,
      'items',
      res.id,
      { id: res.id }
    );

    if(this.trainerService.breadCrumbs[0].status == 'published' && this.trainerService.breadCrumbs[0].item.publishType == 'elearning'){
      let newNewItem:any = JSON.parse(JSON.stringify(newItem))
      newNewItem.id = res.id
      this.functions.httpsCallable('adjustElearning')({
        elearningId: this.trainerService.breadCrumbs[0].item.id,
        trainerId: this.nav.activeOrganisationId,
        items: [newNewItem]
      });
    }

    module.items[i] = {
      ...item,
      id: res.id,
    };
  }

  // Hoofdmodule opslaan
  // const mainRes: any = await this.firestore.createSubSubAsync(
  //   'trainers',
  //   this.nav.activeOrganisationId,
  //   'trainings',
  //   this.trainerService.trainingItem.id,
  //   'items',
  //   module
  // );

  // await this.firestore.updateSubSub(
  //   'trainers',
  //   this.nav.activeOrganisationId,
  //   'trainings',
  //   this.trainerService.trainingItem.id,
  //   'items',
  //   mainRes.id,
  //   { id: mainRes.id }
  // );

  // module.id = mainRes.id;

  if (returnItem) {
    return module;
  }
}

  editItem(item:any){
    if(item.type=='module'){
      this.selectTraining(item)
    }
    else if(item.type=='case'){
      this.trainerService.caseItem = this.trainerService.getItemTraining(item.id,this.trainingId)
      this.trainerService.breadCrumbs.push({
        type: 'case',
        item: this.trainerService.caseItem,
      })
      this.nav.go('trainer/cases')
    }
    else if(item.type=='infoItem'){
      this.trainerService.infoItem = this.trainerService.getItemTraining(item.id,this.trainingId)
      this.trainerService.breadCrumbs.push({
        type: 'infoItem',
        item: this.trainerService.infoItem,
      })
      this.nav.go('trainer/info-items')
    }
  }

  unusedItems:any[] = []
  usedItems:any[] = []
  countModules:number=0
  findAllUsedItems(module:any,subModule?:boolean){
    // console.log('findAllUsedItems',module,subModule)

    for(let i=0;i<module.items.length;i++){
      if(module.items[i].type != 'module'){
        this.usedItems.push(module.items[i].id)
      }
      else{
        this.findAllUsedItems(module.items[i],true)
      }
    }
    if(subModule){return}
    for(let i=0;i<this.trainerService.breadCrumbs[0].item.trainingItems.length;i++){
      if(
        this.usedItems.indexOf(this.trainerService.breadCrumbs[0].item.trainingItems[i].id) == -1 && 
        this.unusedItems.indexOf(this.trainerService.breadCrumbs[0].item.trainingItems[i].id) == -1
      ){
        this.unusedItems.push(this.trainerService.breadCrumbs[0].item.trainingItems[i].id)
      }
    }

  }

  deleteItem(item:any){
    this.unusedItems = []
    this.usedItems = []
    this.findAllUsedItems(this.trainerService.breadCrumbs[0].item)
    
    // let trainingId = this.trainerService.trainingItem.id
    // this.trainerService.trainingItem = this.trainerService.getTraining(trainingId,this.trainerService.trainingItem.created)
    this.modalService.showConfirmation(this.translate.instant('confirmation_questions.delete')).then(async (result:any) => {
      if(result){

        this.deleteItemToModuleById(this.trainerService.breadCrumbs[0].item, this.trainerService.breadCrumbs[this.trainerService.breadCrumbs.length-1].item.id,item.id)
        this.update('items',true)
        setTimeout(() => {
          this.findAllUsedItems(this.trainerService.breadCrumbs[0].item)
          if(this.unusedItems.length){
            for(let i=0;i<this.unusedItems.length;i++){
              this.firestore.deleteSubSub('trainers',this.nav.activeOrganisationId,'trainings',this.trainerService.breadCrumbs[0].item.id,'items',this.unusedItems[i])
            }
            this.unusedItems = []
            this.usedItems = []
            
            setTimeout(() => {
              this.trainerService.breadCrumbs[0].item = this.trainerService.getTraining(this.trainerService.breadCrumbs[0].item.id)
              if(this.trainerService.breadCrumbs.length>1){
                this.trainerService.trainingItem = this.trainerService.getTrainingModule(this.trainerService.breadCrumbs[0].item,this.trainerService.breadCrumbs[this.trainerService.breadCrumbs.length-1].item.id)
                this.trainerService.breadCrumbs[this.trainerService.breadCrumbs.length-1].item = this.trainerService.trainingItem
              }
              // this.trainerService.loadTrainingsAndParticipants(()=>{
              //   setTimeout(() => {
              //   }, 10);
              // })
            }, 1000);
          }
        }, 1000);
      }
    })
  }

  back(){
    console.log(this.trainerService.breadCrumbs)
    if(this.trainerService.breadCrumbs.length>1){
      this.trainerService.breadCrumbs.pop()
      let item = this.trainerService.breadCrumbs[this.trainerService.breadCrumbs.length-1]
      // if(item.type == 'module'){
        this.trainerService.trainingItem = item.item
      // }
      // else{
        // this.trainerService.trainingItem = {}
      // }
    }
    else{
      this.trainerService.trainingItem = {}
      this.trainerService.breadCrumbs = []
    }
  }

  createTraining(module:any){
    this.modalService.inputFields('Nieuwe training', 'Hoe heet de nieuwe training?', [
      {
        type: 'text',
        title: 'Titel',
        name: 'Title',
        value: module.title,
        required: true,
      }], (result: any) => {
        if (result.data) {
          let training:any = JSON.parse(JSON.stringify(module))
          training.title = result.data[0].value
          training.created = Date.now()
          training.moduleId = training.id
          training.trainerId = this.nav.activeOrganisationId
          training.status = 'concept'
          training.amount_period = 2
          delete training.id
          delete training.type
          this.firestore.createSub('trainers', this.nav.activeOrganisationId, 'trainings', training).then(async () => {
            try {
              const found = await this.trainerService.waitForItem('training', module.created, 5000, 'created');
              this.trainerService.trainingItem = found;
              this.nav.go('trainer/trainings');
              // …openen/navigeer of modal sluiten
            } catch (err) {
              // Graceful fallback: direct openen met lokale data
              this.trainerService.trainingItem = {}
              // this.trainerService.caseItem = { id: casus.id, ...casus };
            }
            
            // this.trainerService.loadTrainingsAndParticipants(() => {
            //   this.trainerService.trainingItem = this.trainerService.getTraining('',training.created)
            //   this.nav.go('trainer/trainings')
              
            //   this.createItems(training.items,training.moduleId)

            // })
          })
        }
      })
  }

  createItems(items:any,moduleId:string){
    for(let i=0;i<items.length;i++){
      let item = items[i]
      if(item.type == 'case'){
        item = this.trainerService.getCase(item.id)
        item.item_type = 'case'
        item.trainingId = this.trainerService.trainingItem.id
        item.trainerId = this.nav.activeOrganisationId
        item.moduleId = moduleId
        item.order = i
        this.firestore.setSubSub('trainers', this.nav.activeOrganisationId, 'trainings', this.trainerService.trainingItem.id, 'items', item.id,item).then(() => {})
      }
      else if(item.type == 'infoItem'){
        item = this.trainerService.getInfoItem(item.id)
        item.item_type = 'infoItem'
        item.trainingId = this.trainerService.trainingItem.id
        item.trainerId = this.nav.activeOrganisationId
        item.moduleId = moduleId
        item.order = i
        this.firestore.setSubSub('trainers', this.nav.activeOrganisationId, 'trainings', this.trainerService.trainingItem.id, 'items', item.id,item).then(() => {})
      }
      else if(item.type == 'module'){
        item = this.trainerService.getModule(item.id)
        item.item_type = 'module'
        item.trainingId = this.trainerService.trainingItem.id
        item.trainerId = this.nav.activeOrganisationId
        item.moduleId = moduleId
        item.order = i
        this.firestore.setSubSub('trainers', this.nav.activeOrganisationId, 'trainings', this.trainerService.trainingItem.id, 'items', item.id,item).then(() => {})
        if(item.items && item.items.length){
          this.createItems(item.items,item.id)
        }
      }
    }
  }

  addParticipant(){

    if(this.trainerService.trainingItem?.participants && this.trainerService.trainingItem.participants.length >= this.trainerService.trainingItem.amount_participants){
      this.toast.show(this.translate.instant('trainings.max_participants_reached')) 
      return
    }

    let fields:any = [
      {
        type: 'text',
        title: this.translate.instant('page_register.name'),
        name: 'Name',
        value: '',
        required: true,
      },
      {
        type: 'email',
        title: this.translate.instant('page_register.email'),
        name: 'email',
        value: '',
        pattern:'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-z]{2,15}$',
        required: true,
      }
    ]
    // if(this.trainerService.checkIsTrainerPro()){
    //   fields.push({
    //     type: 'checkbox',
    //     title: 'Wil je de deelnemer embedden in de training?',
    //     name: 'Embedded',
    //     value: false,
    //     required: true,
    //   })
    // }


    this.modalService.inputFields('Nieuwe deelnemer', 'Voeg een deelnemer toe', fields, (result: any) => {
      if (result.data) {
        let participant = {
          displayName: this.helpers.capitalizeNames(result.data[0].value),
          email: result.data[1].value.toLowerCase(),
          created: Date.now(),
          status: 'active',
          embedded: result.data[2] ? result.data[2].value : false,
        }
        this.firestore.createSubSub('trainers', this.nav.activeOrganisationId, 'trainings', this.trainerService.trainingItem.id , 'participants', participant).then(async() => {
          try {
            await this.trainerService.waitForItem('training', this.trainerService.trainingItem.id, 5000, 'id');
            this.trainerService.trainingItem = this.trainerService.getTraining(this.trainerService.trainingItem.id);
            // …openen/navigeer of modal sluiten
          } catch (err) {
            // Graceful fallback: direct openen met lokale data
            this.trainerService.trainingItem = {}
            // this.trainerService.caseItem = { id: casus.id, ...casus };
          }
          // this.trainerService.loadTrainingsAndParticipants(() => {
          //   this.trainerService.trainingItem = this.trainerService.getTraining(this.trainerService.trainingItem.id)
          // })
        })
      }
    })
        
  }

  acceptParticipant(participant:any){
    let lengthActiveParticipants = 0
    if(this.trainerService.trainingItem?.participants && this.trainerService.trainingItem.participants.length){
      lengthActiveParticipants = this.trainerService.trainingItem.participants.filter((p:any) => p.status == 'active').length
    }
    if(lengthActiveParticipants >= this.trainerService.trainingItem.amount_participants){
      this.toast.show(this.translate.instant('trainings.max_participants_reached')) 
      return
    }

    this.firestore.updateSubSub('trainers',this.nav.activeOrganisationId,'trainings',this.trainerService.trainingItem.id,'participants',participant.id,{status:'active'}).then(async()=>{
      try {
          await this.trainerService.waitForItem('training', this.trainerService.trainingItem.id, 5000, 'id');
          this.trainerService.trainingItem = this.trainerService.getTraining(this.trainerService.trainingItem.id);
          // …openen/navigeer of modal sluiten
        } catch (err) {
          // Graceful fallback: direct openen met lokale data
          this.trainerService.trainingItem = {}
          // this.trainerService.caseItem = { id: casus.id, ...casus };
        }
      // this.trainerService.loadTrainingsAndParticipants(()=>{
      //   this.trainerService.trainingItem = this.trainerService.getTraining(this.trainerService.trainingItem.id)
      // })
    })
  }

  deleteParticipant(participant:any){
    this.modalService.showConfirmation(this.translate.instant('confirmation_questions.delete')).then(async (result:any) => {
      if(result){
        this.firestore.deleteSubSub('trainers',this.nav.activeOrganisationId,'trainings',this.trainerService.trainingItem.id,'participants',participant.id).then(async()=>{
          try {
            await this.trainerService.waitForItem('training', this.trainerService.trainingItem.id, 5000, 'id');
            this.trainerService.trainingItem = this.trainerService.getTraining(this.trainerService.trainingItem.id);
            // …openen/navigeer of modal sluiten
          } catch (err) {
            // Graceful fallback: direct openen met lokale data
            this.trainerService.trainingItem = {}
            // this.trainerService.caseItem = { id: casus.id, ...casus };
          }
        })
      }
    })
  }
  
  createTrainingCode(){
    if(!this.trainerService.trainingItem.code){
      this.toast.showLoader(this.translate.instant('trainings.generating_code'));
      this.functions.httpsCallable('createTrainingCode')({trainingId:this.trainerService.trainingItem.id,trainerId:this.nav.activeOrganisationId}).pipe(takeUntil(this.leave$)).subscribe(async(res:any)=>{
        try {
          await this.trainerService.waitForItem('training', this.trainerService.trainingItem.id, 5000, 'id');
          this.trainerService.trainingItem = this.trainerService.getTraining(this.trainerService.trainingItem.id);
          this.toast.hideLoader();
          this.toast.show(this.translate.instant('trainings.code_generated'))
          // …openen/navigeer of modal sluiten
        } catch (err) {
          // Graceful fallback: direct openen met lokale data
          this.trainerService.trainingItem = {}
          this.toast.hideLoader();
          this.toast.show(this.translate.instant('trainings.code_generated'))
          // this.trainerService.caseItem = { id: casus.id, ...casus };
        }
        // this.trainerService.loadTrainingsAndParticipants(()=>{
        //   this.trainerService.trainingItem = this.trainerService.getTraining(this.trainerService.trainingItem.id)
        //   this.toast.hideLoader();
        //   this.toast.show(this.translate.instant('trainings.code_generated'))
        // })
      })
    }
    else{
      this.toast.show(this.translate.instant('trainings.code_already_exists'))
    }
  }

  deleteTrainingCode(){
    this.modalService.showConfirmation(this.translate.instant('confirmation_questions.delete')).then(async (result:any) => {
      if(result){
        this.firestore.updateSub('trainers',this.nav.activeOrganisationId,'trainings',this.trainerService.trainingItem.id,{code:'',code_created:''}).then(async ()=>{
          try {
            await this.trainerService.waitForItem('training', this.trainerService.trainingItem.id, 5000, 'id');
            this.trainerService.trainingItem = this.trainerService.getTraining(this.trainerService.trainingItem.id);
          } catch (err) {
            this.trainerService.trainingItem = {}
          }
          // this.trainerService.loadTrainingsAndParticipants(()=>{
          //   this.trainerService.trainingItem = this.trainerService.getTraining(this.trainerService.trainingItem.id)
          // })
        })
      }
    })
  }

  copyTrainingCode(type:string){
    if(this.trainerService.trainingItem.code){
      if(type == 'code'){
        this.helpers.copyToClipboard(this.trainerService.trainingItem.code)
        this.toast.show('Code gekopieerd')
      }
      else if(type == 'url'){
        this.helpers.copyToClipboard('https://conversation.alicialabs.com/register/?registrationCode='+this.trainerService.trainingItem.code)
        this.toast.show('Url gekopieerd')
      }
    }
    else{
      this.toast.show('Geen code gevonden')
    }
  }

  centerSelectItems(){
    if(this.trainerService.publishType!='training'){
      return
    }
    setTimeout(() => {
      for(let i=1;i<4;i++){
        let select:any = document.getElementById('select'+i)
        if(select && select.shadowRoot && select.shadowRoot.querySelector('.select-wrapper')){
          select.shadowRoot.querySelector('.select-wrapper').setAttribute('style', 'justify-content: center !important');
        }
      }
    }, 10);

    setTimeout(() => {
      for(let i=1;i<4;i++){
        let select:any = document.getElementById('select'+i)
        if(select && select.shadowRoot && select.shadowRoot.querySelector('.select-wrapper')){
          select.shadowRoot.querySelector('.select-wrapper').setAttribute('style', 'justify-content: center !important');
        }
      }
    }, 150);

    setTimeout(() => {
      for(let i=1;i<4;i++){
        let select:any = document.getElementById('select'+i)
        if(select && select.shadowRoot && select.shadowRoot.querySelector('.select-wrapper')){
          select.shadowRoot.querySelector('.select-wrapper').setAttribute('style', 'justify-content: center !important');
        }
        if(select){
          select.setAttribute('style', 'opacity:1 !important');
        }
      }
    }, 300);
    setTimeout(() => {
      for(let i=1;i<4;i++){
        let select:any = document.getElementById('select'+i)
        if(select && select.shadowRoot && select.shadowRoot.querySelector('.select-wrapper')){
          select.shadowRoot.querySelector('.select-wrapper').setAttribute('style', 'justify-content: center !important');
        }
        if(select){
          select.setAttribute('style', 'opacity:1 !important');
        }
      }
    }, 1000);
  }

  exportTraining(training:any){
    training.exportedType = 'training'

    const obj = JSON.parse(JSON.stringify(training));
    obj.participants = []
    obj.available_date = ''
    obj.available_till = ''
    obj.amount_participants = 10
    obj.expected_conversations = 3
    obj.amount_period = 2
    obj.type_credits = 'unlimited'
    obj.status = 'concept'
    delete obj.code
    delete obj.code_created

    if(obj.trainingItems && obj.trainingItems.length){
      for(let i=0;i<obj.trainingItems.length;i++){
        if(obj.trainingItems[i].modules){
          obj.trainingItems[i].modules = []
        }
      }
    }

    const base64 = this.encodeObjectToBase64(obj); // encode naar base64

    const blob = new Blob([base64], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    let title = 'training'
    if(training.title){
      title = training.title.replace(/[^a-zA-Z0-9]/g, '_'); // vervang speciale tekens door _
    }
    link.download = 'export_'+title+'.alicialabs';
    link.click();

  }

  importClick(){
    if(!this.trainerService.checkIsTrainerPro()){
        return
    }
    this.import_training.nativeElement.click();
  }

  selectImportFile($event:any) {
    if($event?.target?.files[0]){
      this.readImportFile($event.target.files[0])
    }

  } 

  readImportFile(file: File) {
    var reader = new FileReader();
    reader.onload = () => {
        let obj = this.decodeBase64ToObject(reader.result)
        this.importData(obj)
    };
    reader.readAsText(file);
  }

  importData(fileData:any){
    if(!fileData || fileData.exportedType !== 'training') {
      this.toast.show(this.translate.instant('error_messages.invalid_file'), 4000, 'middle');
      return;
    }
    let newTraining:any = {}
    try {
      newTraining.title = fileData.title
      newTraining.user_info = fileData.user_info || '';
      newTraining.available_date = '';
      newTraining.available_till = '';
      newTraining.amount_participants = fileData.amount_participants || 10;
      newTraining.amount_period = fileData.amount_period || 2;
      newTraining.expected_conversations = fileData.expected_conversations || 3;
      newTraining.type_credits = fileData.type_credits || 'unlimited';
      newTraining.status = 'concept';
      newTraining.participants = [];
      newTraining.items = fileData.items || [];
      newTraining.trainerId = this.nav.activeOrganisationId;
      newTraining.photo = fileData.photo || '';
      newTraining.created = Date.now();
    } catch (error) {
      this.toast.show(this.translate.instant('error_messages.invalid_file'), 4000, 'middle');
      return;
    }
    this.firestore.createSub('trainers', this.nav.activeOrganisationId, 'trainings', newTraining,(res:any) => {
      if(fileData.trainingItems?.length){
        for (let i = 0; i < fileData.trainingItems.length; i++) {
          let item = fileData.trainingItems[i];
          for(let key in item){
            if(item[key]===undefined){
              item[key] = ''
            }
          }
          this.firestore.setSubSub('trainers', this.nav.activeOrganisationId, 'trainings', res.id, 'items', item.id, item).then(() => {})
        }
      }
      this.filterWith('concept')
    })

  }


  decodeBase64ToObject(base64: any): any {
    const binary = atob(base64);
    const bytes = new Uint8Array([...binary].map(c => c.charCodeAt(0)));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  }

  encodeObjectToBase64(obj: any): string {
    const json = JSON.stringify(obj);
    const utf8Bytes = new TextEncoder().encode(json); // UTF-8 → Uint8Array
    const base64 = btoa(String.fromCharCode(...utf8Bytes));
    return base64;
  }

  async publishTraining(extra?:boolean){
    console.log({trainingId:this.trainerService.trainingItem.id,extra:extra,trainerId:this.nav.activeOrganisationId})
    this.toast.showLoader(this.translate.instant('trainings.publising_training'))
    if(!this.trainerService.trainingItem.available_date){
      this.toast.hideLoader()
      this.toast.show(this.translate.instant('trainings.date_before_publish'))
      this.showPart = 'items'
      return
    }
    this.functions.httpsCallable('publishTraining')({trainingId:this.trainerService.trainingItem.id,extra:extra,trainerId:this.nav.activeOrganisationId}).pipe(takeUntil(this.leave$)).pipe(takeUntil(this.leave$)).subscribe((res:any)=>{
      console.log('publishTraining',res)
      if(res?.status!= 200){
        this.toast.hideLoader()
        this.toast.show(res.result)
        return
      }
      if(res?.result?.sessionId){
        this.firestore.getDocListen(`customers/${this.nav.activeOrganisationId}/checkout_sessions/`, res.result.sessionId).pipe(takeUntil(this.leave$)).subscribe((value: any) => {
          if (value?.url) {
            this.toast.hideLoader()
            window.location.assign(value.url);
          } else if (value?.error) {
            this.toast.hideLoader()
            this.toast.show(this.translate.instant('error_messages.failure'));
            console.error("Stripe error:", value.error);
          }
        });
      }
      else if(res?.result?.send_invoice){
        this.trainerService.trainingItem.status = 'published'
        if(!extra){
          this.trainerService.trainingItem.published = moment().unix()
        }
        this.toast.hideLoader()
        this.toast.show(this.translate.instant('trainings.creation_training_complete'),6000,'middle')
        this.filterWith('published')
        this.showPart = 'participants'
      }
    })
  }

  async publishTrainingOrganisation(){
    console.log({trainingId:this.trainerService.trainingItem.id,trainerId:this.nav.activeOrganisationId})
    this.toast.showLoader(this.translate.instant('trainings.publising_training'))
    if(!this.trainerService.trainingItem.available_date){
      this.toast.hideLoader()
      this.modalService.inputFields(this.translate.instant('trainings.available_date'), this.translate.instant('trainings.date_before_publish'), [
        {
          type: 'date',
          title: this.translate.instant('trainings.available_date'),
          name: this.translate.instant('trainings.available_date'),
          value: '',
          required: true,
        }
      ], (result: any) => {
        if (result.data) {
          this.trainerService.trainingItem.available_date = moment(result.data[0].value).unix()
          this.update('available_date',true)
          this.toast.showLoader(this.translate.instant('trainings.publising_training'))
          this.publishTrainingOrganisation()
        }
      })
      // this.toast.show(this.translate.instant('trainings.date_before_publish'))
      // this.showPart = 'items'
      return
    }
    this.functions.httpsCallable('publishTrainingOrganisation')({trainingId:this.trainerService.trainingItem.id,trainerId:this.nav.activeOrganisationId}).subscribe((res:any)=>{
      console.log('publishTraining',res)
      if(res?.status!= 200){
        this.toast.hideLoader()
        this.toast.show(res.result)
        return
      }
      else{
        this.trainerService.trainingItem.status = 'published'
        this.trainerService.trainingItem.publishType = 'organisation'
        this.toast.hideLoader()
        this.toast.show(this.translate.instant('trainings.creation_training_complete_organisation'),6000,'middle')
        this.filterWith('published')
        this.backBreadCrumbs()
      }
    })
  }

  downloadTemplate(){
      window.open('assets/template_import_participants.csv','_blank')
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
          displayName:this.helpers.capitalizeNames(arrRow[0].trim()),
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
    
    for(let i=0;i<this.importedData.length;i++){
      if(this.trainerService.trainingItem.participants){
        for(let j=0;j<this.trainerService.trainingItem.participants.length;j++){
          if(this.importedData[i].email==this.trainerService.trainingItem.participants.email){
            this.importedData[i].exists = true
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
    let allEmails:any[] = []
    // let allItems:any[] = []
    this.totalImports = 0
    this.countingImports = 0
    const startLengthParticipants = this.trainerService.trainingItem.participants ? this.trainerService.trainingItem.participants.length : 0
    for(let i=0;i<this.importedData.length;i++){
      if(!this.importedData[i].exists){
        if(!allEmails.includes(this.importedData[i].email)){
          this.totalImports++
          this.firestore.createSubSub('trainers', this.nav.activeOrganisationId, 'trainings', this.trainerService.trainingItem.id , 'participants',{
            email:this.importedData[i].email,
            displayName:this.importedData[i].displayName,
            status: (startLengthParticipants + this.totalImports) < this.trainerService.trainingItem.amount_participants ? 'active' : 'pending',
            created:Date.now(),
          },()=>{
            this.countingImports++
          })
          allEmails.push(this.importedData[i].email)
        }
      }
    }  
    let countChecking=0
    let checking = setInterval(async() => {
      countChecking++
      if(this.countingImports == this.totalImports){
        clearInterval(checking)
        try {
          await this.trainerService.waitForItem('training', this.trainerService.trainingItem.id, 5000, 'id');
          this.trainerService.trainingItem = this.trainerService.getTraining(this.trainerService.trainingItem.id);
          // …openen/navigeer of modal sluiten
        } catch (err) {
          // Graceful fallback: direct openen met lokale data
          this.trainerService.trainingItem = {}
          // this.trainerService.caseItem = { id: casus.id, ...casus };
        }
        // this.trainerService.loadTrainingsAndParticipants(() => {
        //   this.trainerService.trainingItem = this.trainerService.getTraining(this.trainerService.trainingItem.id)
        //   // this.toast.show(this.translate.instant('trainings.import_participants')+this.countingImports,4000,'middle')
        // })
      }
      else if(countChecking>50){
        clearInterval(checking)
        // this.toast.show(this.translate.instant('trainings.import_participants')+this.countingImports,4000,'middle')
      }
    },100)
    
    this.showImportOption = false
  }

  filterHas(type:string){
    if(this.trainingFilter.indexOf(type) > -1){
      return true
    }
    return false
  }
  filterWith(type:string){
    console.log('filterWith',type)
    if(type){
      this.trainingFilter = [type]
    }
    else{
      this.trainingFilter = []
    }
    this.updateVisibleItems()
  }
  
  example(item?:any){
    if(!item){
      item = this.trainerService.breadCrumbs[0].item
    }
    this.trainerService.originEdit = 'trainer/trainings'
    this.nav.go('trainer/example/training/'+item.id)
  }

  setPageParam(){
    let param = ''
    if(!this.trainerService.trainingItem?.id&&this.trainingFilter?.length){
      param = 'trainer/trainings/' + this.trainingFilter[0]
    }
    else if(this.trainerService.trainingItem?.id){
      param = 'trainer/trainings/'+this.showPart + '_'+ this.trainerService.trainingItem.status
    }
    else{
      param = 'trainer/trainings'
    }
    return param
  }

  setOptionsParam(){
    let param = ''
    if(!this.trainerService.trainingItem?.id&&this.trainingFilter?.length){
      param = 'trainer/trainings/'
    }
    else if(this.trainerService.trainingItem?.id){
      param = 'trainer/trainings/item'
    }
    return param
  }

  setShowPart(part:string){
    if(this.showPart != part){
      this.showPart = part
      if(part == 'publish'){
        this.centerSelectItems()
      }
    }
  }
  // updateItem(item:any,field:string,isArray:boolean = false){
  //   if(!item){
  //     item = this.trainerService.breadCrumbs[0].item
  //   }
  //   if(!item[field]){
  //     item[field] = ''
  //   }
  //   const scrollPosition = window.scrollY;

    
  // }

  // findListItem(item:any){

  // }

  closeTraining(item?:any){
    if(!item){
      item = this.trainerService.breadCrumbs[0].item
    }
    this.modalService.showConfirmation(this.translate.instant('trainings.close_training_verify')).then(async (result:any) => {
      if(result){
        if((!item.available_till || item.available_till > moment().format('YYYY-MM-DD')) ){
          item.available_till = moment().format('YYYY-MM-DD')
        }
        this.firestore.updateSub('trainers',this.nav.activeOrganisationId,'trainings',item.id,{status:'closed',available_till:item.available_till}).then(()=>{
          this.trainerService.loadTrainingsAndParticipants(()=>{
            this.trainerService.trainingItem = {}// = this.trainerService.getTraining(item.id)
            this.trainerService.breadCrumbs = []
            this.filterWith('closed')
          })
        })
      }
    })

  }

  selectDate(event:any,field:string,showTime?:boolean | null,min?:any,max?:any){
    event.stopPropagation()
    let date:any = this.trainerService.trainingItem[field]
    if(!date){date=moment().format('YYYY-MM-DD')}
    else{ date = moment(date).format('YYYY-MM-DD') }

    if(this.trainerService.breadCrumbs.length==1){
      this.toast.selectDate(date,(response:any)=>{
        if(response){
          this.trainerService.trainingItem[field] = moment(response).format('YYYY-MM-DD')
          // this.trainerService.breadCrumbs[0].item[field] = moment(response).format('YYYY-MM-DD')
          this.update(field)
        }
      },showTime,{min:min,max:max})
    }
    else{
      this.toast.selectDate(date,(response:any)=>{
        if(response){
          this.trainerService.trainingItem[field] = moment(response).format('YYYY-MM-DD')
          this.changeItem(this.trainerService.breadCrumbs[0].item.items, this.trainerService.trainingItem.id, field, this.trainerService.trainingItem[field])
          this.update('items',true)
        }
      },showTime,{min:min,max:max})

    }

  }

  preventBubble(event:Event){
    event.stopPropagation()
  }

  toggle(field:string,event?:Event){
    if(event){
      event.stopPropagation()
    }
    if(this.trainerService.trainingItem[field]){
      this.trainerService.trainingItem[field] = false
    }
    else{
      this.trainerService.trainingItem[field] = true
    }
    console.log('toggle',field,this.trainerService.trainingItem[field])
    this.update(field,true)
  }

  clearDate(event:Event,field:string){
    event.stopPropagation()
    this.trainerService.trainingItem[field] = ''
    if(this.trainerService.breadCrumbs.length==1){
      this.update(field)
    }
    else{
      this.update('items',true)
    }
  }

  changeItem(items: any, id: string, field: string, value: any,update?:boolean): boolean {
    console.log('changeItem',update, items, id, field, value)
    let itemChanged = false
    if(!items?.length&& this.trainerService.trainingItem.id != id){
      // console.log('No items to change')
      return itemChanged
    }
    for(let i=0;i<items.length;i++){
      if(items[i].type=='module'){
          itemChanged = this.changeItem(items[i].items, id, field, value,update)
          if(itemChanged){
            if(update){
              this.update('items',true)
            }
            console.log('itemChanged in module', items[i].id, field, value)
            return itemChanged
          }
      }
      if(items[i].id == id){
        items[i][field] = value
        itemChanged = true
        if(update){
          this.update('items',true)
          this.update(field,Array.isArray(items[i][field]))
        }
        return itemChanged
      }
    }
    if(this.trainerService.trainingItem.id == id){
      this.trainerService.trainingItem[field] = value
      itemChanged = true
      if(update){
        this.update(field)
      }
      // console.log('itemChanged in training', this.trainerService.trainingItem.id, field, value)
    }
    // console.log(itemChanged)

    return itemChanged
  }

  addTag(){
    if(!this.trainerService.trainingItem.tags){this.trainerService.trainingItem.tags = []}
    if(this.trainerService.trainingItem.tag&&!this.trainerService.trainingItem.tags.includes(this.trainerService.trainingItem.tag)){
      this.trainerService.trainingItem.tags.push(this.trainerService.trainingItem.tag.toLowerCase())
      this.update('tags',true)
      this.trainerService.trainingItem.tag = ''
    }
  }

  removeTag(index:number){
    this.trainerService.trainingItem.tags.splice(index,1)
    this.update('tags',true)
  }

  allTags(){
    let tags:any[] = []

    for(let i=0;i<this.trainerService.trainings.length;i++){
      if(this.trainerService.trainings[i].tags && this.trainerService.trainings[i].tags.length){
        for(let j=0;j<this.trainerService.trainings[i].tags.length;j++){
          if(!tags.includes(this.trainerService.trainings[i].tags[j])){
            tags.push(this.trainerService.trainings[i].tags[j])
          }
        }
      }
    }
    tags = tags.sort((a:any,b:any) => {
      return a.localeCompare(b)
    })
    return tags
    
  }

  toggleTag(tag:string){
    if(this.selectedTags.includes(tag)){
      this.selectedTags = []
    }
    else{
      this.selectedTags = [tag]
    }
    this.updateVisibleItems()
  }

  tagSelected(tag:string){
    return this.selectedTags.includes(tag)
  }

  addExtraCosts(key:string,amount:number){

    if(!this.extraCostOptions[key]){
      this.extraCostOptions[key] = 0
    }
    if(!amount){
      this.extraCostOptions[key] = 0
    }
    else if(key == 'amount_period' && (this.trainerService.trainingItem.amount_period + (this.extraCostOptions['amount_period'] ? this.extraCostOptions['amount_period'] : 0) ==12)){
      // do Nothing, 
    }
    else{
      this.extraCostOptions[key] = this.extraCostOptions[key] + amount
    }
    if(this.extraCostOptions[key]<0){
      this.extraCostOptions[key] = 0
    }
    console.log('extraCostOptions',this.extraCostOptions)
    // this.update('extra_costs',true)
  }

  readEvaluation(content:string,displayName:string,conversationTitle:string){
    this.modalService.showText(content.split('```html').join('').split('```').join('').split('html').join(''),this.translate.instant('conversation.pdf.evaluation') + " " + displayName + ' - ' + conversationTitle)
  }

  async createSummaryUser(user:any){
    this.toast.showLoader()
    const response = await fetch('https://europe-west1-lwai-3bac8.cloudfunctions.net/closeAnalystGemini', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lang: this.translate.currentLang || 'en',
        userEmail: user.user,
        trainingId: this.trainerService.trainingItem.id,
        trainerId: this.nav.activeOrganisationId,
        userId: this.auth.userInfo.uid,
        instructionType: 'close_analyst',
        categoryId:'main',
        trainer:{
          trainingId: this.trainerService.trainingItem.id,
          trainerId: this.nav.activeOrganisationId,
        }
      }),
    });
    if (!response.body) {
      throw new Error("Response body is null");
    }
    if (!response.ok) {
      console.error("Request failed:", response.status, response.statusText);
      this.toast.hideLoader();
      return;
    }

    try {
      let result:any = await response.json();
      if (result&&result.summary) {
        result.summary = result.summary.split('```html').join('').split('```').join('').split('html').join('').split('```json').join('').split('json ').join('').split('json').join('').trim();
        if (result.summary) {
          let json = JSON.parse(result.summary);
          if (json && json.summary) {
            if(!user.summaries){
              user.summaries = []
            }
            user.summaries.push(result)
            this.toast.hideLoader();
            this.modalService.showText(json.summary, this.translate.instant('conversation.pdf.summary') + " " + user.displayName + ' - ' + this.trainerService.trainingItem.title);
          } else {
            this.toast.show(this.translate.instant('error_messages.failure'), 4000, 'middle');
          }
        }
      }
    } catch (error) {
      this.toast.hideLoader();
      console.error("Failed to parse JSON:", error);
      this.toast.show(this.translate.instant('error_messages.failure'), 4000, 'middle');
      return;
    }
  }

  async createSummaryCase(casus:any){
    this.toast.showLoader()
    console.log(casus,{
        lang: this.translate.currentLang || 'en',
        userEmail: '',
        caseId: casus.caseId,
        trainingId: this.trainerService.trainingItem.id,
        trainerId: this.nav.activeOrganisationId,
        userId: this.auth.userInfo.uid,
        instructionType: 'close_analyst',
        categoryId:'main',
        trainer:{
          trainingId: this.trainerService.trainingItem.id,
          trainerId: this.nav.activeOrganisationId,
        }
      })
    const response = await fetch('https://europe-west1-lwai-3bac8.cloudfunctions.net/closeAnalystGemini', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lang: this.translate.currentLang || 'en',
        userEmail: '',
        caseId: casus.caseId,
        trainingId: this.trainerService.trainingItem.id,
        trainerId: this.nav.activeOrganisationId,
        userId: this.auth.userInfo.uid,
        instructionType: 'close_analyst',
        categoryId:'main',
        trainer:{
          trainingId: this.trainerService.trainingItem.id,
          trainerId: this.nav.activeOrganisationId,
        }
      }),
    });
    if (!response.body) {
      throw new Error("Response body is null");
    }
    if (!response.ok) {
      console.error("Request failed:", response.status, response.statusText);
      this.toast.hideLoader();
      return;
    }

    try {
      let result:any = await response.json();
      if (result&&result.summary) {
        result.summary = result.summary.split('```html').join('').split('```').join('').split('html').join('').split('```json').join('').split('json ').join('').split('json').join('').trim();
        if (result.summary) {
          let json = JSON.parse(result.summary);
          if (json && json.summary) {
            if(!casus.summaries){
              casus.summaries = []
            }
            casus.summaries.push(result)
            this.toast.hideLoader();
            this.modalService.showText(json.summary, this.translate.instant('conversation.pdf.summary') + " " + casus.case.title + ' - ' + this.trainerService.trainingItem.title);
          } else {
            this.toast.show(this.translate.instant('error_messages.failure'), 4000, 'middle');
          }
        }
      }
    } catch (error) {
      this.toast.hideLoader();
      console.error("Failed to parse JSON:", error);
      this.toast.show(this.translate.instant('error_messages.failure'), 4000, 'middle');
      return;
    }
  }

  readSummary(user:any){
    console.log('readSummary',user)
    let summary = user.summaries[user.summaries?.length - 1].summary
    let json = JSON.parse(summary.split('```html').join('').split('```').join('').split('html').join('').split('```json').join('').split('json ').join('').split('json').join('').trim())
    if(json && json.summary){
      this.modalService.showText(json.summary,this.translate.instant('conversation.pdf.summary') + " " + user.displayName + ' - ' + this.trainerService.trainingItem.title)
    }
    else{
      this.toast.show(this.translate.instant('error_messages.failure'), 4000, 'middle');
    }
  }

  fixIt(){
    console.log(this.trainerService.trainingItem)
    console.log(this.trainerService.trainingItem.items[2])
    console.log(this.trainerService.cases)
    for(let item of this.trainerService.trainingItem.items[2].items){
      let caseItem = this.trainerService.cases.find((c:any) => c.id == item.id)
      console.log(caseItem)
      // this.firestore.setSubSub('trainers', this.nav.activeOrganisationId, 'trainings', this.trainerService.trainingItem.id, 'items', item.id, caseItem)
    }
  }

  publishElearning(){
    if(!this.trainerService.checkIsTrainerPro()){
        return
    }
    this.toast.showLoader(this.translate.instant('trainings.publising_elearning'))
    console.log('publishElearning',this.trainerService.breadCrumbs[0].item)
    this.functions.httpsCallable('createElearning')({
      trainingId: this.trainerService.breadCrumbs[0].item.id,
      trainerId: this.nav.activeOrganisationId,
    }).subscribe((res:any)=>{
      console.log('createElearning',res)
      if(res?.status == 200){
        this.firestore.updateSub('trainers',this.nav.activeOrganisationId,'trainings', this.trainerService.breadCrumbs[0].item.id,{status:'published',publishType:'elearning'}).then(()=>{
          this.trainerService.loadTrainingsAndParticipants(()=>{
            this.trainerService.trainingItem = {}// = this.trainerService.getTraining(item.id)
            this.trainerService.breadCrumbs = []
            this.filterWith('published')
            this.toast.hideLoader();
            this.toast.show(this.translate.instant('trainings.elearning_created'), 4000, 'middle');
          })
        })
      }
      else{
        this.toast.hideLoader();
        this.toast.show(this.translate.instant('error_messages.failure'), 4000, 'middle');
      }
  })
  }
}