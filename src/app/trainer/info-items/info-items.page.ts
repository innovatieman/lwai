import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { IonInfiniteScroll, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
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
  selector: 'app-info-items',
  templateUrl: './info-items.page.html',
  styleUrls: ['./info-items.page.scss'],
})
export class InfoItemsPage implements OnInit {

    @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;
    @ViewChild('import_item') import_item!: ElementRef;
    
    // caseItem: any={};
    [x:string]: any;
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
      public modalService:ModalService,
      public translate:TranslateService,
      public infoService:InfoService,
      public helpers:HelpersService,
      private filterSearchPipe:FilterSearchPipe,
      private filterKeyPipe:FilterKeyPipe,
      public levelService:LevelsService,
      private popoverController:PopoverController,
      private selectMenuservice:SelectMenuService,
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
      
      this.nav.organisationChange.subscribe((res)=>{
        this.trainerService.loadInfoItems(()=>{
          this.updateVisibleItems();
        });
        this.trainerService.loadModules(()=>{})
      })
      
      this.nav.changeLang.subscribe((res)=>{
        this.updateVisibleItems();
      })

  
    }
  

    shortMenu:any
  onRightClick(event:Event,item:any){
    event.preventDefault()
    event.stopPropagation()
    let list = [
      {
        title:this.translate.instant('cases.edit_item'),
        icon:'faEdit',
        value:'edit'
      },
      {
        title:this.translate.instant('cases.copy_item'),
        icon:'faCopy',
        value:'copy'
      },
      {
        title:this.translate.instant('cases.remove_item'),
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
            this.selectInfoItem(item)
            break;
          case 'delete':
            this.deleteItem(item)
            break;
          case 'copy':
            this.copyItem(item)
            break;
          case 'view':
            this.example(item)
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
      this.firestore.createSub('trainers',this.nav.activeOrganisationId,'infoItems',infoItem).then(()=>{
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
  
    deleteItem(infoItem?:any){
      if(!infoItem?.id){
        if(!this.trainerService.infoItem?.id){
          this.toast.show('Selecteer een item')
          return
        }
        infoItem = this.trainerService.infoItem
      }
      this.modalService.showConfirmation('Are you sure you want to delete this item?').then((result:any) => {
        if(result){
          let id = infoItem.id
          this.firestore.deleteSub('trainers',this.nav.activeOrganisationId,'infoItems',infoItem.id)
          this.trainerService.infoItem = {}
          this.trainerService.loadInfoItems()

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
  
    selectInfoItem(infoItem:any){
      this.trainerService.infoItem = infoItem
      this.reloadMenu()
      // console.log(this.trainerService.infoItem)
    }
  
  showFieldsStatus(part:string,event:Event){
    if(event){
      event.stopPropagation()
    }
    this.modalService.showText(this.itemReadyInfo(part),this.translate.instant('error_messages.not_complete'))
  }

  itemReadyInfo(part:string){
    let text = ''//this.translate.instant('cases.check_incomplete')
    let fields = []
    switch(part){
      case 'title':
        if(!this.trainerService.infoItem?.title){
          fields.push(this.translate.instant('cases.title'))
        }
        if(!this.trainerService.infoItem?.user_info){
          fields.push(this.translate.instant('cases.short_info'))
        }
        if(!this.trainerService.infoItem?.photo){
          fields.push(this.translate.instant('cases.photo'))
        }
        text = text + this.translate.instant('cases.check_incomplete') + '<ul>'// + fields.join(', ')
        for(let i=0;i<fields.length;i++){
          text = text + '<li>'+fields[i]+'</li>'
        }
        text = text + '</ul>'
        return text
        
      case 'content':
        if(!this.trainerService.infoItem?.content && this.trainerService.infoItem?.type=='text'){
          fields.push(this.translate.instant('cases.content'))
        }
        if(!this.trainerService.infoItem?.video_url && this.trainerService.infoItem?.type=='video'){
          fields.push(this.translate.instant('cases.video'))
        }
        if(fields.length){
          text = text + this.translate.instant('cases.check_incomplete') + '<ul>'// + fields.join(', ')
          for(let i=0;i<fields.length;i++){
            text = text + '<li>'+fields[i]+'</li>'
          }
          text = text + '</ul>'
        }
        if(!this.trainerService.infoItem?.modules?.length){
          // if(text.length){
          //   text = text + '<br>'
          // }
          text = text + this.translate.instant('cases.no_connected_modules')
        }
        return text
    }
    return ''
  }
  
    itemReady(part:string){
      let check = false
      switch(part){
        case 'title':
          check = this.trainerService.infoItem?.title && 
                  this.trainerService.infoItem?.user_info &&
                  this.trainerService.infoItem?.photo
          break;
        case 'content':
          check = ((this.trainerService.infoItem?.content != '' && this.trainerService.infoItem?.type=='text') ||
                  (this.trainerService.infoItem?.video_url != '' && this.trainerService.infoItem?.type=='video'))
                  && this.trainerService.infoItem?.modules?.length
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
      if(this.trainerService.breadCrumbs && this.trainerService.breadCrumbs[0]?.type == 'training'){
        if(field){
          this.firestore.setSubSub('trainers',this.nav.activeOrganisationId,'trainings',this.trainerService.breadCrumbs[0].item.id,'items',infoItem.id,infoItem[field],field,()=>{
            setTimeout(() => {
              window.scrollTo(0, scrollPosition);
            }, 100);
          },isArray)
        }
      }
      else{
        if(field){
          // console.log('update',field,infoItem)
          this.firestore.setSub('trainers',this.nav.activeOrganisationId,'infoItems',infoItem.id,infoItem[field],field,()=>{
            setTimeout(() => {
              window.scrollTo(0, scrollPosition);
            }, 100);
          },isArray)
        }
      }
    }

    async selectAvatar(event:Event,extraPhoto:boolean = false){
      this.media.selectAvatar(event,(res:any)=>{
        console.log(res)
        if(res?.status==200&&res?.result.url){
          if(!extraPhoto){
            this.trainerService.infoItem.photo = res.result.url
            this.trainerService.infoItem.avatarName = ''
            this.update('photo')
            this.update('avatarName')
          }
          else{
            this.trainerService.infoItem.extra_photo = res.result.url
            this.update('extra_photo')
          }
        }
        else if(res=='delete'){
          if(!extraPhoto){
            this.trainerService.infoItem.photo = ''
            this.trainerService.infoItem.avatarName = ''
            this.update('photo')
            this.update('avatarName')
          }
          else{
            this.trainerService.infoItem.extra_photo = ''
            this.update('extra_photo')
          }
        }
        else if(res.type=='library'){
          if(!extraPhoto){
            this.trainerService.infoItem.photo = res.url
            this.trainerService.infoItem.avatarName = ''
            this.update('photo')
            this.update('avatarName')
          }
          else{
            this.trainerService.infoItem.extra_photo = res.url
            this.update('extra_photo')
          }
        }
        else if(res=='download'){
        this.nav.goto(this.trainerService.infoItem.photo,true)
      }
        else if(res=='generate'){
          this.createPhoto(this.trainerService.infoItem,extraPhoto)
        }
      },true,true)
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
          this.trainerService.infoItem.modules = result.data.map((e:any) => {
            return e.id
          })
          this.firestore.setSub('trainers', this.nav.activeOrganisationId, 'infoItems', this.trainerService.infoItem.id, this.trainerService.infoItem.modules, 'modules', () => {
            this.trainerService.loadCases()
          }, true)
        }
      }, undefined, 'modules',{multiple:true,object:true,field:'title',allowEmpty:true})
  
    }

    copyItem(infoItem?:any){
      if(!infoItem?.id){
        if(!this.trainerService.infoItem.id){
          this.toast.show('Selecteer een item')
          return
        }
        infoItem = this.trainerService.infoItem
      }
      let copy = JSON.parse(JSON.stringify(infoItem))
      delete copy.id
      copy.created = Date.now()
      copy.title = copy.title + ' (copy)'
      copy.open_to_user = false
      this.firestore.createSub('trainers',this.nav.activeOrganisationId,'infoItems',copy).then(()=>{
        this.trainerService.loadInfoItems(()=>{
          let item = this.trainerService.infoItems.filter((e:any) => {
            return e.created === copy.created
          })
          if(item.length){
            this.trainerService.infoItem = item[0]
            this.toast.show('Je kunt nu de kopie bewerken')
          }
          else{
            this.trainerService.infoItem = {}
          }
        },true)
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

    async addVideo(field:string){
     let list = [
           {title:'Upload video',icon:'faCloudUploadAlt',action:'upload'},
           {title:'Youtube',icon:'faYoutube',action:'youtube'},
           {title:'Vimeo',icon:'faVimeo',action:'vimeo'},
         ]
         this.shortMenu = await this.popoverController.create({
           component: MenuPage,
           componentProps:{
             customMenu:true,
             pages:list,
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
          if(this.selectMenuservice.selectedItem.action == 'upload'){
            if(!this.trainerService.checkIsTrainerPro()){
              return
            }
            this.uploadVideo(field)
          }
          else if(this.selectMenuservice.selectedItem.action == 'youtube' || this.selectMenuservice.selectedItem.action == 'vimeo'){
            this.modalService.inputFields('Voeg de link toe', 'Voeg de link toe van de video', [
              {
                type: 'text',
                title: 'Link',
                name: 'link',
                value: this.trainerService.infoItem[field],
                required: true,
              }
            ], (result: any) => {
              if (result.data) {
                if(this.selectMenuservice.selectedItem.action == 'youtube'){
                  this.trainerService.infoItem[field] = result.data[0].value.replace('watch?v=','embed/')
                }
                else{
                  this.trainerService.infoItem[field] = result.data[0].value
                }
                this.update(field)
              }
            })
          }
         }
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
        else if(item.type == 'training'){
          this.trainerService.trainingItem = item.item

          this.nav.go('trainer/trainings')
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

    addFile(){
      if(!this.trainerService.checkIsTrainerPro()){
        return
      }
      this.media.selectAnyFile(20,(result:any)=>{
        if(result){
          this.media.uploadAnyFile(result,(res:any)=>{
            if(res?.result){
              this.trainerService.infoItem.files = this.trainerService.infoItem.files || []
              this.trainerService.infoItem.files.push({
                name:result.name,
                url:res.result.url
              })
              this.update('files',true)
            }
          })
        }
      })
    }

    removeFile(file:any){
      this.modalService.showConfirmation(this.translate.instant('confirmation_questions.delete')).then((result:any) => {
        if(result){
          this.trainerService.infoItem.files = this.trainerService.infoItem.files.filter((e:any)=>{
            return e.name != file.name
          })
          this.update('files',true)
        }
      })
    }

    editFileName(file:any){
      this.modalService.inputFields(this.translate.instant('cases.change_file_name'), '', [
        {
          type: 'text',
          title: this.translate.instant('cases.name'),
          name: 'name',
          value: file.name,
          required: true,
        }
      ], (result: any) => {
        if (result.data) {
          this.trainerService.infoItem.files = this.trainerService.infoItem.files.map((e:any)=>{
            if(e.name == file.name){
              e.name = result.data[0].value
            }
            return e
          })
          this.update('files',true)
        }
      })
    }

    example(item?:any){
      this.trainerService.originEdit = 'trainer/info-items'
      if(!item?.id){
        if(!this.trainerService.infoItem.id){
          this.toast.show('Selecteer een item')
          return
        }
        item = this.trainerService.infoItem
      }
      this.nav.go('trainer/example/infoItem/'+item.id)
    }

    selectDate(event:any,field:string,showTime?:boolean | null,min?:any,max?:any){
      event.stopPropagation()
      let date:any = this.trainerService.infoItem[field]
      if(!date){date=moment()}
      else{ date = moment(date) }
      this.toast.selectDate(date,(response:any)=>{
        if(response){
          this.trainerService.infoItem[field] = moment(response).format('YYYY-MM-DD')
          this.update(field)
        }
      },showTime,{min:min,max:max})
    }
    
    clearDate(event:Event,field:string){
      event.stopPropagation()
      this.trainerService.infoItem[field] = ''
      this.update(field)
    }

  setPageParam(){
    let param = ''
    param = 'trainer/info-items'
    return param
  }

  setOptionsParam(){
    let param = ''
    if(!this.trainerService.infoItem?.id){
      param = 'trainer/info-items'
    }
    else if(this.trainerService.infoItem?.id){
      param = 'trainer/info-items/item'
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
    item.exportedType = 'infoItem'
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
    if(!fileData || fileData.exportedType !== 'infoItem') {
      this.toast.show(this.translate.instant('error_messages.invalid_file'), 4000, 'middle');
      return;
    }
    let newItem:any = {}

    try {
        newItem.created = Date.now();
        newItem.title = fileData.title + ' - import' || 'import item';
        newItem.audio_url = fileData.audio_url || '';
        newItem.user_info = fileData.user_info || '';
        newItem.type = fileData.type || 'text';
        newItem.content = fileData.content || '';
        newItem.photo = fileData.photo || '';
        newItem.video_url = fileData.video_url || '';
        newItem.modules = [];
        newItem.tags = [];
        newItem.intro = fileData.intro || '';
        newItem.avatarName = fileData.avatarName || '';  
    }
     catch (error) {
      this.toast.show(this.translate.instant('error_messages.invalid_file'), 4000, 'middle');
      return;
    }
    this.firestore.createSub('trainers', this.nav.activeOrganisationId, 'infoItems', newItem,(res:any) => {
      if(res && res.id){
        this.trainerService.loadInfoItems(() => {
          let item = this.trainerService.infoItems.filter((e:any) => {
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

  async createPhoto(infoItem:any,landscape:boolean = false){
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
              "size": landscape ? "landscape" : "1024x1024",
              prompt:prompt || '',
              noPadding: true,
              
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
              infoItem.photo = responseData.imageURL
              this.update('photo')
            }
              console.log('hiding loader')
              this.toast.hideLoader()
            // }, 2000);

        }
      },{buttons:[{action:'standards_generate_photo',title:this.translate.instant('cases.generate_instructions_original'),color:'dark',fill:'outline'}]});

  }


}
  

