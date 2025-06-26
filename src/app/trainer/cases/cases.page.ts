import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { IonInfiniteScroll, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { title } from 'process';
import { AuthService } from 'src/app/auth/auth.service';
import { MenuPage } from 'src/app/components/menu/menu.page';
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
import { SelectMenuService } from 'src/app/services/select-menu.service';
import { ToastService } from 'src/app/services/toast.service';
import { TrainerService } from 'src/app/services/trainer.service';
import * as moment from 'moment';

@Component({
  selector: 'app-cases',
  templateUrl: './cases.page.html',
  styleUrls: ['./cases.page.scss'],
})
export class CasesPage implements OnInit {
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;
  @ViewChild('import_item') import_item!: ElementRef;
  
  [x:string]: any;
  searchTerm: string = '';
  categories: any[] = [];
  selectedModule:string = '';
  showBasics: boolean = false;
  showUserInput: boolean = false;
  showUserInputMore: boolean = true;
  showUserhelp: boolean = false;
  showCasus: boolean = false;
  showKnowledge: boolean = false;
  showUserOptions: boolean = false;
  filteredCases: any[] = [];
  visibleCases: any[] = [];
  maxCases: number = 15;
  casesLoaded: boolean = false;
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
    public selectMenuservice:SelectMenuService,
    private popoverController:PopoverController,
  ) { }

  ngOnInit() {
    this.auth.userInfo$.subscribe(userInfo => {
      if (userInfo) {
        this.auth.hasActive('trainer').subscribe((trainer)=>{
          // console.log('trainer',trainer,this.casesLoaded)
          if(trainer &&!this.casesLoaded){
            // console.log('loading cases')
            this.trainerService.loadCases(()=>{
              // console.log('cases loaded')
              this.updateVisibleCases();
              // console.log(this.trainerService.cases)
              this.casesLoaded = true
            });
            this.trainerService.loadModules(()=>{
              // this.trainerService.modules = this.trainerService.modules
            })
          }
        })
      }
    })

    this.nav.organisationChange.subscribe((res)=>{
      this.trainerService.loadCases(()=>{
        this.updateVisibleCases();
      })
      this.trainerService.loadModules(()=>{
        // this.trainerService.modules = this.trainerService.modules
      })
    })
    
    this.nav.changeLang.subscribe((res)=>{
      this.updateVisibleCases();
    })

    this.loadCategories()


  }

  private loadCategories() {
    let catsSubscription = this.firestore.get('categories').subscribe((categories) => {
      this.categories = categories.map( (category:any) => {
        // add OpeningMessage tot the category
        let catData = category.payload.doc.data()
        this.getOpeningMessage(category.payload.doc.id,(result:any) => {
          this.addToCategory(category.payload.doc.id,'openingMessage',result)
        })
        return { id: category.payload.doc.id, ...catData }
        // console.log(catData)
      })
      catsSubscription.unsubscribe()
    })
  }

  addToCategory(category:string,field:string,value:any){
    for(let i=0;i<this.categories.length;i++){
      if(this.categories[i].id === category){
        this.categories[i][field] = value
      }
    }
  }

  shortMenu:any
  onRightClick(event:Event,item:any){
    event.preventDefault()
    event.stopPropagation()
    let list = [
      {
        title:this.translate.instant('cases.edit_case'),
        icon:'faEdit',
        value:'edit'
      },
      {
        title:this.translate.instant('cases.copy_case'),
        icon:'faCopy',
        value:'copy'
      },
      {
        title:this.translate.instant('cases.remove_case'),
        icon:'faTrashAlt',
        value:'delete'
      },
      {
        title:this.translate.instant('cases.practice'),
        icon:'faComment',
        value:'practice'
      },
      {
        title:this.translate.instant('cases.export_case'),
        icon:'faFileExport',
        value:'export'
      },
    ]
    this.showshortMenu(event,list,(result:any)=>{
      if(result?.value){
        switch(result.value){
          case 'edit':
            this.selectCasus(item)
            break;
          case 'delete':
            this.deleteCase(item)
            break;
          case 'copy':
            this.copyCase(item)
            break;
          case 'practice':
            this.practice(item)
            break;
          case 'export':
            this.exportItem(item)
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

  importCase(){
    this.modalService.showInfo({
      title:this.translate.instant('cases.use_template'),
      content:this.translate.instant('cases.import_case_info'),
      image:'assets/img/copy_case.png',
      image_width:'50%',
      image_up:true,
      buttons:[
        {
          text:this.translate.instant('buttons.search'),
          color:'primary',
          value:'search_case'
        },
        {
          text:this.translate.instant('buttons.ok'),
          color:'secondary',
          value:''
        }
      ]},( result:any) => {
        if(result.data && result.data == 'search_case'){
          this.nav.go('start/cases/search')
        }
      }
    )
  }


  addCase(){
    this.toast.showLoader()
    let casus = this.trainerService.defaultCase()
    this.firestore.createSub('trainers',this.nav.activeOrganisationId,'cases',casus).then(()=>{
      this.trainerService.loadCases(()=>{
        let item = this.trainerService.cases.filter((e:any) => {
          return e.created === casus.created
        })
        if(item.length){
          this.trainerService.caseItem = item[0]
        }
        else{
          this.trainerService.caseItem = {}
        }
        this.toast.hideLoader()
      })
    })
  }

  deleteCase(caseItem?:any){
    if(!caseItem?.id){
      if(!this.trainerService.caseItem.id){
        this.toast.show('Selecteer een casus')
        return
      }
      caseItem = this.trainerService.caseItem
    }
    this.modalService.showConfirmation('Are you sure you want to delete this case?').then((result:any) => {
      if(result){
        let id = caseItem.id
        console.log('deleting case',id)
        this.firestore.deleteSub('trainers',this.nav.activeOrganisationId,'cases',caseItem.id).then(()=>{
          console.log('deleted case')
        })
        this.trainerService.caseItem = {}
        this.trainerService.loadCases()
        for(let i=0;i<this.trainerService.modules.length;i++){
          let change = false
          let module = this.trainerService.modules[i]
          if(module.items?.length){
            for(let j=0;j<module.items.length;j++){
              if(module.items[j].id == id){
                module.items.splice(j,1)
                change = true
              }
            }
          }
          if(change){
            this.firestore.updateSub('trainers',this.nav.activeOrganisationId,'modules',module.id,{items:module.items},()=>{})
          }
        }
      }
    })
  }

  selectCasus(casus:any){
    this.trainerService.caseItem = casus
    if(!this.trainerService.caseItem.extra_knowledge){
      this.trainerService.caseItem.extra_knowledge = ''
    }
    this.reloadMenu()
    // console.log(this.trainerService.caseItem)
  }

  caseNotReady(){
    let check = 
      this.trainerService.caseItem?.title == '' || 
      this.trainerService.caseItem?.role == '' ||
      this.trainerService.caseItem?.user_info == '' ||
      ! this.trainerService.caseItem?.level ||
      !this.trainerService.caseItem?.attitude ||
      !this.trainerService.caseItem?.steadfastness ||
      this.trainerService.caseItem?.conversation == '' ||
      this.trainerService.caseItem?.photo == '' ||
      (
        this.trainerService.caseItem?.editable_by_user?.free_answer == true &&
        this.trainerService.caseItem?.free_question == ''
      )

      return check
  }

  showFieldsStatus(part:string,event:Event){
    if(event){
      event.stopPropagation()
    }
    this.modalService.showText(this.caseReadyInfo(part),this.translate.instant('error_messages.not_complete'))
  }

  caseReadyInfo(part:string){
    let text = ''
    let fields = []
    switch(part){
      case 'title':
        if(!this.trainerService.caseItem?.title){
          fields.push(this.translate.instant('cases.title'))
        }
        if(!this.trainerService.caseItem?.user_info){
          fields.push(this.translate.instant('cases.short_info'))
        }
        text = text + this.translate.instant('cases.check_incomplete') + '<ul>'// + fields.join(', ')
        for(let i=0;i<fields.length;i++){
          text = text + '<li>'+fields[i]+'</li>'
        }
        text = text + '</ul>'
        return text
      case 'basics':
        if(!this.trainerService.caseItem?.conversation){
          fields.push(this.translate.instant('cases.conversation_technique'))
        }
        if(!this.trainerService.caseItem?.role){
          fields.push(this.translate.instant('cases.role'))
        }
        if(!this.trainerService.caseItem?.level){
          fields.push(this.translate.instant('cases.level'))
        }
        if(!this.trainerService.caseItem?.attitude){
          fields.push(this.translate.instant('cases.attitude'))
        }
        if(!this.trainerService.caseItem?.steadfastness){
          fields.push(this.translate.instant('cases.steadfastness'))
        }
        if(!this.trainerService.caseItem?.photo){
          fields.push(this.translate.instant('cases.photo'))
        }
        
        if(fields.length){
          text = text + this.translate.instant('cases.check_incomplete') + '<ul>'// + fields.join(', ')
          for(let i=0;i<fields.length;i++){
            text = text + '<li>'+fields[i]+'</li>'
          }
          text = text + '</ul>'
        }
        if(!this.trainerService.caseItem?.modules?.length){
          // if(text.length){
          //   text = text + '<br>'
          // }
          text = text + this.translate.instant('cases.no_connected_modules')

        }
        return text
    }
    return ''
  }


  caseReady(part:string){
    let check = false
    switch(part){
      case 'title':
        check = this.trainerService.caseItem?.title && this.trainerService.caseItem?.user_info
        break;
      case 'basics':
        check = this.trainerService.caseItem?.role && this.trainerService.caseItem?.conversation && this.trainerService.caseItem?.level && this.trainerService.caseItem?.attitude && this.trainerService.caseItem?.steadfastness && this.trainerService.caseItem?.photo && this.trainerService.caseItem?.modules?.length
        break;
      // case 'looks':
      //   check = this.trainerService.caseItem?.photo
      //   break;
      case 'settings':
        check = this.trainerService.caseItem.translate && this.trainerService.caseItem?.open_to_user
        break;
      case 'input':
        check = ((this.trainerService.caseItem.openingMessage && this.trainerService.caseItem.editable_by_user.openingMessage) || !this.trainerService.caseItem.editable_by_user.openingMessage) && ((this.trainerService.caseItem.editable_by_user.free_answer && this.trainerService.caseItem?.free_question) || !this.trainerService.caseItem.editable_by_user.free_answer)
        break;
      default:
        check = false
    }
    return check
  }

  async startTranslation(caseItem?:any){
    let id = ''
    if(!caseItem?.id){
      if(!this.trainerService.caseItem.id){
        this.toast.show('Selecteer een casus')
        return
      }
      id = this.trainerService.caseItem.id
    }
    else{
      id = caseItem.id
    }
    let list:any[] = []
    this.nav.langList.forEach((lang)=>{
      list.push({
        value:lang,
        title:this.translate.instant('languages.'+lang),
        icon:'faGlobeEurope'
      })
    })
    this.modalService.inputFields('Selecteer de originele taal','',[{
      type:'select',
      placeholder:'Selecteer de originele taal',
      value:this.translate.currentLang,
      optionKeys:list
    }],(result:any)=>{
      if(result.data){
        this.firestore.update('cases_trainer',id!,{original_language:result.data[0].value,translate:false})
        setTimeout(() => {
          this.firestore.update('cases_trainer',id!,{original_language:result.data[0].value,translate:true}).then(()=>{
            if(this.trainerService.caseItem.id){
              this.trainerService.caseItem = {}
            }
          })
        }, 1000);
        this.toast.show('Translation started')
      }
    })
     
  }
  
  categoryInfo(id:string){
    if(!this.categories.length) return {}
    let category = this.categories.filter((e:any) => {
      return e.id === id
    })
    return category[0]
  }

  async getOpeningMessage(category:string,callback:Function){
    let openingMessage = ''
    this.infoService.loadPublicInfo('categories',category,'content','agents','reaction',(result:any) => {
      openingMessage = result
      callback(openingMessage)
    })
  }

  changeCategory(){
    setTimeout(() => {
      this.trainerService.caseItem.openingMessage = this.categoryInfo(this.trainerService.caseItem.conversation).openingMessage
      this.update('openingMessage')
      this.toast.show(this.translate.instant('cases.change_category_message'))
    }, 100);
  }

  update(field?:string,isArray:boolean = false,caseItem?:any){
    if(!caseItem?.id){
      caseItem = this.trainerService.caseItem
    }
    const scrollPosition = window.scrollY;

    if(this.trainerService.breadCrumbs && this.trainerService.breadCrumbs[0]?.type == 'training'){
      if(field){
        this.firestore.setSubSub('trainers',this.nav.activeOrganisationId,'trainings',this.trainerService.breadCrumbs[0].item.id,'items',caseItem.id,caseItem[field],field,()=>{
          setTimeout(() => {
            window.scrollTo(0, scrollPosition);
          }, 100);
        },isArray)
      }
    }
    else{
      if(field){
        this.firestore.setSub('trainers',this.nav.activeOrganisationId,'cases',caseItem.id,caseItem[field],field,()=>{
          setTimeout(() => {
            window.scrollTo(0, scrollPosition);
          }, 100);
        },isArray)
      }
    }
  }
  
  onToggleChange(key: any, event: any) {
    this.trainerService.caseItem.editable_by_user[key] = event.detail.checked;
    this.update('editable_by_user');
  }


  generateCasus(event:Event,caseItem:any){
    event.preventDefault()
    event.stopPropagation()
    
    if(!caseItem?.conversation){
      this.toast.show(this.translate.instant('cases.select_conversation_technique'))
      return
    }

    caseItem.existing = true

    this.modalService.generateCase({admin:true,conversationInfo:this.categoryInfo(this.trainerService.caseItem.conversation),...caseItem}).then((res:any)=>{
          console.log(res)
      if(res && res.id){
        delete res.admin
        delete res.conversationInfo
        delete res.existing
        if(res.casus!=caseItem.casus){
          res.translate = false
        }
        this.firestore.setSub('trainers',this.nav.activeOrganisationId,'cases',res.id,res).then(()=>{
          this.trainerService.loadCases(()=>{
            let item = this.trainerService.cases.filter((e:any) => {
              return e.created === res.created
            })
            if(item.length){
              this.trainerService.caseItem = item[0]
            }
            else{
              this.trainerService.caseItem = {}
            }
          })
        })
      }
    })
  }

  editCasus(event:Event){
    event.preventDefault()
    event.stopPropagation()

    this.modalService.editHtmlItem({value:this.trainerService.caseItem.casus},(result:any)=>{
      if(result.data && result.data.value!=this.trainerService.caseItem.casus){
        this.trainerService.caseItem.casus = result.data.value
        this.trainerService.caseItem.translate = false
        this.update('casus')
        // this.firestore.update('cases_trainer',this.trainerService.caseItem.id,{casus:result.data.value,translate:false})
      }
    })

  }

  async selectAvatar(event:Event){
    this.media.selectAvatar(event,(res:any)=>{
      console.log(res)
      if(res?.status==200&&res?.result.url){
        this.trainerService.caseItem.photo = res.result.url
        this.trainerService.caseItem.avatarName = ''
        this.update('photo')
        this.update('avatarName')
      }
      else if(res=='delete'){
        this.trainerService.caseItem.photo = ''
        this.trainerService.caseItem.avatarName = ''
        this.update('photo')
        this.update('avatarName')
      }
      else if(res.type=='library'){
        this.trainerService.caseItem.photo = res.url
        this.trainerService.caseItem.avatarName = ''
        this.update('photo')
        this.update('avatarName')
      }
      else if(res=='generate'){
        if(!this.trainerService.checkIsTrainerPro()){
            return
        }
        this.createPhoto(this.trainerService.caseItem)
      }
      else if(res=='download'){
        this.nav.goto(this.trainerService.caseItem.photo,true)
      }
    },true)
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

  updateVisibleCases() {
    // <!-- <ion-col [size]="helpers.cardSizeSmall" *ngFor="let caseItem of cases | caseFilter: currentFilterTypes.types : currentFilterTypes.subjectTypes : extraFilters.open_to_user | filterSearch : searchTerm : false : ['title']"> -->

    // const filtered = this.caseFilterPipe.transform(
    //   this.trainerService.cases,
    //   this.currentFilterTypes.types,
    //   this.currentFilterTypes.subjectTypes,
    //   this.extraFilters.open_to_user
    // );
  
    const searched = this.filterSearchPipe.transform(
      this.trainerService.cases,
      this.searchTerm,
      false,
      ['title','role','user_info','tags']
    );
  
    const extraFiltered2 = this.filterKeyPipe.transform(
      searched,
      'modules',
      this.selectedModule
    );

    // const extraFiltered3 = this.filterKeyPipe.transform(
    //   extraFiltered2,
    //   'free_question',
    //   this.extraFilters.photo
    // );

    this.filteredCases = extraFiltered2;
    // this.filteredCases = this.filteredCases.sort((a, b) => a.order_rating - b.order_rating);
    this.visibleCases = this.filteredCases.slice(0, this.maxCases);
    if (this.infiniteScroll) {
      this.infiniteScroll.disabled = this.visibleCases.length >= this.filteredCases.length;
    }
    setTimeout(() => {
      // console.log('disabled: ', this.visibleCases.length >= this.filteredCases.length)
      this.infiniteScroll.disabled = this.visibleCases.length >= this.filteredCases.length;
    }, 400);
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
          this.trainerService.loadModules()
        })
      }
    })
  }

  selectModules(modules:any){
    if(!modules){
      modules = []
    }
    let list:any[] =[]
    for(let i=0;i<this.trainerService.modules.length;i++){
      let item:any = {}
      item.id = this.trainerService.modules[i].id
      item.title = this.trainerService.modules[i].title
      item.value = this.trainerService.modules[i].title
      if(modules.includes(item.id)){
        item.selected = true
      }
      list.push(item)
    }
    
    this.modalService.selectItem('Selecteer de modules', list, (result: any) => {
      if (result.data) {
        let oldList = []
        if(this.trainerService.caseItem.modules){
          oldList = JSON.parse(JSON.stringify(this.trainerService.caseItem.modules))
        }
        this.trainerService.caseItem.modules = result.data.map((e:any) => {
          return e.id
        })
        let newList = this.trainerService.caseItem.modules
        console.log(oldList,newList)
        this.firestore.setSub('trainers', this.nav.activeOrganisationId, 'cases', this.trainerService.caseItem.id, this.trainerService.caseItem.modules, 'modules', () => {
          this.trainerService.loadCases()
        }, true)

        for(let i=0;i<oldList.length;i++){
          if(!newList.includes(oldList[i])){
            let course = this.trainerService.getModule(oldList[i])
            for(let j=0;j<course.items.length;j++){
              if(course.items[j].id == this.trainerService.caseItem.id){
                course.items.splice(j,1)
                break
              }
            }
            this.firestore.updateSub('trainers', this.nav.activeOrganisationId, 'modules', oldList[i], {items:course.items}, () => {})
          }
        }
        for(let i=0;i<newList.length;i++){
          if(!oldList.includes(newList[i])){
            let course = this.trainerService.getModule(newList[i])
            if(!course.items){
              course.items = []
            }
            course.items.push({
              id:this.trainerService.caseItem.id,
              title:this.trainerService.caseItem.title,
              created:Date.now(),
              order:999,
              type:'case'
            })
            this.firestore.updateSub('trainers', this.nav.activeOrganisationId, 'modules', newList[i], {items:course.items}, () => {})
          }
        }



      }
    }, undefined, 'modules',{multiple:true,object:true,field:'title',allowEmpty:true})

  }

  copyCase(caseItem?:any){
    if(!caseItem?.id){
      if(!this.trainerService.caseItem.id){
        this.toast.show('Selecteer een casus')
        return
      }
      caseItem = this.trainerService.caseItem
    }
    let copy = JSON.parse(JSON.stringify(caseItem))
    delete copy.id
    copy.created = Date.now()
    copy.title = copy.title + ' (copy)'
    copy.open_to_user = false
    this.firestore.createSub('trainers',this.nav.activeOrganisationId,'cases',copy).then(()=>{
      this.trainerService.loadCases(()=>{
        let item = this.trainerService.cases.filter((e:any) => {
          return e.created === copy.created
        })
        if(item.length){
          this.trainerService.caseItem = item[0]
        }
        else{
          this.trainerService.caseItem = {}
        }
      })
    })
  }

  back(){
    if(this.trainerService.breadCrumbs.length>1){
      this.trainerService.breadCrumbs.pop()
      let item = this.trainerService.breadCrumbs[this.trainerService.breadCrumbs.length-1]
      if(item.type == 'module'){
        this.trainerService.moduleItem = item.item
        this.nav.go('trainer/modules')
        this.trainerService.caseItem = {}
      }
      else if(item.type == 'training'){
        this.trainerService.trainingItem = item.item
        // console.log(this.trainerService.trainingItem)
        setTimeout(() => {
          console.log(this.trainerService.trainingItem)  
        }, 1000);
        this.nav.go('trainer/trainings')
        this.trainerService.caseItem = {}
      }
      else{
        this.trainerService.caseItem = {}
      }
    }
    else{
      this.trainerService.caseItem = {}
      this.trainerService.breadCrumbs = []
    }
  }

  practice(item?:any){
    if(this.caseNotReady()){
      this.toast.show(this.translate.instant('error_messages.not_complete'))
      return
    }
    if(!item?.id){
      if(!this.trainerService.caseItem.id){
        this.toast.show('Selecteer een casus')
        return
      }
      item = this.trainerService.caseItem
    }
    if(item.translation){
      item.role = item.translation.role
      if(item.translation.free_question){
       item.free_question = item.translation.free_question
      }
    }
    this.modalService.showConversationStart(item).then((res)=>{
      // console.log(res)
      if(res){
        localStorage.setItem('activatedCase',item.id)
        localStorage.setItem('personalCase',JSON.stringify(item))
        this.nav.go('conversation/'+item.id)
      }
    })
  }

  async createPhoto(caseItem:any){
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
              caseItem.photo = responseData.imageURL
              this.update('photo')
            }
              console.log('hiding loader')
              this.toast.hideLoader()
            // }, 2000);

        }
      },{buttons:[{action:'standards_generate_photo',title:this.translate.instant('cases.generate_instructions_original'),color:'dark',fill:'outline'}]});

  }

  selectDate(event:any,field:string,showTime?:boolean | null,min?:any,max?:any){
    event.stopPropagation()
    let date:any = this.trainerService.caseItem[field]
    if(!date){date=moment()}
    else{ date = moment(date) }
    this.toast.selectDate(date,(response:any)=>{
      if(response){
        this.trainerService.caseItem[field] = moment(response).format('YYYY-MM-DD')
        this.update(field)
      }
    },showTime,{min:min,max:max})
  }
  
  clearDate(event:Event,field:string){
    event.stopPropagation()
    this.trainerService.caseItem[field] = ''
    this.update(field)
  }

  setPageParam(){
    let param = ''
    param = 'trainer/cases'
    return param
  }

  setOptionsParam(){
    let param = ''
    if(!this.trainerService.caseItem?.id){
      param = 'trainer/cases'
    }
    else if(this.trainerService.caseItem?.id){
      param = 'trainer/cases/item'
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

  exportItem(item:any){
    item.exportedType = 'case'
    const obj = JSON.parse(JSON.stringify(item));
    
    const base64 = this.encodeObjectToBase64(obj); // encode naar base64

    const blob = new Blob([base64], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    let title = 'case'
    if(item.title){
      title = item.title.replace(/[^a-zA-Z0-9]/g, '_'); // vervang speciale tekens door _
    }
    link.download = 'export_'+title+'.alicialabs';
    link.click();

  }

  importClick(){
    if(!this.trainerService.checkIsTrainerPro()){
        return
    }
    this.import_item.nativeElement.click();
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
    if(!fileData || fileData.exportedType !== 'case') {
      this.toast.show(this.translate.instant('error_messages.invalid_file'), 4000, 'middle');
      return;
    }
    let newItem:any = {}

    try {
        newItem.created = Date.now();
        newItem.conversation = fileData.conversation || '';
        newItem.title = fileData.title + ' - import' || 'import case';
        newItem.role = fileData.role || '';
        newItem.free_question = fileData.free_question || '';
        newItem.free_question2 = fileData.free_question2 || '';
        newItem.free_question3 = fileData.free_question3 || '';
        newItem.free_question4 = fileData.free_question4 || '';
        newItem.tags = fileData.tags || [];
        newItem.order_rating = fileData.order_rating || 0;
        newItem.photo = fileData.photo || '';
        newItem.avatarName = fileData.avatarName || '';
        newItem.level = fileData.level || 1;
        newItem.translate = fileData.translate || false;
        newItem.user_role = fileData.user_role || '';
        newItem.user_info = fileData.user_info || '';
        newItem.attitude = fileData.attitude || 1;
        newItem.steadfastness = fileData.steadfastness || 50;
        newItem.casus = fileData.casus || '';
        newItem.goalsItems = fileData.goalsItems || {
          phases: [],
          free: '',
          attitude: 0,
        };
        newItem.max_time = fileData.max_time || 30;
        newItem.minimum_goals = fileData.minimum_goals || 0;
        newItem.openingMessage = fileData.openingMessage || '';
        newItem.goal = fileData.goal || false;
        newItem.editable_by_user = fileData.editable_by_user || {
          role: false,
          description: false,
          user_role: false,
          function: false,
          vision: false,
          interests: false,
          communicationStyle: false,
          externalFactors: false,
          history: false,
          attitude: false,
          steadfastness: false,
          casus: false,
          goals: {
            phases: false,
            free: true,
            attitude: false,
          },
          max_time: false,
          minimum_goals: false,
          openingMessage: true,
          agents: {
            choices: true,
            facts: true,
            background: true,
            undo: true,
          }
        };
      
    }
     catch (error) {
      this.toast.show(this.translate.instant('error_messages.invalid_file'), 4000, 'middle');
      return;
    }
    this.firestore.createSub('trainers', this.nav.activeOrganisationId, 'cases', newItem,(res:any) => {
      if(res && res.id){
        this.trainerService.loadCases(() => {
          let item = this.trainerService.cases.filter((e:any) => {
            return e.created === newItem.created
          })
          if(item.length){
            this.trainerService.caseItem = item[0]
          }
          else{
            this.trainerService.caseItem = {}
          }
          // this.toast.show(this.translate.instant('cases.case_imported_successfully'))
        });
      } else {
        this.toast.show(this.translate.instant('error_messages.import_failed'), 4000, 'middle');
      }
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


}
