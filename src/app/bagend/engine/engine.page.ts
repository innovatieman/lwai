import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { IonSelect } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { first, max, Subscription, take } from 'rxjs';
import { SortByPipe } from 'src/app/pipes/sort-by.pipe';
import { BackupService } from 'src/app/services/backup.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { IconsService } from 'src/app/services/icons.service';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-engine',
  templateUrl: './engine.page.html',
  styleUrls: ['./engine.page.scss'],
})
export class EnginePage implements OnInit {
  @ViewChild('select_btn_agents') select_btn_agents: any;
  [x: string]: any;
  catSubscription:Subscription | null = null;
  itemSubscription:Subscription | null = null;
  private subCollectionSubs: Subscription[] = [];
  private collectionSubs: Subscription[] = [];
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
  showHtml:boolean=false

  copiedCategory:any = null
  formats:any = []
  attitudes:any = []
  positions:any = []
  voices:any = []
  editingType:string = 'content'

  categories:any = [];
  activeTab: number = 0;
  basicContent:any = {title:'Basisgegevens',id:'main'}
  settingsContent:any = {
    title:'Formats',
    id:'formats',
  }
  
  phaseList:any = {title:'Fase indeling',id:'phaseList'}
  phaseExplanation:any = {title:'Fase indeling',id:'phaseExplanation'}

  sortByOptions:any = {
    'attitudes':'level',
    'positions':'level',
  }

  attitudesItem:any = {title:'Attitudes',id:'attitudes'}

  voicesItem:any = {title:'Voices',id:'voices'}

  settingsItems:any = [
    {title:'Formats',id:'formats'},
    {title:'Attitudes',id:'attitudes'},
    {title:'Positions',id:'positions'},
  ]

  agents:any = []
  // []
  //   {title:'Gesprekspartner',id:'reaction'},
  //   {title:'Feedbackgever',id:'feedback'},
  //   {title:'Fase bewaker',id:'phases'},
  //   {title:'Soufleur',id:'choices'},
  //   {title:'Feiten noemer',id:'facts'},
  //   {title:'Eindevaluatie',id:'close'},
  //   {title:'Doel checker',id:'goals'},
  //   {title:'Case Prompter',id:'case_prompter'},
  //   {title:'Achtergrond',id:'background'},
  //   {title:'Vaardigheden',id:'skills'},
  //   {title:'Fase maker',id:'phase_creator'},
  //   {title:'Level bepaler',id:'levels'},
  // ]
  
  // standaloneAgents:any = [
  //   {title:'Vaardigheden',id:'skills'},
  //   {title:'Fase maker',id:'phase_creator'},
  //   {title:'Level bepaler',id:'levels'},
  // ]

  firstInputlabels:any = {
    content:{
      'reaction':'Standaard Openingsbericht van gebruiker',
      'feedback':'Vraag aan Agent',
      'phases':'Vraag aan Agent',
      'choices':'Vraag aan Agent',
      'facts':'Vraag aan Agent',
      'close':'Vraag aan Agent',
      'goals':'Vraag aan Agent',
      'case_prompter':'Vraag aan Agent',
      'background':'Vraag aan Agent',
      'skills':'Vraag aan Agent',
      'phase_creator':'Vraag aan Agent',
      'levels':'Vraag aan Agent',
      'close_analyst':'Vraag aan Agent',
      // 'conversation_summarizer':'Vraag aan Agent',
    }
  }
  


  fieldOptions:any = [
    {field:'title',label:'Title',type:'text',agents:['main'],categories:['all']},
    {field:'general_layer',label:'General Layer knowledge',type:'textarea',agents:['main'],categories:['main']},
    {field:'systemContent',label:'System Content',type:'textarea',agents:['reaction','feedback','phases','choices','facts','close','goals','case_prompter','background','phase_creator','skills','levels','translator','close_analyst'],categories:['all']},
    {field:'extraInfo',label:'Extra kennis input over de categorie',type:'textarea',agents:['reaction'],categories:['all']},
    {field:'content',label:'Vraag aan Agent',type:'textarea',notHtml:false,agents:['reaction','feedback','phases','choices','facts','close','goals','case_prompter','background','phase_creator','skills','levels','translator','close_analyst'],categories:['all']},
    {field:'temperature',label:'Creativiteits temperatuur',type:'range',min:0,max:2.0, step:0.1,agents:['reaction','feedback','phases','choices','facts','close','goals','case_prompter','background','phase_creator','skills','levels','translator','close_analyst'],categories:['all']},
    {field:'max_tokens',label:'Maximum aantal tokens',type:'range',min:0,max:10000, step:100,agents:['reaction','feedback','phases','choices','facts','close','goals','case_prompter','background','phase_creator','skills','levels','translator','close_analyst'],categories:['all']},
  ]
  
  fieldOptionsFormat:any = [
    {field:'format',label:'Format',type:'textarea',agents:['all']},
    {field:'instructions',label:'Extra Instructions',type:'textarea',agents:['all']},
  ]
  
  fieldOptionsList:any = [
    {field:'title',label:'Titel',type:'text',required:true},
    {field:'level',label:'Level',type:'number',required:true},
    {field:'description',label:'Description',type:'textarea',required:true},
    {field:'voice_instructions',label:'Voice Instructies',type:'textarea',required:true},
    // {field:'beforeText',label:'Before emotion',type:'text',required:true},
    // {field:'afterText',label:'After emotion',type:'text',required:true},
    // {field:'style',label:'Style',type:'range',min:0.00,max:1.00, step:0.05,required:true},
    // {field:'stability',label:'Stability',type:'range',min:0,max:1, step:0.05,required:true},

  ]

  voiceOptionsList:any = [
    {field:'name',label:'Naam',type:'text',required:true},
    {field:'type',label:'Type',type:'text',required:true},
    {field:'voice',label:'Stem',type:'select',required:true, options:['alloy','ash','ballad','coral','echo','fable','nova','onyx','sage','shimmer','verse']},
    {field:'sex',label:'Geslacht',type:'select',required:true, options:['female','male','other']},
    {field:'short',label:'Kort',type:'text',required:true},
    {field:'description',label:'Description',type:'textarea',required:true},
    {field:'instructions',label:'Instructies',type:'textarea',required:true},
  ]

