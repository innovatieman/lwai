import { Component, OnInit, ViewChild } from '@angular/core';
import { IonInfiniteScroll } from '@ionic/angular';
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

@Component({
  selector: 'app-cases',
  templateUrl: './cases.page.html',
  styleUrls: ['./cases.page.scss'],
})
export class CasesPage implements OnInit {
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;
  // caseItem: any={};
  searchTerm: string = '';
  categories: any[] = [];
  selectedModule:string = '';
  showBasics: boolean = false;
  showUserInput: boolean = false;
  showUserInputMore: boolean = true;
  showCasus: boolean = false;
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
    private modalService:ModalService,
    public translate:TranslateService,
    public infoService:InfoService,
    public helpers:HelpersService,
    private filterSearchPipe:FilterSearchPipe,
    private filterKeyPipe:FilterKeyPipe,
    public levelService:LevelsService
  ) { }

  ngOnInit() {
    this.auth.userInfo$.subscribe(userInfo => {
      if (userInfo) {
        this.auth.hasActive('trainer').subscribe((trainer)=>{
          if(trainer &&!this.casesLoaded){
            this.trainerService.loadCases(()=>{
              this.updateVisibleCases();
              this.casesLoaded = true
            });
            this.trainerService.loadModules(()=>{
              // this.trainerService.modules = this.trainerService.modules
            })
          }
        })
      }
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


  addCase(){
    this.toast.showLoader()
    let casus = this.trainerService.defaultCase()
    this.firestore.createSub('trainers',this.auth.userInfo.uid,'cases',casus).then(()=>{
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

  deleteCase(){
    this.modalService.showConfirmation('Are you sure you want to delete this case?').then((result:any) => {
      if(result){
        let id = this.trainerService.caseItem.id
        this.firestore.deleteSub('trainers',this.auth.userInfo.uid,'cases',this.trainerService.caseItem.id)
        this.trainerService.caseItem = {}
        this.trainerService.loadCases()
        for(let i=0;i<this.trainerService.modules.length;i++){
          let module = this.trainerService.modules[i]
          for(let j=0;j<module.items.length;j++){
            if(module.items[j].id == id){
              module.items.splice(j,1)
              break
            }
          }
          this.firestore.updateSub('trainers',this.auth.userInfo.uid,'modules',module.id,{items:module.items},()=>{})
        }
      }
    })
  }

  selectCasus(casus:any){
    this.trainerService.caseItem = casus
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

  caseReady(part:string){
    let check = false
    switch(part){
      case 'title':
        check = this.trainerService.caseItem?.title && this.trainerService.caseItem?.user_info && this.trainerService.caseItem?.open_to_user
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
    if(field){
      this.firestore.setSub('trainers',this.auth.userInfo.uid,'cases',caseItem.id,caseItem[field],field,()=>{
        setTimeout(() => {
          window.scrollTo(0, scrollPosition);
        }, 100);
      },isArray)
    }
  }
  
  onToggleChange(key: any, event: any) {
    this.trainerService.caseItem.editable_by_user[key] = event.detail.checked;
    this.update('editable_by_user');
  }


  generateCasus(event:Event,caseItem:any){
    event.preventDefault()
    event.stopPropagation()
    
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
        this.firestore.setSub('trainers',this.auth.userInfo.uid,'cases',res.id,res).then(()=>{
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
        this.firestore.update('cases_trainer',this.trainerService.caseItem.id,{casus:result.data.value,translate:false})
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
      // else if(res=='generate'){
      //   this.createPhoto(this.trainerService.caseItem)
      // }
    },false)
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
        this.firestore.createSub('trainers', this.auth.userInfo.uid, 'modules', module).then(() => {
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
        let oldList = JSON.parse(JSON.stringify(this.trainerService.caseItem.modules))
        this.trainerService.caseItem.modules = result.data.map((e:any) => {
          return e.id
        })
        let newList = this.trainerService.caseItem.modules
        console.log(oldList,newList)
        this.firestore.setSub('trainers', this.auth.userInfo.uid, 'cases', this.trainerService.caseItem.id, this.trainerService.caseItem.modules, 'modules', () => {
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
            this.firestore.updateSub('trainers', this.auth.userInfo.uid, 'modules', oldList[i], {items:course.items}, () => {})
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
            this.firestore.updateSub('trainers', this.auth.userInfo.uid, 'modules', newList[i], {items:course.items}, () => {})
          }
        }



      }
    }, undefined, 'modules',{multiple:true,object:true,field:'title'})

  }

  copyCase(){
    let copy = JSON.parse(JSON.stringify(this.trainerService.caseItem))
    delete copy.id
    copy.created = Date.now()
    copy.title = copy.title + ' (copy)'
    copy.open_to_user = false
    this.firestore.createSub('trainers',this.auth.userInfo.uid,'cases',copy).then(()=>{
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
      else{
        this.trainerService.caseItem = {}
      }
    }
    else{
      this.trainerService.caseItem = {}
      this.trainerService.breadCrumbs = []
    }
  }

  practice(){}
}
