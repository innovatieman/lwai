import { Component, OnInit, ViewChild } from '@angular/core';
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

@Component({
  selector: 'app-modules',
  templateUrl: './modules.page.html',
  styleUrls: ['./modules.page.scss'],
})
export class ModulesPage implements OnInit {
   @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;
  maxItems = 15;
  searchTerm: string = '';
  filteredItems: any[] = [];
  visibleItems: any[] = [];
  connectedCases:any[] = []
  connectedInfoItems:any[] = []
  itemsLoaded:boolean = false;
  showPart:string = 'items';
  constructor(
    public nav: NavService,
    public icon:IconsService,
    private firestore: FirestoreService,
    public trainerService:TrainerService,
    public media:MediaService,
    private toast:ToastService,
    public auth:AuthService,
    private modalService:ModalService,
    public translate:TranslateService,
    public infoService:InfoService,
    public helpers:HelpersService,
    private filterSearchPipe:FilterSearchPipe,
    private filterKeyPipe:FilterKeyPipe,
    public levelService:LevelsService,
    private functions:AngularFireFunctions,
    private popoverController:PopoverController,
    private selectMenuservice:SelectMenuService,
    private route:ActivatedRoute
  ) { }

  ngOnInit() {
    let route = location.pathname.split('/')
    this.auth.userInfo$.subscribe(userInfo => {
      if (userInfo) {
        this.auth.hasActive('trainer').subscribe((trainer)=>{
          if(trainer &&!this.itemsLoaded){
              this.trainerService.loadModules(()=>{
                this.updateVisibleItems();
                this.itemsLoaded = true
              });
              this.trainerService.loadCases(()=>{})
              this.trainerService.loadInfoItems(()=>{})
          
          }
        })
      }
    })
    
    

    // this.route.params.subscribe((params:any)=>{

    // })
      // this.getCourseData()
      
    
    // setTimeout(() => {
    //   this.functions.httpsCallable('buyTrainerCredits')({participants:11,moduleId:'joepie'}).subscribe((res:any)=>{
    //     console.log('res',res)
    //     console.log(`customers/${this.auth.userInfo.uid}/checkout_sessions/`, res.result.sessionId)
    //     this.firestore.getDocListen(`customers/${this.auth.userInfo.uid}/checkout_sessions/`, res.result.sessionId).subscribe((value: any) => {
    //       console.log('value', value);
    //       if (value?.url) {
    //         window.location.assign(value.url);
    //       } else if (value?.error) {
    //         console.error("Stripe error:", value.error);
    //       }
    //     });
    //   })
    // }, 5000);
  }

  ionViewWillEnter(){
    if(this.trainerService.moduleItem?.id){
      setTimeout(() => {
        this.trainerService.moduleItem = JSON.parse(JSON.stringify(this.trainerService.getModule(this.trainerService.moduleItem.id)))
        console.log('ionViewWillEnter',this.trainerService.moduleItem)
        
      }, 100);
    }
  }

  dropHandler(event: any) {
    if (event.dropEffect === 'move' && event.index !== undefined) {
      const draggedItem = event.data;
      const previousIndex = this.trainerService.moduleItem.items.findIndex((item: any) => item.id === draggedItem.id);
      const currentIndex = event.index;

      if (previousIndex !== -1 && previousIndex !== currentIndex) {
        this.trainerService.moduleItem.items.splice(previousIndex, 1);
        this.trainerService.moduleItem.items.splice(currentIndex, 0, draggedItem);
        // update order between items
        for(let i=0;i<this.trainerService.moduleItem.items.length;i++){
          this.trainerService.moduleItem.items[i].order = i
        }


        this.update('items',true,this.trainerService.moduleItem);
      }
    }
  }

  selectModule(module:any){
    // this.trainerService.moduleItem.items[currentIndex].order = currentIndex
    
    this.connectedCases = this.getConnectedCases(module)
    this.connectedInfoItems = this.getConnectedInfoItems(module)
    let existsingItemsLength = 0
    if(!module.items){
      module.items = []
    }
    existsingItemsLength = module.items.length
    for(let i=0;i<this.connectedCases.length;i++){
      let checkExists = module.items.filter((e:any) => {
        return e.id === this.connectedCases[i].id
      })
      if(!checkExists.length){
        module.items.push({
          id: this.connectedCases[i].id,
          title: this.connectedCases[i].title,
          created: this.connectedCases[i].created,
          type: 'case',
          order:999,
        })
      }
    }
    for(let i=0;i<this.connectedInfoItems.length;i++){
      let checkExists = module.items.filter((e:any) => {
        return e.id === this.connectedInfoItems[i].id
      })
      if(!checkExists.length){
        module.items.push({
          id: this.connectedInfoItems[i].id,
          title: this.connectedInfoItems[i].title,
          created: this.connectedInfoItems[i].created || Date.now(),
          type: 'infoItem',
          order:999,
        })
      }
    }
    

    if(existsingItemsLength !== module.items.length){
      this.firestore.setSub('trainers',this.auth.userInfo.uid,'modules',module.id,module.items,'items',null,true)
    }
    module.items = module.items.sort((a:any,b:any) => {
      return a.order - b.order
    })

    this.trainerService.moduleItem = module;
    this.trainerService.breadCrumbs.push({
      type: 'module',
      item: module,
    })
    console.log('breadCrumbs',this.trainerService.breadCrumbs)
  }