  activeItem:any = {} // JSON.parse(JSON.stringify(this.settingsItems[0]));
  activeAgent: any = JSON.parse(JSON.stringify(this.basicContent));

  constructor(
    private firestoreService:FirestoreService,
    public icon:IconsService,
    public backupService:BackupService,
    private modalService:ModalService,
    private rf:ChangeDetectorRef,
    private toast:ToastService,
    private functions:AngularFireFunctions,
    public nav:NavService,
    private translate:TranslateService,
    private sortByPipe:SortByPipe,
  ) { }

  async ngOnInit() {
    await this.getAgents() 
    this.toast.showLoader('Loading data')
    this.load('categories',()=>{
      this.activateItem(this.getCategory('main'))
      console.log('hide loader')
      setTimeout(() => {
        this.toast.hideLoader()
      }, 2000);
    })
    this.load('formats')
    this.load('attitudes')
    this.load('positions')
    this.load('voices',()=>{
      console.log(this.voices)
    })
    // this.addContent()
  }



  async getAgents(){
    this.firestoreService.getSub('categories','main','agents').pipe(first()).subscribe((items:any) => {
      this.agents = items.map((docItem: any) => {
        return { id: docItem.payload.doc.id, ...docItem.payload.doc.data() };
      });
    });
  }

  loadSubCollections(category_id: string): void {
    this.subCollectionSubs.forEach((sub) => sub.unsubscribe());
    this.subCollectionSubs = [];
    this.collectionSubs.forEach((sub) => sub.unsubscribe());
    this.collectionSubs = [];

    this.agents.forEach((agent:any) => {
      try{
        const subCollectionSub = this.firestoreService.getSubDoc('categories',category_id,'agents',agent.id).subscribe(doc=>{
          let data = { id: doc.payload.id, ...doc.payload.data() };
          this.activeItem = {
            ...this.activeItem,
            [agent.id]: data,
          };

        })
        this.subCollectionSubs.push(subCollectionSub);
      }
      catch (error) {
        console.warn(`Fout bij het verwerken van subcollectie '${agent.id}':`, error);
      }
    });

    this.settingsItems.forEach((settings:any) => {
      // console.log(settings.id,this[settings.id])
      try{
        const collectionSub = this.firestoreService.get(settings.id).subscribe(doc=>{
          this[settings.id] = doc.map((docItem: any) => {
            return { id: docItem.payload.doc.id, ...docItem.payload.doc.data() };
          })
        })
        this.collectionSubs.push(collectionSub);
        
      }
      catch (error) {
        console.warn(`Fout bij het verwerken van subcollectie '${settings.id}':`, error);
      }
    });
      
  }

  changeEditType(){
    console.log(this.editingType)
    if(this.editingType=='format'){
      if(this.activeAgent.id=='phaseList'){
        this.activeAgent = {title:'Basisgegevens',id:'main'}
      }
      this.activateItem({title:'Formats',id:'formats'},true)
    }
    else if(this.editingType=='attitudes'){
      this.activateItem(this.attitudesItem,true)
    }
    else if(this.editingType=='voices'){
      this.activateItem(this.voicesItem,true)
    }
    else if(this.editingType=='phases'){
      this.activeAgent = {title:'Fase indeling',id:'phaseList'}
      this.changeAgent(this.activeAgent)
    }
    else{
      if(this.activeAgent.id=='phaseList'){
        this.activeAgent = {title:'Basisgegevens',id:'main'}
      }
      this.activateItem(this.getCategory('main'))
    }
  }

  getCategory(categoryId:any){
    return this.categories.filter((e:any)=>e.id==categoryId)[0]
  }

  selectCategory(){
    let listCats:any[] = []
    // listCats[0] = this.getCategory('main')
    for(let i=0;i<this.categories.length;i++){
      if(this.categories[i].id!='main'){
        listCats.push(this.categories[i])
      }
    }

    listCats = listCats.sort((a:any,b:any)=>a.title.localeCompare(b.title))
    listCats.unshift(this.getCategory('main'))

    this.modalService.selectItem('',listCats,(response:any)=>{
      if(response.data){
        console.log(response.data)
        if(response.data.id!='main' && (this.activeAgent.id=='phase_creator' || this.activeAgent.id=='skills' || this.activeAgent.id=='levels' || this.activeAgent.id=='translator')){
          this.changeAgent({title:'Basisgegevens',id:'main'})
          this.activateItem(response.data)
        }
        else{
          this.activateItem(response.data)
        }
      } 
    })
  }

  load(type:string,callback?:Function){
    if(!type){return}
    this.itemSubscription = this.firestoreService.get(type).pipe(take(1)).subscribe((items:any) => {
      this[type] = items.map((docItem: any) => {
        let data:any = { id: docItem.payload.doc.id, ...docItem.payload.doc.data() };
        // data.phaseList = JSON.parse(JSON.stringify(data.phases))
        return data;
      });
      if(this.sortByOptions[type]){
        this[type] = this[type].sort((a: any, b: any) => a[this.sortByOptions[type]] - b[this.sortByOptions[type]]);
      }
      if(callback){
        callback()
      }
    });
  }

  openSelect(event:any,selectId:string){
    this[selectId].interface = 'popover'
    this[selectId].open()
  }

  preventClick(event:any){
    event.preventDefault()
    event.stopPropagation()
  }

  activateItem(item:any,ownCollection?:boolean){
    this.activeItem = item
    if(!ownCollection){
      this.loadSubCollections(item.id)
    }
    else{
      if(item.id=='formats'){
        this.activeItem.items = {}
        for(let i=0;i<this[item.id].length;i++){
          this.activeItem.items[this[item.id][i].id] = this[item.id][i]
        }
      }
      else{
        this.activeItem.items = []
        for(let i=0;i<this[item.id].length;i++){
          this.activeItem.items.push(this[item.id][i])
        }
      }
    }

    // setTimeout(() => {
    //   console.log(this.activeAgent)
    //   console.log(this.activeItem)
    // },2000)
  }

  changeTab(tab:number){
    setTimeout(() => {
      this.activeTab = tab
    }, 1);
  }
  changeAgent(agent:any){
    setTimeout(() => {
      this.activeAgent = agent
      if(this.activeItem.id=='attitudes'){
        this.changeEditType()
      }
      if(this.activeItem.id!='main' && (agent.id=='phase_creator' || agent.id=='skills')){
        this.activateItem(this.getCategory('main'))
      }

      // this.select_btn_agents.value = JSON.parse(JSON.stringify(agent))
      // console.log(this.select_btn_agents)
    }, 1)
  }

