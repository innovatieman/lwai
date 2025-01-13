import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Subscription, take } from 'rxjs';
import { BackupService } from 'src/app/services/backup.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { IconsService } from 'src/app/services/icons.service';
import { ModalService } from 'src/app/services/modal.service';

@Component({
  selector: 'app-engine',
  templateUrl: './engine.page.html',
  styleUrls: ['./engine.page.scss'],
})
export class EnginePage implements OnInit {
  [x: string]: any;
  catSubscription:Subscription | null = null;
  itemSubscription:Subscription | null = null;
  private subCollectionSubs: Subscription[] = [];
  private collectionSubs: Subscription[] = [];

  formats:any = []
  attitudes:any = []
  positions:any = []


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
  
  settingsItems:any = [
    {title:'Formats',id:'formats'},
    {title:'Attitudes',id:'attitudes'},
    {title:'Positions',id:'positions'},
  ]

  agents:any = [
    {title:'Gesprekspartner',id:'reaction'},
    {title:'Feedbackgever',id:'feedback'},
    {title:'Fase bewaker',id:'phases'},
    {title:'Soufleur',id:'choices'},
    {title:'Feiten noemer',id:'facts'},
    {title:'Eindevaluatie',id:'close'},
    {title:'Doel checker',id:'goals'},
  ]

  firstInputlabels:any = {
    content:{
      'reaction':'Standaard Openingsbericht van gebruiker',
      'feedback':'Vraag aan Agent',
      'phases':'Vraag aan Agent',
      'choices':'Vraag aan Agent',
      'facts':'Vraag aan Agent',
      'close':'Vraag aan Agent',
      'goals':'Vraag aan Agent',
    }
  }
  


  fieldOptions:any = [
    {field:'title',label:'Title',type:'text',agents:['main']},
    {field:'systemContent',label:'System Content',type:'textarea',agents:['reaction','feedback','phases','choices','facts','close','goals']},
    {field:'extraInfo',label:'Extra kennis input over de categorie',type:'textarea',agents:['reaction']},
    {field:'content',label:'Vraag aan Agent',type:'textarea',agents:['reaction','feedback','phases','choices','facts','close','goals']},
    {field:'temperature',label:'Creativiteits temparatuur',type:'range',min:0,max:2.0, step:0.1,agents:['reaction','feedback','phases','choices','facts','close','goals']},
    {field:'max_tokens',label:'Maximum aantal tokens',type:'range',min:500,max:10000, step:100,agents:['reaction','feedback','phases','choices','facts','close','goals']},
  ]
  
  fieldOptionsFormat:any = [
    {field:'format',label:'Format',type:'textarea',agents:['reaction','feedback','phases','choices','facts','close','goals']},
    {field:'instructions',label:'Extra Instructions',type:'textarea',agents:['reaction','feedback','phases','choices','facts','close','goals']},
  ]
  
  fieldOptionsList:any = [
    {field:'title',label:'Titel',type:'text',required:true},
    {field:'level',label:'Level',type:'number',required:true},
    {field:'description',label:'Description',type:'textarea',required:true},
  ]

  activeItem:any = {

  } // JSON.parse(JSON.stringify(this.settingsItems[0]));
  activeAgent: any = JSON.parse(JSON.stringify(this.basicContent));

  constructor(
    private firestoreService:FirestoreService,
    private firestore: AngularFirestore,
    public icon:IconsService,
    public backupService:BackupService,
    private modalService:ModalService,
  ) { }

  ngOnInit() {
    this.load('categories')
    this.load('formats')
    this.load('attitudes')
    this.load('positions')
    setTimeout(() => {
      this.activateItem(this.settingsItems[0],true)
    }, 3000);
    // this.createItems()
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



  load(type:string){
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
    });
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
    }, 1)
  }

  // createItems(){
  //   this.agents.forEach((agent:any) => {
  //     this.firestoreService.set('formats',agent.id,{format:'',instructions:''})
  //   });
  // }

  update(field:string,item?:any){
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
            this.firestoreService.set('categories',this.activeItem.id,this.activeItem[field],field).then(()=>{
              this.load('categories')
            })
          }
          else{
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

  savePhasesToInfo(){
    for(let i=0;i<this.categories.length;i++){
      this.firestoreService.set('public_info',this.categories[i].id,this.categories[i].phaseList,'phaseList',true,'',()=>{
        //on error
        let obj = {
          phases:this.categories[i].phaseList
        }
        this.firestoreService.set('public_info',this.categories[i].id,obj)
      })
    }
  }


  // addItem(){
  //   this.modalService.showConfirmation('Weet je zeker dat je deze actie wilt uitvoeren?').then((response)=>{
  //     if(response){
  //       let newItem = JSON.parse(JSON.stringify(this.newItem))
  //       delete newItem.visible
  //       this.firestore.create(this.type,newItem).then(()=>{
  //         this.newItem = JSON.parse(JSON.stringify(this.newItemOptions[this.type]))
  //         this.load(this.type)
  //       })
  //     }
  //   })
    
  
  // }
  
  // async removeItem(){

  //     const confirmed = await this.modalService.showConfirmation('Weet je zeker dat je deze actie wilt uitvoeren?');
  //     if (confirmed) {
  //       this.firestore.delete(this.type,this.items[this.activeTab].id).then(()=>{
  //         this.load(this.type)
  //       })
  //     } else {
  //       console.log('Actie geannuleerd');
  //     }

  // }


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

}
