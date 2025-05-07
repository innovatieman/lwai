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
  selector: 'app-info-items',
  templateUrl: './info-items.page.html',
  styleUrls: ['./info-items.page.scss'],
})
export class InfoItemsPage implements OnInit {

    @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;
    // caseItem: any={};
    searchTerm: string = '';
    // categories: any[] = [];
    selectedModule:string = '';
    showBasics: boolean = false;
    showUserInput: boolean = false;
    showUserInputMore: boolean = true;
    showCasus: boolean = false;
    showUserOptions: boolean = false;
    filteredItems: any[] = [];
    visibleItems: any[] = [];
    maxItems: number = 15;
    itemsLoaded: boolean = false;
    showHtml: boolean = false;
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
            if(trainer &&!this.itemsLoaded){
              this.trainerService.loadInfoItems(()=>{
                this.updateVisibleItems();
                this.itemsLoaded = true
              });
              this.trainerService.loadModules(()=>{
                // this.trainerService.modules = this.trainerService.modules
              })
            }
          })
        }
      })
  
      
      this.nav.changeLang.subscribe((res)=>{
        this.updateVisibleItems();
      })

  
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
  
  
    addItem(){
      this.toast.showLoader()
      let infoItem = this.trainerService.defaultInfoItem()
      this.firestore.createSub('trainers',this.auth.userInfo.uid,'infoItems',infoItem).then(()=>{
        this.trainerService.loadCases(()=>{
          let item = this.trainerService.cases.filter((e:any) => {
            return e.created === infoItem.created
          })
          if(item.length){
            this.trainerService.infoItem = item[0]
          }
          else{
            this.trainerService.infoItem = {}
          }
          this.toast.hideLoader()
        })
      })
    }
  
    deleteItem(){
      this.modalService.showConfirmation('Are you sure you want to delete this item?').then((result:any) => {
        if(result){
          let id = this.trainerService.infoItem.id
          this.firestore.deleteSub('trainers',this.auth.userInfo.uid,'infoItems',this.trainerService.infoItem.id)
          this.trainerService.infoItem = {}
          this.trainerService.loadInfoItems()
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
  
    selectInfoItem(infoItem:any){
      this.trainerService.infoItem = infoItem
      // console.log(this.trainerService.infoItem)
    }
  
    itemNotReady(){
      let check = 
        this.trainerService.infoItem?.title == '' || 
        this.trainerService.infoItem?.description == '' ||
        (this.trainerService.infoItem?.content == '' && this.trainerService.infoItem?.type=='text') ||
        (this.trainerService.infoItem?.video_url == '' && this.trainerService.infoItem?.type=='video') ||
        (this.trainerService.infoItem?.audio_url == '' && this.trainerService.infoItem?.type=='audio') ||
        (this.trainerService.infoItem?.photo == '' && this.trainerService.infoItem?.type=='image_only')
        return check
    }
  
    itemReady(part:string){
      let check = false
      switch(part){
        case 'title':
          check = this.trainerService.infoItem?.title && 
                  this.trainerService.infoItem?.user_info && 
                  this.trainerService.infoItem?.open_to_user //&&
                  // this.trainerService.infoItem?.modules.length
          break;
        case 'content':
          check = (this.trainerService.infoItem?.content != '' && this.trainerService.infoItem?.type=='text') ||
                  (this.trainerService.infoItem?.video_url != '' && this.trainerService.infoItem?.type=='video') ||
                  (this.trainerService.infoItem?.audio_url != '' && this.trainerService.infoItem?.type=='audio') ||
                  (this.trainerService.infoItem?.photo != '' && this.trainerService.infoItem?.type=='image_only')
          break;
        default:
          check = false
      }
      return check
    }
  
    async startTranslation(caseItem?:any){
      let id = ''
      if(!caseItem?.id){
        if(!this.trainerService.infoItem.id){
          this.toast.show('Selecteer een casus')
          return
        }
        id = this.trainerService.infoItem.id
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
              if(this.trainerService.infoItem.id){
                this.trainerService.infoItem = {}
              }
            })
          }, 1000);
          this.toast.show('Translation started')
        }
      })
       
    }
    
    update(field?:string,isArray:boolean = false,infoItem?:any){
      if(!infoItem?.id){
        infoItem = this.trainerService.infoItem
      }
      const scrollPosition = window.scrollY;
      if(field){
        this.firestore.setSub('trainers',this.auth.userInfo.uid,'infoItems',infoItem.id,infoItem[field],field,()=>{
          setTimeout(() => {
            window.scrollTo(0, scrollPosition);
          }, 100);
        },isArray)
      }
    }

    async selectAvatar(event:Event){
      this.media.selectAvatar(event,(res:any)=>{
        console.log(res)
        if(res?.status==200&&res?.result.url){
          this.trainerService.infoItem.photo = res.result.url
          this.trainerService.infoItem.avatarName = ''
          this.update('photo')
          this.update('avatarName')
        }
        else if(res=='delete'){
          this.trainerService.infoItem.photo = ''
          this.trainerService.infoItem.avatarName = ''
          this.update('photo')
          this.update('avatarName')
        }
        else if(res.type=='library'){
          this.trainerService.infoItem.photo = res.url
          this.trainerService.infoItem.avatarName = ''
          this.update('photo')
          this.update('avatarName')
        }
        // else if(res=='generate'){
        //   this.createPhoto(this.trainerService.infoItem)
        // }
      },false,true)
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
        this.trainerService.infoItems,
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
  
      this.filteredItems = extraFiltered2;
      // this.filteredItems = this.filteredItems.sort((a, b) => a.order_rating - b.order_rating);
      this.visibleItems = this.filteredItems.slice(0, this.maxItems);
      if (this.infiniteScroll) {
        this.infiniteScroll.disabled = this.visibleItems.length >= this.filteredItems.length;
      }
      setTimeout(() => {
        // console.log('disabled: ', this.visibleItems.length >= this.filteredItems.length)
        this.infiniteScroll.disabled = this.visibleItems.length >= this.filteredItems.length;
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
          this.trainerService.infoItem.modules = result.data.map((e:any) => {
            return e.id
          })
          this.firestore.setSub('trainers', this.auth.userInfo.uid, 'infoItems', this.trainerService.infoItem.id, this.trainerService.infoItem.modules, 'modules', () => {
            this.trainerService.loadCases()
          }, true)
        }
      }, undefined, 'modules',{multiple:true,object:true,field:'title'})
  
    }
  
    copyItem(){
      let copy = JSON.parse(JSON.stringify(this.trainerService.infoItem))
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
            this.trainerService.infoItem = item[0]
          }
          else{
            this.trainerService.infoItem = {}
          }
          this.toast.show('Je kunt nu de kopie bewerken')
        })
      })
    }
  
   
    async upload(itemType:string,field:string){
      this.media.selectedFile = await this.media.selectFile()
      this.media.uploadImage(this.media.selectedFile,(result:any) => {
        console.log(result)
        if(result?.result){
          this.trainerService.infoItem[field] = result.result.url
          this.update(field)
        }
      })
    }
  
    async uploadToCourse(field:string){
      this.media.selectedFile = await this.media.selectFile()
      this.media.uploadImage(this.media.selectedFile,(result:any) => {
        if(result?.result){
          this.trainerService.infoItem[field] = result.result.url
          this.update(field)
        }
      },'trainers')
    }
  
  
    async uploadVideo(field:string){
      this.media.selectVideo((result:any) => {
        if(result?.url){
          this.trainerService.infoItem[field] = result.url.split('raw-videos%2F')[1]
          this.update(field)
        }
      })
    }

    back(){
      if(this.trainerService.breadCrumbs.length>1){
        this.trainerService.breadCrumbs.pop()
        let item = this.trainerService.breadCrumbs[this.trainerService.breadCrumbs.length-1]
        if(item.type == 'module'){
          this.trainerService.moduleItem = item.item
          this.nav.go('trainer/modules')
          this.trainerService.infoItem = {}
        }
        else{
          this.trainerService.infoItem = {}
        }
      }
      else{
        this.trainerService.infoItem = {}
        this.trainerService.breadCrumbs = []
      }
    }

}
  