  // createItems(){
  //   this.agents.forEach((agent:any) => {
  //     this.firestoreService.set('formats',agent.id,{format:'',instructions:''})
  //   });
  // }

  update(field:string,item?:any,html:boolean=false){
    let scrollPosition = window.scrollY;
    if(field){
      if(this.activeItem.id=='formats'){
        this.firestoreService.set('formats',this.activeAgent.id,this.activeItem.items[this.activeAgent.id][field],field).then(()=>{
          this.load('formats')
        })
      }
      else if(this.activeItem.id=='attitudes'&&item.id){
        this.firestoreService.set('attitudes',item.id,item[field],field).then(()=>{
          this.load('attitudes')
        })
      }
      else if(this.activeItem.id=='voices'&&item.id){
        this.firestoreService.set('voices',item.id,item[field],field).then(()=>{
          this.load('voices')
        })
      }
      else if(this.activeItem.id=='positions'&&item.id){
        this.firestoreService.set('positions',item.id,item[field],field).then(()=>{
          this.load('positions')
        })
      }
      else{
        if(field!='phaseList'&&field!='phaseExplanation'){
          if(this.activeAgent.id=='main'){
            if(html){
              if(!this.activeItem[field]){
                this.activeItem[field] = ''
              }
              this.activeItem[field] = this.activeItem[field]
              .split('</ol><p><br></p><p>').join('</ol>')
              .split('</p><p><br></p><ol>').join('<ol>')
              .split('</ul><p><br></p><p>').join('</ul>')
              .split('</p><p><br></p><ul>').join('<ul>')
              .split('<p><br></p>').join('<br>')
              .split('</p><br><p>').join('<br><br>')
              .split('</p><p>').join('<br>')
              .split('&nbsp;').join(' ')
            }
            this.firestoreService.set('categories',this.activeItem.id,this.activeItem[field],field).then(()=>{
              this.load('categories')
            })
          }
          else{
            if(html){
              if(!this.activeItem[this.activeAgent.id][field]){
                this.activeItem[this.activeAgent.id][field] = ''
              }
              this.activeItem[this.activeAgent.id][field] = this.activeItem[this.activeAgent.id][field]
              .split('</ol><p><br></p><p>').join('</ol>')
              .split('</p><p><br></p><ol>').join('<ol>')
              .split('</ul><p><br></p><p>').join('</ul>')
              .split('</p><p><br></p><ul>').join('<ul>')
              .split('<p><br></p>').join('<br>')
              .split('</p><br><p>').join('<br><br>')
              .split('</p><p>').join('<br>')
              .split('&nbsp;').join(' ')
            }
            this.firestoreService.setSub('categories',this.activeItem.id,'agents',this.activeAgent.id,this.activeItem[this.activeAgent.id][field],field)
          }
        }
        else if(field=='phaseList'||field=='phaseExplanation'){
          if(this.activeAgent.id=='phaseList'){
            this.firestoreService.set('categories',this.activeItem.id,this.activeItem[field],field,true,'',()=>{
              this.load('categories')
              setTimeout(() => {
                window.scrollTo(0, scrollPosition);
              }, 100);
            })
          }
          else{
            this.firestoreService.setSub('categories',this.activeItem.id,'agents',this.activeAgent.id,this.activeItem[this.activeAgent.id][field],field,()=>{
              setTimeout(() => {
                window.scrollTo(0, scrollPosition);
              }, 100);
            },true)
          }
        }
      }
    }
  }

