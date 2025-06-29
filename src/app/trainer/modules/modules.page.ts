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
  [x: string]: any;
  maxItems = 15;
  searchTerm: string = '';
  filteredItems: any[] = [];
  visibleItems: any[] = [];
  connectedCases:any[] = []
  connectedInfoItems:any[] = []
  itemsLoaded:boolean = false;
  showPart:string = 'items';
  modulesBreadCrumbs:any[] = []
  selectedTags:any[] = [];
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
              this.trainerService.loadCases(()=>{
                console.log('cases',this.trainerService.cases)
              })
              this.trainerService.loadInfoItems(()=>{})
          
          }
        })
      }
    })
    
    this.nav.organisationChange.subscribe((res)=>{
      this.trainerService.loadModules(()=>{
        this.updateVisibleItems();
        this.itemsLoaded = true
      });
      this.trainerService.loadCases(()=>{})
      this.trainerService.loadInfoItems(()=>{})
    })

    // this.route.params.subscribe((params:any)=>{

    // })
      // this.getCourseData()
      
    
    // setTimeout(() => {
    //   this.functions.httpsCallable('buyTrainerCredits')({participants:11,moduleId:'joepie'}).subscribe((res:any)=>{
    //     console.log('res',res)
    //     console.log(`customers/${this.nav.activeOrganisationId}/checkout_sessions/`, res.result.sessionId)
    //     this.firestore.getDocListen(`customers/${this.nav.activeOrganisationId}/checkout_sessions/`, res.result.sessionId).subscribe((value: any) => {
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

  backBreadCrumbs(){
    console.log('backBreadCrumbs',this.trainerService.breadCrumbs)
    if(this.trainerService.breadCrumbs.length > 0){
      this.trainerService.breadCrumbs.pop()
    }
    if(this.trainerService.breadCrumbs.length > 0){
      let item = JSON.parse(JSON.stringify(this.trainerService.breadCrumbs[this.trainerService.breadCrumbs.length-1]))
      this.trainerService.breadCrumbs.pop()
      this.selectModule(item.item)
    }
    else{
      this.trainerService.moduleItem = {}
      this.trainerService.breadCrumbs = []
    }
  }

  selectModule(module:any){
    // this.trainerService.moduleItem.items[currentIndex].order = currentIndex
    console.log('selectModule',module)
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
      this.firestore.setSub('trainers',this.nav.activeOrganisationId,'modules',module.id,module.items,'items',null,true)
    }
    module.items = module.items.sort((a:any,b:any) => {
      return a.order - b.order
    })

    this.trainerService.moduleItem = module;
    this.trainerService.breadCrumbs.push({
      type: 'module',
      item: module,
    })
    // console.log('breadCrumbs',this.trainerService.breadCrumbs)
    this.reloadMenu()
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
        this.firestore.createSub('trainers', this.nav.activeOrganisationId, 'modules', module).then(() => {
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

  example(item?:any){
      this.trainerService.originEdit = 'trainer/modules'
      if(!item?.id){
        item = this.trainerService.breadCrumbs[0].item
      }
      this.nav.go('trainer/example/module/'+item.id)
  }

  addTag(){
    if(!this.trainerService.moduleItem.tags){this.trainerService.moduleItem.tags = []}
    if(this.trainerService.moduleItem.tag&&!this.trainerService.moduleItem.tags.includes(this.trainerService.moduleItem.tag)){
      this.trainerService.moduleItem.tags.push(this.trainerService.moduleItem.tag.toLowerCase())
      this.update('tags',true)
      this.trainerService.moduleItem.tag = ''
    }
  }

  removeTag(index:number){
    this.trainerService.moduleItem.tags.splice(index,1)
    this.update('tags',true)
  }

  allTags(){
    let tags:any[] = []

    for(let i=0;i<this.trainerService.modules.length;i++){
      if(this.trainerService.modules[i].tags && this.trainerService.modules[i].tags.length){
        for(let j=0;j<this.trainerService.modules[i].tags.length;j++){
          if(!tags.includes(this.trainerService.modules[i].tags[j])){
            tags.push(this.trainerService.modules[i].tags[j])
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

  copyModule(item?:any){
    if(!item?.id){
      item = this.trainerService.moduleItem
    }
    let copy = JSON.parse(JSON.stringify(item))
    let old_id = copy.id
    delete copy.id
    copy.created = Date.now()
    copy.title = copy.title + ' (copy)'
    this.firestore.createSub('trainers',this.nav.activeOrganisationId,'modules',copy).then(()=>{
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
              this.firestore.setSub('trainers',this.nav.activeOrganisationId,'cases',this.trainerService.cases[i].id,this.trainerService.cases[i].modules,'modules',null,true)
            }
          }
          for(let i=0;i<this.trainerService.infoItems.length;i++){
            if(this.trainerService.infoItems[i].modules && this.trainerService.infoItems[i].modules.indexOf(old_id) > -1){
              this.trainerService.infoItems[i].modules.push(this.trainerService.moduleItem.id)
              this.firestore.setSub('trainers',this.nav.activeOrganisationId,'infoItems',this.trainerService.infoItems[i].id,this.trainerService.infoItems[i].modules,'modules',null,true)
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
        this.firestore.deleteSub('trainers',this.nav.activeOrganisationId,'modules',module.id).then(()=>{
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
                this.firestore.setSub('trainers',this.nav.activeOrganisationId,'cases',this.trainerService.cases[i].id,this.trainerService.cases[i].modules,'modules',null,true)
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
                this.firestore.setSub('trainers',this.nav.activeOrganisationId,'infoItems',this.trainerService.infoItems[i].id,this.trainerService.infoItems[i].modules,'modules',null,true)
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
  
    const extraFiltered2 = this.filterKeyPipe.transform(
      searched,
      'tags',
      this.selectedTags
    );

    // const extraFiltered3 = this.filterKeyPipe.transform(
    //   extraFiltered2,
    //   'free_question',
    //   this.extraFilters.photo
    // );

    this.filteredItems = extraFiltered2;
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
        if(!this.trainerService.moduleItem?.title){
          fields.push(this.translate.instant('cases.title'))
        }
        if(!this.trainerService.moduleItem?.user_info){
          fields.push(this.translate.instant('cases.short_info'))
        }
        if(!this.trainerService.moduleItem?.photo){
          fields.push(this.translate.instant('cases.photo'))
        }
        text = text + this.translate.instant('cases.check_incomplete') + '<ul>'
        for(let i=0;i<fields.length;i++){
          text = text + '<li>' + fields[i] + '</li>'
        }
        text = text + '</ul>'

        return text

      case 'content':
        if(!this.trainerService.moduleItem?.items?.length){
          // if(text.length){
          //   text = text + '<br><br>'
          // }
          text = text + this.translate.instant('modules.no_connected_items')
        }
        return text
    }
    return ''
  }

  moduleReady(part:string){
    let check = false
    switch(part){
      case 'title':
        check = this.trainerService.moduleItem?.title && this.trainerService.moduleItem?.user_info && this.trainerService.moduleItem?.photo
        break;
      case 'content':
        check = this.trainerService.moduleItem?.items?.length>0
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
        title:this.translate.instant('modules.edit_module_long'),
        icon:'faEdit',
        value:'edit'
      },
      {
        title:this.translate.instant('modules.copy_module'),
        icon:'faCopy',
        value:'copy'
      },
      {
        title:this.translate.instant('modules.delete_module'),
        icon:'faTrashAlt',
        value:'delete'
      },
      {
        title:this.translate.instant('cases.check_example'),
        icon:'faEye',
        value:'view'
      },
    ]
    this.showshortMenu(event,list,(result:any)=>{
      if(result?.value){
        switch(result.value){
          case 'edit':
            this.selectModule(item)
            break;
          case 'delete':
            this.deleteModule(item)
            break;
          case 'copy':
            this.copyModule(item)
            break;
          case 'view':
            this.example(item)
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

  

  update(field?:string,isArray:boolean = false,moduleItem?:any){
    if(!moduleItem?.id){
      moduleItem = this.trainerService.moduleItem
    }
    const scrollPosition = window.scrollY;
    if(field){
      this.firestore.setSub('trainers',this.nav.activeOrganisationId,'modules',moduleItem.id,moduleItem[field],field,()=>{
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
      else if(res=='download'){
        this.nav.goto(this.trainerService.moduleItem.photo,true)
      }
      else if(res=='generate'){
        if(!this.trainerService.checkIsTrainerPro()){
            return
        }
        this.createPhoto(this.trainerService.moduleItem)
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
              moduleItem.photo = responseData.imageURL
              this.update('photo')
            }
              console.log('hiding loader')
              this.toast.hideLoader()
            // }, 2000);

        }
      },{buttons:[{action:'standards_generate_photo',title:this.translate.instant('cases.generate_instructions_original'),color:'dark',fill:'outline'}]});

  }

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
        list = JSON.parse(JSON.stringify(this.trainerService.modules))
        list = list.filter((e:any) => {
          return e.id !== this.trainerService.moduleItem.id
        })
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
        console.log('infoItems',list)
        list = list.sort((a:any,b:any) => {
          return a.title.localeCompare(b.title)
        })
      }
      if(!list.length){
        this.toast.show(this.translate.instant('modules.no_available_items'))
        return
      }
      this.modalService.selectItem('Selecteer', list, (result: any) => {
        if (result.data) {
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
                  if(!this.trainerService.cases[j].modules){
                    this.trainerService.cases[j].modules = []
                  }
                  this.trainerService.cases[j].modules.push(this.trainerService.moduleItem.id)
                  this.firestore.setSub('trainers',this.nav.activeOrganisationId,'cases',result.data[i].id,this.trainerService.cases[j].modules,'modules',null,true)
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
                  if(!this.trainerService.cases[i].modules){
                    this.trainerService.cases[i].modules = []
                  }
                  this.trainerService.infoItems[j].modules.push(this.trainerService.moduleItem.id)
                  this.firestore.setSub('trainers',this.nav.activeOrganisationId,'infoItems',result.data[i].id,this.trainerService.infoItems[j].modules,'modules',null,true)
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
            if(!this.trainerService.cases[i].modules){
              this.trainerService.cases[i].modules = []
            }
            this.trainerService.cases[i].modules = this.trainerService.cases[i].modules.filter((e:any) => {
              return e !== this.trainerService.moduleItem.id
            })
            if(!this.trainerService.cases[i].modules.length){
              this.trainerService.cases[i].modules = []
            }
            this.firestore.setSub('trainers',this.nav.activeOrganisationId,'cases',item.id,this.trainerService.cases[i].modules,'modules',null,true)
          }
        }
      }
      else if(item.type=='infoItem'){
        for(let i=0;i<this.trainerService.infoItems.length;i++){
          if(this.trainerService.infoItems[i].id == item.id){
            if(!this.trainerService.cases[i].modules){
              this.trainerService.cases[i].modules = []
            }
            this.trainerService.infoItems[i].modules = this.trainerService.infoItems[i].modules.filter((e:any) => {
              return e !== this.trainerService.moduleItem.id
            })
            if(!this.trainerService.infoItems[i].modules.length){
              this.trainerService.infoItems[i].modules = []
            }
            this.firestore.setSub('trainers',this.nav.activeOrganisationId,'infoItems',item.id,this.trainerService.infoItems[i].modules,'modules',null,true)
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

    this.modalService.showVerification(this.translate.instant('modules.create_training'),this.translate.instant('tooltips.module_make_training'),[
      {
        title:this.translate.instant('buttons.cancel'),
        text:this.translate.instant('buttons.cancel'),
        color:'dark',
        fill:'clear',
        value:false
      },
      {
        title:this.translate.instant('modules.create_training'),
        text:this.translate.instant('modules.create_training'),
        color:'success',
        value:true,
      }
    ]).then((result:any) => {
      if(result){
        this.modalService.inputFields(this.translate.instant('modules.new_training'), this.translate.instant('modules.new_training_name'), [
          {
            type: 'text',
            title: 'Titel',
            name: 'Title',
            value: module.title,
            required: true,
          }], (result: any) => {
            if (result.data) {
              this.toast.showLoader()
              let training:any = JSON.parse(JSON.stringify(module))
              training.title = result.data[0].value
              training.created = Date.now()
              training.moduleId = training.id
              training.trainer_id = this.nav.activeOrganisationId
              training.status = 'concept'
              training.type_credits = 'unlimited'
              training.credits = 0
              training.amount_participants = 10
              training.expected_conversations = 3
              training.amount_period = 2
              delete training.id
              delete training.type
              this.firestore.createSub('trainers', this.nav.activeOrganisationId, 'trainings', training).then(() => {
                this.trainerService.loadTrainings(() => {
                  this.trainerService.trainingItem = this.trainerService.getTraining('',training.created)
                  
                  this.createItems(training.items,training.moduleId,() => {
                    this.trainerService.loadTrainingsAndParticipants(() => {
                      this.trainerService.trainingItem = this.trainerService.getTraining('',training.created)
                      this.trainerService.breadCrumbs = []
                      this.trainerService.breadCrumbs.push({
                        type: 'training',
                        item: this.trainerService.trainingItem,
                      })
                      this.nav.go('trainer/trainings')
                      this.toast.hideLoader()
                    })
                  })

                })
              })
            }
          })
      }
    })
  }

  createItems(items:any,moduleId:string,callback?:Function){
    for(let i=0;i<items.length;i++){
      let item = items[i]
      if(item.type == 'case'){
        item = this.trainerService.getCase(item.id)
        item.item_type = 'case'
        item.trainingId = this.trainerService.trainingItem.id
        item.trainer_id = this.nav.activeOrganisationId
        item.moduleId = moduleId
        item.order = i
        this.firestore.setSubSub('trainers', this.nav.activeOrganisationId, 'trainings', this.trainerService.trainingItem.id, 'items', item.id,item).then(() => {})
      }
      else if(item.type == 'infoItem'){
        item = this.trainerService.getInfoItem(item.id)
        item.item_type = 'infoItem'
        item.trainingId = this.trainerService.trainingItem.id
        item.trainer_id = this.nav.activeOrganisationId
        item.moduleId = moduleId
        item.order = i
        this.firestore.setSubSub('trainers', this.nav.activeOrganisationId, 'trainings', this.trainerService.trainingItem.id, 'items', item.id,item).then(() => {})
      }
      else if(item.type == 'module'){
        item = this.trainerService.getModule(item.id)
        item.item_type = 'module'
        item.trainingId = this.trainerService.trainingItem.id
        item.trainer_id = this.nav.activeOrganisationId
        item.moduleId = moduleId
        item.order = i
        this.firestore.setSubSub('trainers', this.nav.activeOrganisationId, 'trainings', this.trainerService.trainingItem.id, 'items', item.id,item).then(() => {})
        if(item.items && item.items.length){
          this.createItems(item.items,item.id)
        }
      }
    }
    if(callback){
      callback()
    }
  }

  setPageParam(){
    let param = ''
    param = 'trainer/modules'
    return param
  }

  setOptionsParam(){
    let param = ''
    if(!this.trainerService.moduleItem?.id){
      param = 'trainer/modules'
    }
    else if(this.trainerService.moduleItem?.id){
      param = 'trainer/modules/item'
    }
    return param
  }

  reloadMenu(){
    setTimeout(() => {
      this.nav.reloadMenu.emit(true)
    }, 10);
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

}
