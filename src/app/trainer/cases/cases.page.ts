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
import { Subject, takeUntil } from 'rxjs';
import { SortByPipe } from 'src/app/pipes/sort-by.pipe';

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
  showUserHide: boolean = false;
  filteredCases: any[] = [];
  visibleCases: any[] = [];
  maxCases: number = 15;
  casesLoaded: boolean = false;
  private leave$ = new Subject<void>();

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
    private sortByPipe:SortByPipe,
  ) { }


  // speak(text: string): void {
  //   console.log('Speaking:', text);
  //   const utterance = new SpeechSynthesisUtterance(text);
  //   utterance.lang = 'en-EN'; // English
  //   utterance.rate = 1; // Spreeksnelheid
  //   utterance.pitch = 1; // Toonhoogte

  //   // (optioneel) andere stemmen ophalen
  //   const voices = speechSynthesis.getVoices();
  //   console.log('Available voices:', voices);
  //   const englishVoice = voices.find(v => v.lang === 'en-EN');
  //   if (englishVoice) {
  //     utterance.voice = englishVoice;
  //   }

  //   speechSynthesis.speak(utterance);
  // }



  ngOnInit() {
    // setTimeout(() => {
    //   this.speak('Would you like to create a case? Click the plus button below to get started.');
    // }, 2000);

  }


  // resetIds(){
  //   console.log(this.trainerService.cases)
  //   for(let i=0;i<this.trainerService.cases.length;i++){
  //     if(this.trainerService.cases[i].id2 != this.trainerService.cases[i].id){
  //       this.firestore.updateSub('trainers',this.nav.activeOrganisationId,'cases',this.trainerService.cases[i].id2,{id:this.trainerService.cases[i].id2})
  //     }
  //   }
  // }


  ionViewWillEnter(){
    this.auth.userInfo$.pipe(takeUntil(this.leave$)).subscribe(userInfo => {
      if (userInfo) {
        this.auth.hasActive('trainer').pipe(takeUntil(this.leave$)).subscribe((trainer)=>{
          // console.log('trainer',trainer,this.casesLoaded)
          if(trainer){
            this.trainerService.ensureLoadedForOrg(this.nav.activeOrganisationId,()=>{
                this.updateVisibleCases();
              },{
              cases:()=>{
                this.updateVisibleCases();
              }}
            )
            // this.trainerService.loadCases(()=>{
            //   // console.log('cases loaded')
            //   this.updateVisibleCases();
            //   // console.log(this.trainerService.cases)
            //   this.casesLoaded = true
            // });
            // this.trainerService.loadModules(()=>{
            //   // this.trainerService.modules = this.trainerService.modules
            // })
          }
        })
      }
    })

    this.nav.organisationChange.pipe(takeUntil(this.leave$)).subscribe((res)=>{
      this.trainerService.ensureLoadedForOrg(this.nav.activeOrganisationId,()=>{
          this.updateVisibleCases();
        },{
        cases:()=>{
          this.updateVisibleCases();
        }}
      )
    })
    
    this.nav.changeLang.pipe(takeUntil(this.leave$)).subscribe((res)=>{
      this.updateVisibleCases();
    })

    this.loadCategories()
  }

  ionViewWillLeave() {
    this.leave$.next();
    this.leave$.complete();
  }

  private loadCategories() {
    let catsSubscription = this.firestore.get('categories').pipe(takeUntil(this.leave$)).subscribe((categories) => {
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
    let casus:any = this.trainerService.defaultCase()
    casus.trainerId = this.nav.activeOrganisationId
    this.firestore.createSub('trainers',this.nav.activeOrganisationId,'cases',casus).then(async () => {
        try {
          const found = await this.trainerService.waitForItem('case', casus.created, 5000, 'created');
          this.trainerService.caseItem = found;
          this.toast.hideLoader();
          this.updateVisibleCases();
          // …openen/navigeer of modal sluiten
        } catch (err) {
          // Graceful fallback: direct openen met lokale data
          this.trainerService.caseItem = {}
          this.toast.hideLoader();
          this.updateVisibleCases();
          // this.trainerService.caseItem = { id: casus.id, ...casus };
        }
      });

    //   this.trainerService.loadCases(()=>{
    //     let item = this.trainerService.cases.filter((e:any) => {
    //       return e.created === casus.created
    //     })
    //     if(item.length){
    //       this.trainerService.caseItem = item[0]
    //     }
    //     else{
    //       this.trainerService.caseItem = {}
    //     }
    //     this.toast.hideLoader()
    //   })
    // })
  }

  // deleteCase(caseItem?:any){
  //   if(!caseItem?.id){
  //     if(!this.trainerService.caseItem.id){
  //       this.toast.show('Selecteer een casus')
  //       return
  //     }
  //     caseItem = this.trainerService.caseItem
  //   }
  //   this.modalService.showConfirmation('Are you sure you want to delete this case?').then((result:any) => {
  //     if(result){
  //       let id = caseItem.id
  //       console.log('deleting case',id)
  //       this.firestore.deleteSub('trainers',this.nav.activeOrganisationId,'cases',caseItem.id).then(()=>{
  //         console.log('deleted case')
  //         this.updateVisibleCases();
  //       })
  //       this.trainerService.caseItem = {}
  //       // this.trainerService.loadCases()
  //       for(let i=0;i<this.trainerService.modules.length;i++){
  //         let change = false
  //         let module = this.trainerService.modules[i]
  //         if(module.items?.length){
  //           for(let j=0;j<module.items.length;j++){
  //             if(module.items[j].id == id){
  //               module.items.splice(j,1)
  //               change = true
  //             }
  //           }
  //         }
  //         if(change){
  //           this.firestore.updateSub('trainers',this.nav.activeOrganisationId,'modules',module.id,{items:module.items},()=>{})
  //         }
  //       }
  //     }
  //   })
  // }

  deleteCase(caseItem?: any) {
    if (!caseItem?.id) {
      if (!this.trainerService.caseItem.id) {
        this.toast.show(this.translate.instant('error_messages.select_item_first'));
        return;
      }
      caseItem = this.trainerService.caseItem;
    }

    this.modalService.showConfirmation(this.translate.instant('confirmation_questions.delete')).then((result: any) => {
      if (!result) return;

      const caseId = caseItem.id;
      // console.log('deleting case', caseId);

      // Verwijder de case uit Firestore
      this.firestore.deleteSub('trainers', this.nav.activeOrganisationId, 'cases', caseId).then(() => {
        console.log('deleted case');
        this.updateVisibleCases();
      });

      this.trainerService.caseItem = {};

      // Recursieve functie om de case uit alle modulestructuren te verwijderen
      const removeCaseFromModule = (module: any): boolean => {
        let changed = false;

        if (module.items && module.items.length > 0) {
          // Loop achterstevoren om veilig te splicen
          for (let i = module.items.length - 1; i >= 0; i--) {
            const item = module.items[i];

            if (item.id === caseId) {
              module.items.splice(i, 1);
              changed = true;
            }

            // Als het item zelf een module is (bijv. submodule met eigen items)
            if (item.type === 'module' && item.items && Array.isArray(item.items)) {
              const subChanged = removeCaseFromModule(item);
              if (subChanged) changed = true;
            }
          }
        }

        return changed;
      };

      // Loop door alle toplevel modules en update als er iets is veranderd
      for (let i = 0; i < this.trainerService.modules.length; i++) {
        const module = this.trainerService.modules[i];
        const changed = removeCaseFromModule(module);

        if (changed) {
          this.firestore.updateSub('trainers', this.nav.activeOrganisationId, 'modules', module.id, { items: module.items }, () => {});
        }
      }
    });
  }

  selectCasus(casus:any){
    if(casus.editable_by_user && !casus.editable_by_user.hide){
      casus.editable_by_user.hide = {
        attitude:false,
        phases:false,
        feedback:false,
        feedbackCipher: false,
        goal: false,
      }
      setTimeout(() => {
        this.update('editable_by_user',true,casus)
      }, 500);
    }
    this.trainerService.caseItem = casus
    if(!this.trainerService.caseItem.extra_knowledge){
      this.trainerService.caseItem.extra_knowledge = ''
    }
    this.reloadMenu()
    // console.log(this.trainerService.caseItem)
  }

  caseNotReady(item?:any){
    if(!item){
      item = this.trainerService.caseItem
    }
    // console.log('caseNotReady',item)
    let check = 
      item?.title == '' || 
      item?.role == '' ||
      item?.user_info == '' ||
      ! item?.level ||
      !item?.attitude ||
      !item?.steadfastness ||
      item?.conversation == '' ||
      item?.photo == '' ||
      (
        item?.editable_by_user?.free_answer == true &&
        item?.free_question == ''
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

    if(this.trainerService.caseItem?.conversation=='expert'){
      if(!this.trainerService.checkIsTrainerPro()){
        this.toast.show(this.translate.instant('cases.expert_knowledge_pro_required'))
        this.trainerService.caseItem.conversation = ''
        this.update('conversation')
        this.trainerService.caseItem.openingMessage = ''
        this.update('openingMessage')
        return
      }
    }


    setTimeout(() => {
      this.trainerService.caseItem.openingMessage = this.categoryInfo(this.trainerService.caseItem.conversation).openingMessage
      this.update('openingMessage')
      this.toast.show(this.translate.instant('cases.change_category_message'))
    }, 100);
  }

 updateAllModules(caseItem: any) {
    for (let module of this.trainerService.modules) {
      const updated = this.updateCaseInItems(module.items, caseItem);
      if (updated) {
        this.firestore.setSub(
          'trainers',
          this.nav.activeOrganisationId,
          'modules',
          module.id,
          module.items,
          'items',
          null,
          true
        );
      }
    }
  }

  // Recursieve hulpfunctie om door items én geneste moduleItems te lopen
  private updateCaseInItems(items: any[], caseItem: any): boolean {
    let updated = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type === 'case' && item.id === caseItem.id) {
        items[i] = {
          type: 'case',
          created: caseItem.created || Date.now(),
          title: caseItem.title || '',
          id: caseItem.id,
          order: item.order || 999,
        };
        updated = true;
      }

      // Als dit een moduleItem is en er zijn geneste items, recursief doorlopen
      if (item.type === 'module' && Array.isArray(item.items)) {
        const nestedUpdated = this.updateCaseInItems(item.items, caseItem);
        if (nestedUpdated) {
          updated = true;
        }
      }
    }

    return updated;
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
        if(field == 'title'){
          console.log('updating all modules with new title')
          this.updateAllModules(caseItem)
        }
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
          this.firestore.setSub('trainers', this.nav.activeOrganisationId, 'cases', res.id, res)
          .then(async () => {
            try {
              const found = await this.trainerService.waitForItem('case',res.id, 5000);
              this.trainerService.caseItem = found;
              this.updateVisibleCases();
              // …openen/navigeer of modal sluiten
            } catch (err) {
              // Graceful fallback: direct openen met lokale data
              this.trainerService.caseItem = { id: res.id, ...res };
            }
          });

          // this.firestore.setSub('trainers',this.nav.activeOrganisationId,'cases',res.id,res).then(()=>{
          //   this.trainerService.loadCases(()=>{
          //     let item = this.trainerService.cases.filter((e:any) => {
          //       return e.id === res.id
          //     })
          //     if(item.length){
          //       this.trainerService.caseItem = item[0]
          //     }
          //     else{
          //       this.trainerService.caseItem = {}
          //     }
          //   })
          // })
        }
        else{
          const item = this.trainerService.cases.find((e: any) => e.id === caseItem.id);
          this.trainerService.caseItem = item || {};
          this.updateVisibleCases();
          // this.trainerService.loadCases(()=>{
          //   for(let i=0;i<this.trainerService.cases.length;i++){
          //     console.log(this.trainerService.cases[i].id,caseItem.id,this.trainerService.cases[i].title)
          //   }
          //   let item = this.trainerService.cases.filter((e:any) => {
          //     return e.id === caseItem.id
          //   })
          //   if(item.length){
          //     this.trainerService.caseItem = item[0]
          //   }
          //   else{
          //     this.trainerService.caseItem = {}
          //   }
          // })
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
    },true, false, '', 'avatar');
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

  async updateVisibleCases() {
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

  // selectModules(modules:any){
  //   if(!modules){
  //     modules = []
  //   }
  //   let list:any[] =[]
  //   for(let i=0;i<this.trainerService.modules.length;i++){
  //     let item:any = {}
  //     item.id = this.trainerService.modules[i].id
  //     item.title = this.trainerService.modules[i].title
  //     item.value = this.trainerService.modules[i].title
  //     if(modules.includes(item.id)){
  //       item.selected = true
  //     }
  //     list.push(item)
  //   }
    
  //   this.modalService.selectItem('Selecteer de modules', list, (result: any) => {
  //     if (result.data) {
  //       let oldList = []
  //       if(this.trainerService.caseItem.modules){
  //         oldList = JSON.parse(JSON.stringify(this.trainerService.caseItem.modules))
  //       }
  //       this.trainerService.caseItem.modules = result.data.map((e:any) => {
  //         return e.id
  //       })
  //       let newList = this.trainerService.caseItem.modules
  //       console.log(oldList,newList)
  //       this.firestore.setSub('trainers', this.nav.activeOrganisationId, 'cases', this.trainerService.caseItem.id, this.trainerService.caseItem.modules, 'modules', () => {
  //         this.trainerService.loadCases()
  //       }, true)

  //       for(let i=0;i<oldList.length;i++){
  //         if(!newList.includes(oldList[i])){
  //           let course = this.trainerService.getModule(oldList[i])
  //           for(let j=0;j<course.items.length;j++){
  //             if(course.items[j].id == this.trainerService.caseItem.id){
  //               course.items.splice(j,1)
  //               break
  //             }
  //           }
  //           this.firestore.updateSub('trainers', this.nav.activeOrganisationId, 'modules', oldList[i], {items:course.items}, () => {})
  //         }
  //       }
  //       for(let i=0;i<newList.length;i++){
  //         if(!oldList.includes(newList[i])){
  //           let course = this.trainerService.getModule(newList[i])
  //           if(!course.items){
  //             course.items = []
  //           }
  //           course.items.push({
  //             id:this.trainerService.caseItem.id,
  //             title:this.trainerService.caseItem.title,
  //             created:Date.now(),
  //             order:999,
  //             type:'case'
  //           })
  //           this.firestore.updateSub('trainers', this.nav.activeOrganisationId, 'modules', newList[i], {items:course.items}, () => {})
  //         }
  //       }



  //     }
  //   }, undefined, 'modules',{multiple:true,object:true,field:'title',allowEmpty:true})

  // }

  selectModules(modules: any) {
    if (!modules) modules = [];

    const list = this.trainerService.modules.map((mod: any) => ({
      id: mod.id,
      title: mod.title,
      value: mod.title,
      selected: modules.includes(mod.id),
    }));

    this.modalService.selectItem(
      this.translate.instant('buttons.select'),
      list,
      (result: any) => {
        if (!result.data) return;

        const newModuleIds = result.data.map((e: any) => e.id);
        const oldModuleIds = this.trainerService.caseItem.modules || [];
        console.log('Old Modules:', oldModuleIds);
        console.log('New Modules:', newModuleIds);
        this.trainerService.caseItem.modules = newModuleIds;

        const caseItem = {
          created: this.trainerService.caseItem.created || new Date().toISOString(),
          id: this.trainerService.caseItem.id,
          title: this.trainerService.caseItem.title,
          type: 'case',
          order: 999,
        };

        // Recursieve functie om modules (en submodules) te doorlopen
        const updateModuleWithCase = (module: any): boolean => {
          let changed = false;

          // Voeg toe als module nu geselecteerd is
          if (newModuleIds.includes(module.id)) {
            module.items = module.items || [];
            const alreadyExists = module.items.some((item: any) => item.id === caseItem.id && item.type === 'case');
            if (!alreadyExists) {
              module.items.push({ ...caseItem });
              changed = true;
            }
          }

          // Verwijder als module eerst geselecteerd was maar nu niet meer
          if (oldModuleIds.includes(module.id) && !newModuleIds.includes(module.id)) {
            const before = module.items?.length || 0;
            module.items = (module.items || []).filter((item: any) => !(item.id === caseItem.id && item.type === 'case'));
            const after = module.items.length;
            if (before !== after) {
              changed = true;
            }
          }

          // Ga recursief verder in submodules
          if (module.items && module.items.length > 0) {
            for (let item of module.items) {
              if (item.items && Array.isArray(item.items)) {
                const subChanged = updateModuleWithCase(item);
                if (subChanged) changed = true;
              }
            }
          }

          return changed;
        };

        // Doorloop alle toplevel modules
        for (let mod of this.trainerService.modules) {
          const changed = updateModuleWithCase(mod);

          if (changed) {
            this.firestore.updateSub(
              'trainers',
              this.nav.activeOrganisationId,
              'modules',
              mod.id,
              { items: mod.items },
              () => {}
            );
          }
        }

        // Update caseItem.modules zelf
        this.firestore.setSub(
          'trainers',
          this.nav.activeOrganisationId,
          'cases',
          this.trainerService.caseItem.id,
          this.trainerService.caseItem.modules,
          'modules',
          () => {
            this.trainerService.ensureLoadedForOrg(this.nav.activeOrganisationId,()=>{
                this.updateVisibleCases();
              },{
              cases:()=>{
                this.updateVisibleCases();
              }}
            );
          },
          true
        );
      },
      undefined,
      'modules',
      { multiple: true, object: true, field: 'title', allowEmpty: true }
    );
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
    this.firestore.createSub('trainers',this.nav.activeOrganisationId,'cases',copy)
      .then(async () => {
        try {
          const found = await this.trainerService.waitForItem('case',copy.created, 5000, 'created');
          this.trainerService.caseItem = found;
          this.updateVisibleCases();
          // …openen/navigeer of modal sluiten
        } catch (err) {
          // Graceful fallback: direct openen met lokale data
          // this.trainerService.caseItem = { id: copy.id, ...copy };
          this.trainerService.caseItem = {}
          this.updateVisibleCases();

        }
      });

      // this.trainerService.loadCases(()=>{
      //   let item = this.trainerService.cases.filter((e:any) => {
      //     return e.created === copy.created
      //   })
      //   if(item.length){
      //     this.trainerService.caseItem = item[0]
      //   }
      //   else{
      //     this.trainerService.caseItem = {}
      //   }
      // })
    // })
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
    if(this.caseNotReady(item)){
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
    item.trainerId = this.nav.activeOrganisationId
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
    if(!this.trainerService.checkIsTrainerPro()){
      return
    }
    item.exportedType = 'case'
    const obj = JSON.parse(JSON.stringify(item));
    
    const base64 = this.encodeObjectToBase64(obj); // encode naar base64

    const blob = new Blob([base64], { type: 'text/plain;charset=utf-8' });
    // const blob = new Blob([JSON.stringify(obj)], { type: 'text/plain;charset=utf-8' });
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
        newItem.trainerId = this.nav.activeOrganisationId;
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
          },
           hide:{
            attitude:false,
            phases:false,
            feedback:false,
            feedbackCipher: false,
            goal: false,
          }
        };
      
    }
     catch (error) {
      this.toast.show(this.translate.instant('error_messages.invalid_file'), 4000, 'middle');
      return;
    }
    this.firestore.createSub('trainers', this.nav.activeOrganisationId, 'cases', newItem,async (res:any) => {
      if(res && res.id){
        try {
          const found = await this.trainerService.waitForItem('case',newItem.created, 5000, 'created');
          this.trainerService.caseItem = found;
          // …openen/navigeer of modal sluiten
        } catch (err) {
          // Graceful fallback: direct openen met lokale data
          this.trainerService.caseItem = { id: newItem.id, ...newItem };
        }

        // this.trainerService.loadCases(() => {
        //   let item = this.trainerService.cases.filter((e:any) => {
        //     return e.created === newItem.created
        //   })
        //   if(item.length){
        //     this.trainerService.caseItem = item[0]
        //   }
        //   else{
        //     this.trainerService.caseItem = {}
        //   }
        //   // this.toast.show(this.translate.instant('cases.case_imported_successfully'))
        // });
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


  newExpertise(){
    if(this.trainerService.caseItem.extra_knowledge){
      for(let i=0;i<this.trainerService.trainerInfo.knowledgeItems.length;i++){
        if(this.trainerService.trainerInfo.knowledgeItems[i].id == this.trainerService.caseItem.extra_knowledge){
          this.trainerService.caseItem.expertise_summary = this.trainerService.trainerInfo.knowledgeItems[i].summary || ''
          this.trainerService.caseItem.expertise_title = this.trainerService.trainerInfo.knowledgeItems[i].title || ''
        }
      }
    }
    else{
      this.trainerService.caseItem.expertise_summary = ''
      this.trainerService.caseItem.expertise_title = ''
    }
    this.update('expertise_title')
    this.update('expertise_summary')
    this.update('extra_knowledge')
  }

  selectVoice(){
    let list:any[] = []
    let sexHtml:any = {
      female: '<span style="background-color:yellow;color:black;padding:2px 6px;font-size:10px;border-radius:4px;position:relative;margin-right:5px;">'+this.translate.instant('cases.voice_sex_female')+'</span>',
      male: '<span style="background-color:lightblue;color:white;padding:2px 6px;font-size:10px;border-radius:4px;position:relative;margin-right:5px;">'+this.translate.instant('cases.voice_sex_male')+'</span>',
      other: '<span style="background-color:lightgreen;color:white;padding:2px 6px;font-size:10px;border-radius:4px;position:relative;margin-right:5px;">'+this.translate.instant('cases.voice_sex_other')+'</span>'
    }


    for(let i=0;i<this.trainerService.voices.length;i++){
      let voice:any = this.trainerService.voices[i]
      let sample = "https://storage.cloud.google.com/lwai-3bac8.firebasestorage.app/voices/"+voice.name+"_"+this.translate.currentLang+".wav"
      let html = '<div style="display:flex;margin:10px 0px;align-items:center"><div><span style="font-weight:bold;font-size:18px;">'+voice.name+'</span>[type]<br>[sex]<span style="font-size:12px;font-style:italic;">'+voice.short +'</span></div><span style="flex:auto 1 1"></span><audio style="height:36px;" controls><source src="'+sample+'" type="audio/mpeg">Your browser does not support the audio element.</audio>'
      if(voice.type.toLowerCase()=='teenager'){
        html = html.replace('[type]','<span style="background-color:orange;color:white;padding:2px 6px;font-size:10px;border-radius:4px;position:relative;margin-left:15px;top:-2px;">'+this.translate.instant('cases.voice_type_teenager')+'</span>')
      }
      else{
        html = html.replace('[type]','')
      }
      html = html.replace('[sex]',sexHtml[voice.sex] || '')
      list.push({
        value:voice.name,
        html:html,
        name:voice.name + (voice.short ? ' ('+voice.short+')' : ''),
      })
    }
    console.log(list)
    this.modalService.selectItem('',list,(result:any)=>{
      console.log(result)
      if(result.data){
        this.trainerService.caseItem.voice = result.data.value;
        this.update('voice')
      }
    },null,this.translate.instant('cases.select_voice'),{object:true})
  }

  clearVoice(Event:Event){
    Event.stopPropagation()
    this.trainerService.caseItem.voice = ''
    this.update('voice')
  }

  // async massUpdate(){
  //   for(let i=0;i<this.filteredCases.length;i++){
  //   // for(let i=0;i<1;i++){
  //     if(!this.filteredCases[i].editable_by_user.hide.evaluation){
  //       console.log('not hiding evaluation for ',this.filteredCases[i].title)
  //     }
  //     // this.filteredCases[i].editable_by_user.hide.evaluation = true
  //     // this.update('editable_by_user',false,this.filteredCases[i])
  //     // console.log('updated')
  //     // await this.helpers.sleep(200)
  //   }
  // }



}