  startEditor(event:any){
    // this.editor = event
    this.showEditor()
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
        let htmlButtons = document.getElementsByClassName("ql-HTML")
        for(let i=0;i<htmlButtons.length;i++){
          htmlButtons[i].innerHTML = 'HTML'
          htmlButtons[i].setAttribute('innerHTML', 'HTML')
          htmlButtons[i].setAttribute('style','width:50px;')
          htmlButtons[i].addEventListener('click', (event:any)=> {
            this.showHtml = true
          });
        }

        // let htmlBtn:any = document.querySelector('.ql-HTML');
        // htmlBtn.innerHTML = 'HTML'
        // htmlBtn.style.width = '50px'
        // htmlBtn.addEventListener('click', (event:any)=> {
        //   this.showHtml = true 
        // });
      },300)
    },100)
  }

  addPhase(list?:string){
    if(!list){
      list = 'phaseList'
    }
    this.activeItem[this[list].id].push({title:'',description:''})
    this.update(list)  
  }

  removePhase(index:number,list?:string){
    if(!list){
      list = 'phaseList'
    }
    this.activeItem[this[list].id].splice(index,1)
    this.update(list)
  }

  removeVoice(item:any){
    this.modalService.showConfirmation('Weet je zeker dat je deze voice wilt verwijderen?').then((response:any)=>{
      if(response){
        this.toast.showLoader()
        this.firestoreService.delete('voices',item.id).then(()=>{
          this.load('voices',()=>{
            this.activateItem(this.voicesItem,true)
            this.toast.hideLoader()
          })
        })
      }
    })
  }

  addVoice(){
    console.log('add voice')
    this.firestoreService.create('voices',{name:'1. Nieuwe voice',type:'Volwassen',voice:'alloy',short:'',description:'',instructions:''}).then((doc:any)=>{
      this.load('voices',()=>{
        this.activateItem(this.voicesItem,true)
      })
    })
  }

  movePhase(index:number, direction:number,list?:string){
    if(!list){
      list = 'phaseList'
    }
    let temp =this.activeItem[this[list].id][index]
    this.activeItem[this[list].id][index] = this.activeItem[this[list].id][index+direction]//this.categories[this.activeTab][index+direction]
    this.activeItem[this[list].id][index+direction] = temp
    this.update(list)
  }

  newCategory(){
    this.modalService.inputFields('Nieuwe categorie','Geef de nieuwe categorie een id en titel',[
      {value:'',title:'ID',type:'text',required:true},
      {value:'',title:'Titel',type:'text',required:true},
    ],(response:any)=>{
      console.log(response)
      if(response.data){
        this.toast.showLoader('Creating new category and phases')
        this.firestoreService.set('categories',response.data[0].value,{title:response.data[1].value,phaseList:[]}).then(()=>{
          for(let i=0;i<this.agents.length;i++){
            this.firestoreService.setSub('categories',response.data[0].value,'agents',this.agents[i].id,{
              content:'',
              systemContent:'',
              max_tokens:0,
              temperature:0,
              overwrite:0,
            })
          }
          this.firestoreService
          setTimeout(() => {
            this.load('categories',()=>{
              this.toast.hideLoader()
              this.activateItem(this.getCategory(response.data[0].value))
            })
          }, 10000);
        })
        this.copiedCategory = undefined
      }
      else{
        this.copiedCategory = undefined
      }
    })
  }

  getcategory(id:string){
    return this.categories.filter((e:any)=>e.id==id)[0]
  }


  // getBackups(type:string){
  //   this.backupService.getBackups(type,(backups:any)=>{
  //     // console.log(backups)
  //   })
  // }

  // getBackup(id:string, field:string){
  //   this.modalService.backups(this.backupService.backups,{id:id,field:field},'Select a backup to restore',(response:any)=>{
  //     if(response.data){
  //         this.modalService.showConfirmation('Are you sure you want to restore this backup?').then((responseConfirmation)=>{
  //           if(responseConfirmation){
  //             const scrollPosition = window.scrollY;
  //             this.firestore.set(this.type,this.items[this.activeTab].id,response.data,field).then(()=>{
  //               setTimeout(() => {
  //                 this.itemSubscription.unsubscribe()
  //                 this.load(this.type)
  //                 window.scrollTo(0, scrollPosition);
  //               }, 100);
  //             })
  //           }
  //         })
  //     }
  //   })
  // }

  editmenu:any[]= [
    {title:'Maak backup formats',icon:'edit',id:'backup_format'},
    {title:'Maak backup attitudes',icon:'edit',id:'backup_attitude'},
    {title:'Maak backup positions',icon:'edit',id:'backup_position'},
    {title:'Maak backup [category]',icon:'edit',id:'backup_category'},

  ]

  createBackups(){

    this.backupService.createbackups('category',this.activeItem.id,this.activeItem)
    for(let i=0;i<this.categories.length;i++){
      // this.backupService.createbackups(this.activeItem.id,this.agents[i].id,this.activeItem[this.agents[i].id])

      // console.log(this.categories[i])
    }


    // for(let i=0;i<this.agents.length;i++){
    //   this.backupService.createbackups(this.activeItem.id,this.agents[i].id,this.activeItem[this.agents[i].id])
    // }

    // for(let i=0;i<this.formats.length;i++){
    //   this.backupService.createbackups('formats',this.formats[i].id,this.formats[i])
    // }

    // this.backupService.createbackups('attitudes','attitudes',{attitudes:this.attitudes})
    // this.backupService.createbackups('positions','positions',{positions:this.positions})

  }

  reCreatePhases(item:any){
    this.modalService.showConfirmation('Are you sure you want to recreate the phases?').then((response:any)=>{
      if(response){
        this.toast.showLoader('Recreating phases')
        this.functions.httpsCallable('createPhases')({categoryData:{id:item.id,title:item.title}}).subscribe((result:any)=>{
          console.log(result)
          this.toast.hideLoader()
          this.loadSubCollections(item.id)
        })
      }
    })
  }

  addAgent(type:string){
    this.modalService.inputFields('Nieuwe agent','Geef de nieuwe agent een id en titel',[
      {value:'',title:'ID',type:'text',required:true},
      {value:'',title:'Titel',type:'text',required:true},
    ],(response:any)=>{
      console.log(response)
      if(response.data){
        this.toast.showLoader('Creating new agent')
        let agent = response.data[0].value
        for(let i=0;i<this.categories.length;i++){
          this.firestoreService.setSub('categories',this.categories[i].id,'agents',agent,{
            content:'',
            systemContent:'',
            max_tokens:1500,
            temperature:0.3,
            overwrite:0,
            title:response.data[1].value,
            firstInputlabel:'Vraag aan Agent',
            type:type,
          })
        }
        this.firestoreService.set('formats',agent,{format:'',instructions:''}).then(()=>{
          this.load('formats')
        })
        
        this.load('categories',()=>{
          this.toast.hideLoader()
          this.activateItem(this.getCategory('main'))
        })
        // this.firestoreService.set('formats',agent,{format:'',instructions:''}).then(()=>{
        //   this.load('formats')
        // })
      }
    })
  }

  // addFields(){
  //   for(let i=0;i<this.agents.length;i++){
  //     this.firestoreService.updateSub('categories','main','agents',this.agents[i].id,{title:this.agents[i].title})
  //       this.firestoreService.updateSub('categories','main','agents',this.agents[i].id,{firstInputlabel:this.firstInputlabels.content[this.agents[i].id]})
        
  //   }
  // }

  async translateCategory(category?:string, agent?:string){
    let list:any[] = []
    this.nav.langList.forEach((lang)=>{
      // if(lang!=='nl'){
        list.push({
          value:lang,
          title:this.translate.instant('languages.'+lang),
          icon:'faGlobeEurope'
        })
      // }
    })

    this.modalService.selectItem('naar welke talen wil je vertalen?',list,(response:any)=>{
      console.log(response)
      if(response.data){
        let newList = []
        for(let i=0;i<response.data.length;i++){
          newList.push(response.data[i].value)
        }
        if(1==1||!category||!agent){
          let agentList = [
            {id:'main',title:'Basisgegevens'},
          ]
          for(let i=0;i<this.agents.length;i++){
            if(category == 'conversation'){
              if(this.agents[i].type=='conversation'){
                agentList.push({id:this.agents[i].id,title:this.agents[i].title})
              }
            }
            else{
              agentList.push({id:this.agents[i].id,title:this.agents[i].title})
            }
          }
          this.modalService.selectItem('Welke agenten wil je vertalen?',agentList,(response:any)=>{
            console.log(response)
            if(response.data){
              console.log(response.data)
              let basics:boolean = false
              let newAgentList = []
              for(let i=0;i<response.data.length;i++){
                if(response.data[i].id=='main'){
                  basics = true
                }
                else{
                  newAgentList.push(response.data[i].id)
                }
              }
              let obj = {
                categoryId:this.activeItem.id,
                original_language:'nl',
                languages:newList,
                agents:newAgentList,
                basics:basics,
              }
              this.functions.httpsCallable('translateCategory')(obj).subscribe((result:any)=>{
                console.log(result)
                this.toast.show('Vertaling is klaar')
              })

            }
          },null,undefined,{multiple:true,object:true,field:'title'})
        }
        else{
          let obj = {
            categoryId:category,
            agentId:agent,
            original_language:'nl',
            languages:newList,
            basics:true,
          }
          this.functions.httpsCallable('translateCategory')(obj).subscribe((result:any)=>{
            console.log(result)
            this.toast.show('Vertaling is klaar')
          })
        }



        
      }
    },null,undefined,{multiple:true,object:true,field:'title'})

    
     
  }

  translateAttitudes(){
    let list:any[] = []
    this.nav.langList.forEach((lang)=>{
      // if(lang!=='nl'){
        list.push({
          value:lang,
          title:this.translate.instant('languages.'+lang),
          icon:'faGlobeEurope'
        })
      // }
    })

    this.modalService.selectItem('naar welke talen wil je vertalen?',list,(response:any)=>{
      console.log(response)
      if(response.data){
        let newList = []
        for(let i=0;i<response.data.length;i++){
          newList.push(response.data[i].value)
        }
        let obj = {
          categoryId:this.activeItem.id,
          original_language:'nl',
          languages:newList,
        }
        this.functions.httpsCallable('translateAttitudes')(obj).subscribe((result:any)=>{
          console.log(result)
          this.toast.show('Vertaling is klaar')
        })
      }
    },null,undefined,{multiple:true,object:true,field:'title'})
  }

   translateVoices(){
    console.log('translate voices')
    let list:any[] = []
    this.nav.langList.forEach((lang)=>{
      // if(lang!=='nl'){
        list.push({
          value:lang,
          title:this.translate.instant('languages.'+lang),
          icon:'faGlobeEurope'
        })
      // }
    })

    this.modalService.selectItem('naar welke talen wil je vertalen?',list,(response:any)=>{
      console.log(response)
      if(response.data){
        let newList = []
        for(let i=0;i<response.data.length;i++){
          newList.push(response.data[i].value)
        }
        let obj = {
          categoryId:this.activeItem.id,
          original_language:'nl',
          languages:newList,
        }
        this.functions.httpsCallable('translateVoices')(obj).subscribe((result:any)=>{
          console.log(result)
          this.toast.show('Vertaling is klaar')
        })
      }
    },null,undefined,{multiple:true,object:true,field:'title'})
  }

  async translatePhases(){
    let list:any[] = []
    this.nav.langList.forEach((lang)=>{
      // if(lang!=='nl'){
        list.push({
          value:lang,
          title:this.translate.instant('languages.'+lang),
          icon:'faGlobeEurope'
        })
      // }
    })

    this.modalService.selectItem('naar welke talen wil je de fases vertalen?',list,(response:any)=>{
      console.log(response)
      if(response.data){
        let newList = []
        for(let i=0;i<response.data.length;i++){
          newList.push(response.data[i].value)
        }

        let obj = {
          categoryId:this.activeItem.id,
          original_language:'nl',
          languages:newList,
        }
        this.functions.httpsCallable('translatePhases')(obj).subscribe((result:any)=>{
          console.log(result)
          this.toast.show('Vertaling is klaar')
        })

      }
    },null,undefined,{multiple:true,object:true,field:'title'})

    
     
  }

  niceAttitudeList(){
    let newList = ''
    let attList = this.sortByPipe.transform(this.attitudes,-1,'level')
    for(let i=0;i<attList.length;i++){
      newList += '<strong>'+attList[i].title+'</strong><br>'
      newList += '<span>Score: '+attList[i].level+'</span><br>'
      newList += '<span>'+attList[i].description+'</span><br><br>'
    }
    console.log(newList)
    this.modalService.showText(newList,'Attitude lijst')
  }

  getAllPhases(){
    console.log(this.activeItem)

  }



  // setVoices(){
  //   for(let i=0;i<this.voices.length;i++){
  //     this.firestoreService.create('voices',{
  //       name:this.voices[i].name,
  //       voice:this.voices[i].voice_id,
  //       type:this.voices[i].type,
  //       short:this.voices[i].short,
  //       description:this.voices[i].description,
  //       instructions:this.voices[i].instructions,
  //     },
  //     (response:any)=>{
  //       console.log(response);
  //       this.firestoreService.setSub('voices',response.id,'languages','nl',{
  //         name:this.voices[i].name,
  //         voice:this.voices[i].voice_id,
  //         type:this.voices[i].type,
  //         short:this.voices[i].short,
  //         description:this.voices[i].description,
  //         instructions:this.voices[i].instructions,
  //       })
  //       this.firestoreService.setSub('voices',response.id,'languages','en',{
  //         name:this.voices[i].name,
  //         voice:this.voices[i].voice_id,
  //         type:this.voices[i].type_en,
  //         short:this.voices[i].short_en,
  //         description:this.voices[i].description_en,
  //         instructions:this.voices[i].instructions_en,
  //       })
  //     })
  //   }
  // }