  drop(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.trainerService.moduleItem.items, event.previousIndex, event.currentIndex);
  }
  
  
  getConnectedCases(module:any){
    let connected = this.trainerService.cases.filter((e:any) => {
      return e.modules && e.modules.indexOf(module.id) > -1
    })
    return connected
  }
  getConnectedInfoItems(module:any){
    let connected = this.trainerService.infoItems.filter((e:any) => {
      return e.modules && e.modules.indexOf(module.id) > -1
    })
    return connected
  }

  addModule(){
    this.modalService.inputFields('Nieuwe module', 'Hoe heet de nieuwe module?', [
      {
        type: 'text',
        placeholder: 'Naam van de module',
        value: '',
        required: true,
      }
    ], (result: any) => {
      if (result.data) {
        let module = {
          title: result.data[0].value,
          created: Date.now(),
        }
        this.firestore.createSub('trainers', this.auth.userInfo.uid, 'modules', module).then(() => {
          this.trainerService.loadModules(()=>{
            this.connectedCases = []
            let item = this.trainerService.modules.filter((e:any) => {
              return e.created === module.created
            })
            if(item.length){
              this.trainerService.moduleItem = item[0]
            }
            else{
              this.trainerService.moduleItem = {}
            }
          })
        })
      }
    })
  }

  copyModule(){
    let copy = JSON.parse(JSON.stringify(this.trainerService.moduleItem))
    let old_id = copy.id
    delete copy.id
    copy.created = Date.now()
    copy.title = copy.title + ' (copy)'
    this.firestore.createSub('trainers',this.auth.userInfo.uid,'modules',copy).then(()=>{
      this.trainerService.loadModules(()=>{
        this.connectedCases = []
        let item = this.trainerService.modules.filter((e:any) => {
          return e.created === copy.created
        })
        if(item.length){
          this.trainerService.breadCrumbs = []
          this.selectModule(item[0])
          for(let i=0;i<this.trainerService.cases.length;i++){
            if(this.trainerService.cases[i].modules && this.trainerService.cases[i].modules.indexOf(old_id) > -1){
              this.trainerService.cases[i].modules.push(this.trainerService.moduleItem.id)
              this.firestore.setSub('trainers',this.auth.userInfo.uid,'cases',this.trainerService.cases[i].id,this.trainerService.cases[i].modules,'modules',null,true)
            }
          }
          for(let i=0;i<this.trainerService.infoItems.length;i++){
            if(this.trainerService.infoItems[i].modules && this.trainerService.infoItems[i].modules.indexOf(old_id) > -1){
              this.trainerService.infoItems[i].modules.push(this.trainerService.moduleItem.id)
              this.firestore.setSub('trainers',this.auth.userInfo.uid,'infoItems',this.trainerService.infoItems[i].id,this.trainerService.infoItems[i].modules,'modules',null,true)
            }
          }
        }
        else{
          this.trainerService.moduleItem = {}
        }
      })
    })
  }

  deleteModule(module:any){
    this.modalService.showConfirmation(this.translate.instant('confirmation_questions.delete')).then(async (result:any) => {
      if(result){
        this.firestore.deleteSub('trainers',this.auth.userInfo.uid,'modules',module.id).then(()=>{
          this.trainerService.loadModules(()=>{
            this.connectedCases = []
            this.trainerService.moduleItem = {}
            this.trainerService.breadCrumbs = []
            for(let i=0;i<this.trainerService.cases.length;i++){
              if(this.trainerService.cases[i].modules && this.trainerService.cases[i].modules.indexOf(module.id) > -1){
                this.trainerService.cases[i].modules = this.trainerService.cases[i].modules.filter((e:any) => {
                  return e !== module.id
                })
                if(!this.trainerService.cases[i].modules.length){
                  this.trainerService.cases[i].modules = []
                }
                this.firestore.setSub('trainers',this.auth.userInfo.uid,'cases',this.trainerService.cases[i].id,this.trainerService.cases[i].modules,'modules',null,true)
              }
            }
            for(let i=0;i<this.trainerService.infoItems.length;i++){
              if(this.trainerService.infoItems[i].modules && this.trainerService.infoItems[i].modules.indexOf(module.id) > -1){
                this.trainerService.infoItems[i].modules = this.trainerService.infoItems[i].modules.filter((e:any) => {
                  return e !== module.id
                })
                if(!this.trainerService.infoItems[i].modules.length){
                  this.trainerService.infoItems[i].modules = []
                }
                this.firestore.setSub('trainers',this.auth.userInfo.uid,'infoItems',this.trainerService.infoItems[i].id,this.trainerService.infoItems[i].modules,'modules',null,true)
              }
            }
          })
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
      this.trainerService.modules,
      this.searchTerm,
      false,
      ['title','user_info','tags']
    );
  
    // const extraFiltered2 = this.filterKeyPipe.transform(
    //   searched,
    //   'modules',
    //   this.selectedModule
    // );

    // const extraFiltered3 = this.filterKeyPipe.transform(
    //   extraFiltered2,
    //   'free_question',
    //   this.extraFilters.photo
    // );

    this.filteredItems = searched;
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

  moduleReady(part:string){
    let check = false
    switch(part){
      case 'title':
        check = this.trainerService.moduleItem?.title && this.trainerService.moduleItem?.user_info && this.trainerService.moduleItem?.photo
        break;
      default:
        check = false
    }
    return check
  }

  update(field?:string,isArray:boolean = false,moduleItem?:any){
    if(!moduleItem?.id){
      moduleItem = this.trainerService.moduleItem
    }
    const scrollPosition = window.scrollY;
    if(field){
      this.firestore.setSub('trainers',this.auth.userInfo.uid,'modules',moduleItem.id,moduleItem[field],field,()=>{
        setTimeout(() => {
          window.scrollTo(0, scrollPosition);
        }, 100);
      },isArray)
    }
  }

  moduleNotReady(){
    let check = 
      this.trainerService.moduleItem?.title == '' || 
      this.trainerService.moduleItem?.user_info == '' ||
      this.trainerService.moduleItem?.photo == ''

      return check
  }

  async selectAvatar(event:Event){
    this.media.selectAvatar(event,(res:any)=>{
      console.log(res)
      if(res?.status==200&&res?.result.url){
        this.trainerService.moduleItem.photo = res.result.url
        this.update('photo')
      }
      else if(res=='delete'){
        this.trainerService.moduleItem.photo = ''
        this.update('photo')
      }
      else if(res.type=='library'){
        this.trainerService.moduleItem.photo = res.url
        this.update('photo')
      }
      // else if(res=='generate'){
      //   this.createPhoto(this.trainerService.infoItem)
      // }
    },false,true)
  }

  shortMenu:any = null
  async addItemToModule(event:any){
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
      console.log(this.selectMenuservice.selectedItem.id)

      let list:any[] =[]
      if(this.selectMenuservice.selectedItem.id == 'modules'){
        list = this.trainerService.modules
      }
      else if(this.selectMenuservice.selectedItem.id == 'cases'){
        list = this.trainerService.cases
      }
      else if(this.selectMenuservice.selectedItem.id == 'infoItems'){
        list = this.trainerService.infoItems
      }
      console.log('list',list)
      this.modalService.selectItem('Selecteer', list, (result: any) => {
        if (result.data) {
          console.log('selected items', result.data)
          if(this.selectMenuservice.selectedItem.id == 'modules'){
            for(let i=0;i<result.data.length;i++){
              this.trainerService.moduleItem.items.push({
                type: 'module',
                ...result.data[i],
                order:999,
              })
            }
          }
          else if(this.selectMenuservice.selectedItem.id == 'cases'){
            for(let i=0;i<result.data.length;i++){
              this.trainerService.moduleItem.items.push({
                type: 'case',
                title: result.data[i].title,
                created: result.data[i].created,
                id: result.data[i].id,
                order:999,
              })
              for(let j=0;j<this.trainerService.cases.length;j++){
                if(this.trainerService.cases[j].id == result.data[i].id){
                  this.trainerService.cases[j].modules.push(this.trainerService.moduleItem.id)
                  this.firestore.setSub('trainers',this.auth.userInfo.uid,'cases',result.data[i].id,this.trainerService.cases[j].modules,'modules',null,true)
                }
              }
            }
          }
          else if(this.selectMenuservice.selectedItem.id == 'infoItems'){
            for(let i=0;i<result.data.length;i++){
              this.trainerService.moduleItem.items.push({
                type: 'infoItem',
                title: result.data[i].title,
                created: result.data[i].created,
                id: result.data[i].id,
                order:999,
              })
              for(let j=0;j<this.trainerService.infoItems.length;j++){
                if(this.trainerService.infoItems[j].id == result.data[i].id){
                  this.trainerService.infoItems[j].modules.push(this.trainerService.moduleItem.id)
                  this.firestore.setSub('trainers',this.auth.userInfo.uid,'infoItems',result.data[i].id,this.trainerService.infoItems[j].modules,'modules',null,true)
                }
              }
            }
          }

          this.update('items',true)
        }
      }, undefined, 'Items',{multiple:true,object:true,field:'title'})
    }
  }

  editItem(item:any){
    if(item.type=='module'){
      this.selectModule(item)
    }
    else if(item.type=='case'){
      this.trainerService.caseItem = this.trainerService.getCase(item.id)
      this.trainerService.breadCrumbs.push({
        type: 'case',
        item: this.trainerService.caseItem,
      })
      this.nav.go('trainer/cases')
    }
    else if(item.type=='infoItem'){
      this.trainerService.infoItem = this.trainerService.getInfoItem(item.id)
      this.trainerService.breadCrumbs.push({
        type: 'infoItem',
        item: this.trainerService.infoItem,
      })
      this.nav.go('trainer/info-items')
    }
  }
  deleteItem(item:any){
    console.log('deleteItem',item)
    this.modalService.showConfirmation(this.translate.instant('confirmation_questions.delete')).then(async (result:any) => {
      if(result){
        let index = this.trainerService.moduleItem.items.findIndex((e:any) => {
          return e.id === item.id
        })
        if(index > -1){
          this.trainerService.moduleItem.items.splice(index,1)
          this.update('items',true)
        }
      }
      if(item.type=='case'){
        for(let i=0;i<this.trainerService.cases.length;i++){
          if(this.trainerService.cases[i].id == item.id){
            this.trainerService.cases[i].modules = this.trainerService.cases[i].modules.filter((e:any) => {
              return e !== this.trainerService.moduleItem.id
            })
            if(!this.trainerService.cases[i].modules.length){
              this.trainerService.cases[i].modules = []
            }
            this.firestore.setSub('trainers',this.auth.userInfo.uid,'cases',item.id,this.trainerService.cases[i].modules,'modules',null,true)
          }
        }
      }
      else if(item.type=='infoItem'){
        for(let i=0;i<this.trainerService.infoItems.length;i++){
          if(this.trainerService.infoItems[i].id == item.id){
            this.trainerService.infoItems[i].modules = this.trainerService.infoItems[i].modules.filter((e:any) => {
              return e !== this.trainerService.moduleItem.id
            })
            if(!this.trainerService.infoItems[i].modules.length){
              this.trainerService.infoItems[i].modules = []
            }
            this.firestore.setSub('trainers',this.auth.userInfo.uid,'infoItems',item.id,this.trainerService.infoItems[i].modules,'modules',null,true)
          }
        }
      }
    })
  }

  back(){
    console.log(this.trainerService.breadCrumbs)
    if(this.trainerService.breadCrumbs.length>1){
      this.trainerService.breadCrumbs.pop()
      let item = this.trainerService.breadCrumbs[this.trainerService.breadCrumbs.length-1]
      if(item.type == 'module'){
        this.trainerService.moduleItem = item.item
      }
      else{
        this.trainerService.moduleItem = {}
      }
    }
    else{
      this.trainerService.moduleItem = {}
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
          training.trainer_id = this.auth.userInfo.uid
          training.status = 'concept'
          delete training.id
          delete training.type
          this.firestore.createSub('trainers', this.auth.userInfo.uid, 'trainings', training).then(() => {
            this.trainerService.loadTrainings(() => {
              this.trainerService.trainingItem = this.trainerService.getTraining('',training.created)
              this.nav.go('trainer/trainings')
              
              this.createItems(training.items,training.moduleId)

            })
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
        item.trainer_id = this.auth.userInfo.uid
        item.moduleId = moduleId
        item.order = i
        this.firestore.setSubSub('trainers', this.auth.userInfo.uid, 'trainings', this.trainerService.trainingItem.id, 'items', item.id,item).then(() => {})
      }
      else if(item.type == 'infoItem'){
        item = this.trainerService.getInfoItem(item.id)
        item.item_type = 'infoItem'
        item.trainingId = this.trainerService.trainingItem.id
        item.trainer_id = this.auth.userInfo.uid
        item.moduleId = moduleId
        item.order = i
        this.firestore.setSubSub('trainers', this.auth.userInfo.uid, 'trainings', this.trainerService.trainingItem.id, 'items', item.id,item).then(() => {})
      }
      else if(item.type == 'module'){
        item = this.trainerService.getModule(item.id)
        item.item_type = 'module'
        item.trainingId = this.trainerService.trainingItem.id
        item.trainer_id = this.auth.userInfo.uid
        item.moduleId = moduleId
        item.order = i
        this.firestore.setSubSub('trainers', this.auth.userInfo.uid, 'trainings', this.trainerService.trainingItem.id, 'items', item.id,item).then(() => {})
        if(item.items && item.items.length){
          this.createItems(item.items,item.id)
        }
      }
    }
  }

}
