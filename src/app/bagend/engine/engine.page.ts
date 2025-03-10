import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { IonSelect } from '@ionic/angular';
import { first, max, Subscription, take } from 'rxjs';
import { BackupService } from 'src/app/services/backup.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { IconsService } from 'src/app/services/icons.service';
import { ModalService } from 'src/app/services/modal.service';
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

  editingType:string = 'content'

  categories:any = [];
  activeTab: number = 0;
  basicContent:any = {title:'Basisgegevens',id:'main'}
  settingsContent:any = {
    title:'Formats',
    id:'formats',
  }
  
  phaseList:any = {title:'Fase indeling',id:'phaseList'}

  sortByOptions:any = {
    'attitudes':'level',
    'positions':'level',
  }

  attitudesItem:any = {title:'Attitudes',id:'attitudes'}


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
    }
  }
  


  fieldOptions:any = [
    {field:'title',label:'Title',type:'text',agents:['main'],categories:['all']},
    {field:'general_layer',label:'General Layer knowledge',type:'textarea',agents:['main'],categories:['main']},
    {field:'systemContent',label:'System Content',type:'textarea',agents:['reaction','feedback','phases','choices','facts','close','goals','case_prompter','background','phase_creator','skills','levels'],categories:['all']},
    {field:'extraInfo',label:'Extra kennis input over de categorie',type:'textarea',agents:['reaction'],categories:['all']},
    {field:'content',label:'Vraag aan Agent',type:'textarea',agents:['reaction','feedback','phases','choices','facts','close','goals','case_prompter','background','phase_creator','skills','levels'],categories:['all']},
    {field:'temperature',label:'Creativiteits temperatuur',type:'range',min:0,max:2.0, step:0.1,agents:['reaction','feedback','phases','choices','facts','close','goals','case_prompter','background','phase_creator','skills','levels'],categories:['all']},
    {field:'max_tokens',label:'Maximum aantal tokens',type:'range',min:0,max:10000, step:100,agents:['reaction','feedback','phases','choices','facts','close','goals','case_prompter','background','phase_creator','skills','levels'],categories:['all']},
  ]
  
  fieldOptionsFormat:any = [
    {field:'format',label:'Format',type:'textarea',agents:['reaction','feedback','phases','choices','facts','close','goals','case_prompter','background','phase_creator','skills','levels']},
    {field:'instructions',label:'Extra Instructions',type:'textarea',agents:['reaction','feedback','phases','choices','facts','close','goals','case_prompter','background','phase_creator','skills','levels']},
  ]
  
  fieldOptionsList:any = [
    {field:'title',label:'Titel',type:'text',required:true},
    {field:'level',label:'Level',type:'number',required:true},
    {field:'description',label:'Description',type:'textarea',required:true},
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
  ) { }

  async ngOnInit() {
    await this.getAgents() 
    this.toast.showLoader('Loading data')
    this.load('categories',()=>{
      this.activateItem(this.getCategory('main'))
      this.toast.hideLoader()
    })
    this.load('formats')
    this.load('attitudes',()=>{
      console.log(this.attitudes)
    })
    this.load('positions')
    // this.showEditor()
    // setTimeout(() => {
    //   this.activateItem(this.getCategory('main'))
    // }, 3000);
    // this.createItems()
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
      this.activateItem({title:'Formats',id:'formats'},true)
    }
    else if(this.editingType=='attitudes'){
      this.activateItem(this.attitudesItem,true)
    }
    else{
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
        if(response.data.id!='main' && (this.activeAgent.id=='phase_creator' || this.activeAgent.id=='skills' || this.activeAgent.id=='levels')){
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
      else if(this.activeItem.id=='positions'&&item.id){
        this.firestoreService.set('positions',item.id,item[field],field).then(()=>{
          this.load('positions')
        })
      }
      else{
        if(field!='phaseList'){
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
        else if(field=='phaseList'){
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

        let htmlBtn:any = document.querySelector('.ql-HTML');
        htmlBtn.innerHTML = 'HTML'
        htmlBtn.style.width = '50px'
        htmlBtn.addEventListener('click', (event:any)=> {
          this.showHtml = true 
        });
      },300)
    },100)
  }

  addPhase(){
    this.activeItem[this.phaseList.id].push({title:'',description:''})
    this.update('phaseList')  
  }

  removePhase(index:number){
    this.activeItem[this.phaseList.id].phases.splice(index,1)
    this.update('phaseList')
  }

  movePhase(index:number, direction:number){
    let temp =this.activeItem[this.phaseList.id].phases[index]
    this.activeItem[this.phaseList.id].phases[index] = this.categories[this.activeTab].phases[index+direction]
    this.activeItem[this.phaseList.id].phases[index+direction] = temp
    this.update('phaseList')
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

  addAgent(){
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
          })
        }
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



}