//   voices:any = [
//     {"name":"Luma","voice_id":"alloy","type":"Volwassen","short":"Warm & empathisch","description":"Zacht, geruststellend, betrokken","instructions":"Voice Affect: Warm, helder, en geruststellend. Spreek alsof je iemand vriendelijk wilt helpen.\n\nTone: Altijd vriendelijk, betrokken en aandachtig. Laat horen dat je écht luistert.\n\nPacing: Gemiddeld tot licht langzaam – geef de luisteraar tijd om te verwerken.\n\nPronunciation: Duidelijk, met zachte klemtonen. Geen harde uithalen.\n\nPauses: Natuurlijke pauzes tussen zinnen om rust uit te stralen.","type_en":"Adult","short_en":"Warm & empathetic","description_en":"Soft, reassuring, and compassionate","instructions_en":"Voice Affect: Warm, clear, and reassuring. Speak as if you genuinely want to help someone.\n\nTone: Always friendly, engaged, and attentive. Show that you’re truly listening.\n\nPacing: Moderate to slightly slow – give the listener time to process.\n\nPronunciation: Clear, with soft emphasis. Avoid harsh articulation.\n\nPauses: Natural pauses between sentences to convey calm."},
// {"name":"Zest","voice_id":"echo","type":"Volwassen","short":"Jeugdig & energiek","description":"Luchtig, energiek, een tikje speels","instructions":"Voice Affect: Vlot, helder, met energieke intonatie.\n\nTone: Speels, nieuwsgierig en open.\n\nPacing: Snel tot gemiddeld, met extra flair bij belangrijke woorden.\n\nPronunciation: Frisse klanken, lichte nadruk op klinkers.\n\nPauses: Korte pauzes voor adem en effect.","type_en":"Adult","short_en":"Youthful & energetic","description_en":"Light, energetic, with a playful touch","instructions_en":"Voice Affect: Smooth, clear, with energetic intonation.\n\nTone: Playful, curious, and open.\n\nPacing: Fast to moderate, with extra flair on key words.\n\nPronunciation: Fresh tones, light emphasis on vowels.\n\nPauses: Short pauses for breath and effect."},
// {"name":"Flint","voice_id":"fable","type":"Volwassen","short":"Streng & snel","description":"Kortaf, zakelijk, geen tijd te verliezen","instructions":"Voice Affect: Direct, scherp en to-the-point.\n\nTone: Zakelijk, urgent, geen ruimte voor misverstanden.\n\nPacing: Snel en strak, zonder overbodige pauzes.\n\nPronunciation: Krachtige medeklinkers, duidelijke accenten.\n\nPauses: Enkel als functioneel.","type_en":"Adult","short_en":"Strict & fast-paced","description_en":"Curt, businesslike, no time to waste","instructions_en":"Voice Affect: Direct, sharp, and to the point.\n\nTone: Businesslike, urgent, no room for misunderstanding.\n\nPacing: Fast and tight, no unnecessary pauses.\n\nPronunciation: Strong consonants, clear emphasis.\n\nPauses: Only when functional."},
// {"name":"Nudge","voice_id":"ballad","type":"Volwassen","short":"Ondeugend & speels","description":"Licht provocerend, ironisch, guitig","instructions":"Voice Affect: Ondeugend, geamuseerd, licht ironisch.\n\nTone: Lichtvoetig, plagerig.\n\nPacing: Afwisselend, met ritmische cadans.\n\nPronunciation: Speelse klemtonen, lichte uithalen.\n\nPauses: Voor dramatisch effect of humor.","type_en":"Adult","short_en":"Playful & mischievous","description_en":"Slightly provocative, ironic, mischievous","instructions_en":"Voice Affect: Mischievous, amused, slightly ironic.\n\nTone: Lighthearted, teasing.\n\nPacing: Varied, with rhythmic cadence.\n\nPronunciation: Playful emphasis, light flourishes.\n\nPauses: For dramatic or humorous effect."},
// {"name":"Graph","voice_id":"fable","type":"Volwassen","short":"Neutraal & zakelijk","description":"Monotoon zonder koel te worden, helder en feitelijk","instructions":"Voice Affect: Neutraal, informatief, consistent.\n\nTone: Professioneel, objectief.\n\nPacing: Gemiddeld en regelmatig.\n\nPronunciation: Exact en zonder flair.\n\nPauses: Alleen tussen alinea's of secties.","type_en":"Adult","short_en":"Neutral & professional","description_en":"Monotone without being cold, clear and factual","instructions_en":"Voice Affect: Neutral, informative, consistent.\n\nTone: Professional, objective.\n\nPacing: Moderate and steady.\n\nPronunciation: Exact and flairless.\n\nPauses: Only between sections or paragraphs."},
// {"name":"Drift","voice_id":"ash","type":"Volwassen","short":"Vertrouwd & kalm","description":"Lage, langzame stem met autoriteit","instructions":"Voice Affect: Laag, rustig, overtuigend.\n\nTone: Verzekerend, kalm en aanwezig.\n\nPacing: Langzaam en vloeiend.\n\nPronunciation: Zacht maar duidelijk.\n\nPauses: Langere pauzes voor rustmomenten.","type_en":"Adult","short_en":"Trustworthy & calm","description_en":"Low, slow-paced voice with authority","instructions_en":"Voice Affect: Low, calm, persuasive.\n\nTone: Reassuring, serene, and present.\n\nPacing: Slow and flowing.\n\nPronunciation: Soft yet clear.\n\nPauses: Longer pauses for calming effect."},
// {"name":"Haze","voice_id":"nova","type":"Volwassen","short":"Dromerig & beschouwend","description":"Rustig, filosofisch, met langzame cadans","instructions":"Voice Affect: Dromerig, bedachtzaam.\n\nTone: Beschouwend, tikkeltje poëtisch.\n\nPacing: Traag, met ruimte voor stiltes.\n\nPronunciation: Zacht, lange klinkers.\n\nPauses: Regelmatig voor overdenking.","type_en":"Adult","short_en":"Dreamy & reflective","description_en":"Calm, philosophical, with a slow cadence","instructions_en":"Voice Affect: Dreamy, thoughtful.\n\nTone: Reflective, slightly poetic.\n\nPacing: Slow, with space for silence.\n\nPronunciation: Soft, elongated vowels.\n\nPauses: Frequent for contemplation."},
// {"name":"Snap","voice_id":"verse","type":"Volwassen","short":"Levendig & direct","description":"Vriendelijk maar zonder omwegen, modern taalgebruik","instructions":"Voice Affect: Fris, helder, direct.\n\nTone: Toegankelijk, positief, oplossingsgericht.\n\nPacing: Gemiddeld met versnellingen bij enthousiasme.\n\nPronunciation: Informeel correct.\n\nPauses: Kort maar expressief.","type_en":"Adult","short_en":"Lively & direct","description_en":"Friendly yet direct, with modern language","instructions_en":"Voice Affect: Fresh, clear, direct.\n\nTone: Approachable, positive, solution-focused.\n\nPacing: Moderate with bursts of excitement.\n\nPronunciation: Informally correct.\n\nPauses: Short but expressive."},
// {"name":"Moss","voice_id":"nova","type":"Volwassen","short":"Zorgzaam & langzaam","description":"Spreekt met zachtheid, pauzes na elk belangrijk woord","instructions":"Voice Affect: Teder, langzaam, vol aandacht.\n\nTone: Zorgzaam en oprecht.\n\nPacing: Traag, met duidelijke rustmomenten.\n\nPronunciation: Duidelijk en vriendelijk.\n\nPauses: Vaak en betekenisvol.","type_en":"Adult","short_en":"Caring & slow-paced","description_en":"Speaks gently, with pauses after every important word","instructions_en":"Voice Affect: Tender, slow, attentive.\n\nTone: Caring and sincere.\n\nPacing: Slow, with clear moments of rest.\n\nPronunciation: Clear and friendly.\n\nPauses: Frequent and meaningful."},
// {"name":"Node","voice_id":"ash","type":"Volwassen","short":"Technisch & droog","description":"Snel, weinig expressie, helder","instructions":"Voice Affect: Functioneel en helder.\n\nTone: Efficiënt, zonder poespas.\n\nPacing: Gemiddeld tot snel.\n\nPronunciation: Strak en accuraat.\n\nPauses: Minimaal, alleen logisch.","type_en":"Adult","short_en":"Technical & dry","description_en":"Fast, minimal expression, clear","instructions_en":"Voice Affect: Functional and clear.\n\nTone: Efficient, no frills.\n\nPacing: Moderate to fast.\n\nPronunciation: Tight and accurate.\n\nPauses: Minimal, only when logical."},
// {"name":"Vibe","voice_id":"ballad","type":"Volwassen","short":"Creatief & vrij","description":"Speelt met intonatie, verrast de luisteraar","instructions":"Voice Affect: Expressief en kleurrijk.\n\nTone: Verrassend, speels, artistiek.\n\nPacing: Wisselend ritme, creatief gebruik van stiltes.\n\nPronunciation: Ritmisch en uitgesproken.\n\nPauses: Voor nadruk en verrassing.","type_en":"Adult","short_en":"Creative & expressive","description_en":"Plays with intonation, surprises the listener","instructions_en":"Voice Affect: Expressive and colorful.\n\nTone: Surprising, playful, artistic.\n\nPacing: Varied rhythm, creative use of silence.\n\nPronunciation: Rhythmic and distinct.\n\nPauses: For emphasis and surprise."},
// {"name":"Core","voice_id":"shimmer","type":"Volwassen","short":"Professioneel & warm","description":"Goed getraind, vriendelijk maar formeel","instructions":"Voice Affect: Professioneel, geruststellend.\n\nTone: Duidelijk, verzorgd, empathisch.\n\nPacing: Steady, overtuigend.\n\nPronunciation: Perfecte dictie.\n\nPauses: Subtiel en effectief.","type_en":"Adult","short_en":"Professional & warm","description_en":"Well-trained, friendly yet formal","instructions_en":"Voice Affect: Professional, reassuring.\n\nTone: Clear, polished, empathetic.\n\nPacing: Steady and convincing.\n\nPronunciation: Perfect diction.\n\nPauses: Subtle and effective."},
// {"name":"Burst","voice_id":"echo","type":"Volwassen","short":"Enthousiast & luid","description":"Energiek, overtuigend, wat theatraal","instructions":"Voice Affect: Energiek, krachtig.\n\nTone: Vol passie en overtuiging.\n\nPacing: Sneller tempo met flair.\n\nPronunciation: Dynamisch, hoge intonatievariatie.\n\nPauses: Theatraal en strategisch.","type_en":"Adult","short_en":"Enthusiastic & loud","description_en":"Energetic, persuasive, somewhat theatrical","instructions_en":"Voice Affect: Energetic, powerful.\n\nTone: Full of passion and conviction.\n\nPacing: Faster tempo with flair.\n\nPronunciation: Dynamic, high tonal variation.\n\nPauses: Theatrical and strategic."},
// {"name":"Tale","voice_id":"sage","type":"Volwassen","short":"Teder & verhalend","description":"Warme vertelstem, voelt als een luisterboek","instructions":"Voice Affect: Teder, ritmisch en meeslepend.\n\nTone: Vertellend, geruststellend.\n\nPacing: Langzaam met cadans.\n\nPronunciation: Beeldend.\n\nPauses: Als in een verhaalstructuur.","type_en":"Adult","short_en":"Tender & narrative","description_en":"Warm narrative voice, feels like an audiobook","instructions_en":"Voice Affect: Tender, rhythmic, captivating.\n\nTone: Storytelling, soothing.\n\nPacing: Slow with cadence.\n\nPronunciation: Vivid and illustrative.\n\nPauses: In line with story flow."},
// {"name":"Blunt","voice_id":"onyx","type":"Volwassen","short":"Kort & kordaat","description":"Spreekt staccato, zelfverzekerd","instructions":"Voice Affect: Krachtig en kortaf.\n\nTone: Direct en zeker.\n\nPacing: Snel, korte zinnen.\n\nPronunciation: Hard, duidelijk.\n\nPauses: Minimaal.","type_en":"Adult","short_en":"Blunt & decisive","description_en":"Speaks in staccato, confident","instructions_en":"Voice Affect: Strong and blunt.\n\nTone: Direct and confident.\n\nPacing: Fast, short sentences.\n\nPronunciation: Hard, clear.\n\nPauses: Minimal."},
// {"name":"Edge","voice_id":"coral","type":"Volwassen","short":"Slim & scherpzinnig","description":"Trefzeker, laat sarcasme subtiel doorklinken","instructions":"Voice Affect: Intelligent, licht ironisch.\n\nTone: Kritisch en helder.\n\nPacing: Matig snel, gevat.\n\nPronunciation: Articulerend.\n\nPauses: Voor effect en nadruk.","type_en":"Adult","short_en":"Smart & sharp-witted","description_en":"Assertive, with subtle hints of sarcasm","instructions_en":"Voice Affect: Intelligent, slightly ironic.\n\nTone: Critical and clear.\n\nPacing: Moderately fast, witty.\n\nPronunciation: Articulate.\n\nPauses: For effect and emphasis."},
// {"name":"Ply","voice_id":"onyx","type":"Volwassen","short":"Rustig & analytisch","description":"Licht afstandelijk, altijd logisch en helder","instructions":"Voice Affect: Neutraal en analytisch.\n\nTone: Objectief en rustig.\n\nPacing: Steady, iets traag.\n\nPronunciation: Duidelijk en precies.\n\nPauses: Bij elke logische overgang.","type_en":"Adult","short_en":"Calm & analytical","description_en":"Slightly distant, always logical and clear","instructions_en":"Voice Affect: Neutral and analytical.\n\nTone: Objective and calm.\n\nPacing: Steady, slightly slow.\n\nPronunciation: Clear and precise.\n\nPauses: At every logical transition."},
// {"name":"Bop","voice_id":"shimmer","type":"Volwassen","short":"Zorgeloos & vrolijk","description":"Positief, zomers, neigt naar zingen","instructions":"Voice Affect: Vrolijk, fris en licht.\n\nTone: Blij en opgewekt.\n\nPacing: Snel en speels.\n\nPronunciation: Ritmisch, opgewekt.\n\nPauses: Voor speelse nadruk.","type_en":"Adult","short_en":"Carefree & cheerful","description_en":"Positive, summery, with a sing-song quality","instructions_en":"Voice Affect: Cheerful, fresh, and light.\n\nTone: Happy and upbeat.\n\nPacing: Fast and playful.\n\nPronunciation: Rhythmic and joyful.\n\nPauses: For playful emphasis."},
// {"name":"Nest","voice_id":"nova","type":"Volwassen","short":"Vertrouwd & moederlijk","description":"Spreekt met warmte, begrip en wijsheid","instructions":"Voice Affect: Moederlijk, geruststellend.\n\nTone: Begripvol en geduldig.\n\nPacing: Langzaam en zorgzaam.\n\nPronunciation: Zacht, verzorgend.\n\nPauses: Lang voor geruststelling.","type_en":"Adult","short_en":"Familiar & maternal","description_en":"Speaks with warmth, understanding, and wisdom","instructions_en":"Voice Affect: Maternal, reassuring.\n\nTone: Understanding and patient.\n\nPacing: Slow and caring.\n\nPronunciation: Soft and nurturing.\n\nPauses: Long for reassurance."},
// {"name":"Crux","voice_id":"onyx","type":"Volwassen","short":"Streng & rechtvaardig","description":"Autoritair maar fair, klinkt als een goede leraar","instructions":"Voice Affect: Stevig, kalm, rechtvaardig.\n\nTone: Standvastig en eerlijk.\n\nPacing: Rustig met nadruk.\n\nPronunciation: Duidelijk en sturend.\n\nPauses: Na elke boodschap.","type_en":"Adult","short_en":"Firm & fair","description_en":"Authoritative but fair, sounds like a good teacher","instructions_en":"Voice Affect: Firm, calm, and fair.\n\nTone: Steady and honest.\n\nPacing: Calm with emphasis.\n\nPronunciation: Clear and directive.\n\nPauses: After each key message."},
// {"name":"Pebble","voice_id":"ballad","type":"Teenager","short":"Jong & nieuwsgierig","description":"Kindstem die speels en leergierig klinkt","instructions":"Voice Affect: Licht en enthousiast.\n\nTone: Nieuwsgierig, open, altijd vragend van aard.\n\nPacing: Licht versneld, met ruimte voor kinderlijke verwondering.\n\nPronunciation: Helder, met nadruk op vraagwoorden en ontdekkingen.\n\nPauses: Voor verwondering of nadruk.","type_en":"Teenager","short_en":"Young & curious","description_en":"Childlike voice that sounds playful and eager to learn","instructions_en":"Voice Affect: Light and enthusiastic.\n\nTone: Curious, open, always inquisitive.\n\nPacing: Slightly quick, with childlike wonder.\n\nPronunciation: Bright, with emphasis on discovery words.\n\nPauses: For wonder or emphasis."},
// {"name":"Wink","voice_id":"fable","type":"Teenager","short":"Ondeugend & vrolijk","description":"Jong kind met brutale energie en een glimlach in de stem","instructions":"Voice Affect: Vrolijk, met springerige toon.\n\nTone: Plagerig, positief en soms een beetje overmoedig.\n\nPacing: Snel, ritmisch, speels.\n\nPronunciation: Licht overarticulerend, soms dramatisch.\n\nPauses: Voor effect, grappen of spanning.","type_en":"Teenager","short_en":"Cheeky & cheerful","description_en":"Young child with bold energy and a smile in the voice","instructions_en":"Voice Affect: Cheerful, with a bouncy tone.\n\nTone: Teasing, positive, slightly overconfident.\n\nPacing: Fast, rhythmic, playful.\n\nPronunciation: Slightly overarticulated, sometimes dramatic.\n\nPauses: For effect, jokes, or suspense."},
// {"name":"Skip","voice_id":"nova","type":"Teenager","short":"Enthousiast & ongeremd","description":"Klinkt als een jonge tiener die alles leuk vindt","instructions":"Voice Affect: Verbaasd, blij, speels.\n\nTone: Altijd positief, licht chaotisch maar oprecht.\n\nPacing: Ongelijkmatig, soms heel snel bij enthousiasme.\n\nPronunciation: Springend, met uitschieters.\n\nPauses: Alleen wanneer echt nodig.","type_en":"Teenager","short_en":"Enthusiastic & uninhibited","description_en":"Sounds like a young teen who enjoys everything","instructions_en":"Voice Affect: Surprised, happy, playful.\n\nTone: Always positive, slightly chaotic but sincere.\n\nPacing: Uneven, sometimes very fast when excited.\n\nPronunciation: Jumping, with outbursts.\n\nPauses: Only when really needed."},
// {"name":"Dot","voice_id":"shimmer","type":"Teenager","short":"Slim & verbaal","description":"Jong maar scherp, klinkt als de 'slimme leerling'","instructions":"Voice Affect: Snel, ad rem, niet kinderachtig.\n\nTone: Gevat en to-the-point.\n\nPacing: Snel maar beheerst.\n\nPronunciation: Licht pedant, goed gearticuleerd.\n\nPauses: Voor nadruk of ironie.","type_en":"Teenager","short_en":"Clever & articulate","description_en":"Young but sharp, sounds like the 'smart kid'","instructions_en":"Voice Affect: Fast, witty, not childish.\n\nTone: Sharp and to-the-point.\n\nPacing: Fast but controlled.\n\nPronunciation: Slightly pedantic, well articulated.\n\nPauses: For emphasis or irony."},
//   ]

}
