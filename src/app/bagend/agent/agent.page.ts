import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs';
import { BackupService } from 'src/app/services/backup.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { IconsService } from 'src/app/services/icons.service';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-agent',
  templateUrl: './agent.page.html',
  styleUrls: ['./agent.page.scss'],
})
export class AgentPage implements OnInit {
  type: string = '';
  items:any = [];
  activeTab: number = 0;
  itemSubscription:any
  sortBy:string = ''

  types:any = [
    {title:'Attitudes',type:'attitudes'},
    {title:'Instructions',type:'instructions'},
    {title:'Categories',type:'categories'},
    {title:'Public Info',type:'public_info'},
  ]

  sortByOptions:any = {
    'attitudes':'level',
  }
  newItemOptions:any = {
    'attitudes':{title:'New Attitude',description:'',level:0,visible:false},
    'instructions':{systemContent:'',format:'',content:'',visible:false},
    'categories':{title:'New Category',systemContent:'',openingMessage:'',extraInfo:'',visible:false,phases:[]},
    'public_info':{intro:'',background:'',intro_phases:'',visible:false},
  }
  fieldOptions:any = {
    'attitudes':[
      {field:'level',label:'Level',type:'number',required:true},
      {field:'description',label:'Description',type:'textarea',required:true},
    ],
    'instructions':[
      {field:'systemContent',label:'System Content',type:'textarea'},
      {field:'format',label:'Format',type:'textarea'},
      {field:'content',label:'Content',type:'textarea'},
    ],
    'categories':[
      {field:'systemContent',label:'System Content',type:'textarea'},
      {field:'openingMessage',label:'Opening Message',type:'textarea'},
      {field:'extraInfo',label:'Extra informatie voor de AI',type:'textarea'},
    ],
    'public_info':[
      {field:'intro',label:'Intro',type:'textarea'},
      {field:'background',label:'Background',type:'textarea'},
      {field:'intro_phases',label:'Intro Phases',type:'textarea'},
    ],
  }
  newItem:any = {}

  constructor(
    private route:ActivatedRoute,
    public nav:NavService,
    public firestore: FirestoreService,
    private toast: ToastService,
    private modalService:ModalService,
    public backupService:BackupService,
    public icon:IconsService
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params=>{

      if(params['type']){
        this.type = params['type'];
        this.newItem = JSON.parse(JSON.stringify(this.newItemOptions[this.type]))
        this.load(this.type);
      }
      
    })
  }

  load(type:string){
    if(!type){return}
    this.itemSubscription = this.firestore.get(type).pipe(take(1)).subscribe((items:any) => {
      this.items = items.map((docItem: any) => {
        return { id: docItem.payload.doc.id, ...docItem.payload.doc.data() };
      });
      if(this.sortByOptions[this.type]){
        this.items = this.items.sort((a: any, b: any) => a[this.sortByOptions[this.type]] - b[this.sortByOptions[this.type]]);
      }
    });
  }

  changeTab(tab:number){
    setTimeout(() => {
      this.activeTab = tab
    }, 1);
  }

  update(field?:string){
    const scrollPosition = window.scrollY;
    if(field){
      if(field!='phases'){
        this.firestore.set(this.type,this.items[this.activeTab].id,this.items[this.activeTab][field],field)

      }
      else if(field=='phases'){
        console.log(this.items[this.activeTab][field])
        this.firestore.set(this.type,this.items[this.activeTab].id,this.items[this.activeTab][field],field,true).then(()=>{
          setTimeout(() => {
            window.scrollTo(0, scrollPosition);
          }, 100);
        })
      }
    }

  }

  addItem(){
    this.modalService.showConfirmation('Weet je zeker dat je deze actie wilt uitvoeren?').then((response)=>{
      if(response){
        let newItem = JSON.parse(JSON.stringify(this.newItem))
        delete newItem.visible
        this.firestore.create(this.type,newItem).then(()=>{
          this.newItem = JSON.parse(JSON.stringify(this.newItemOptions[this.type]))
          this.load(this.type)
        })
      }
    })
    
  
  }
  
  async removeItem(){

      const confirmed = await this.modalService.showConfirmation('Weet je zeker dat je deze actie wilt uitvoeren?');
      if (confirmed) {
        this.firestore.delete(this.type,this.items[this.activeTab].id).then(()=>{
          this.load(this.type)
        })
      } else {
        console.log('Actie geannuleerd');
      }

  }


  getBackups(type:string){
    this.backupService.getBackups(type,(backups:any)=>{
      // console.log(backups)
    })
  }

  getBackup(id:string, field:string){
    this.modalService.backups(this.backupService.backups,{id:id,field:field},'Select a backup to restore',(response:any)=>{
      if(response.data){
          this.modalService.showConfirmation('Are you sure you want to restore this backup?').then((responseConfirmation)=>{
            if(responseConfirmation){
              const scrollPosition = window.scrollY;
              this.firestore.set(this.type,this.items[this.activeTab].id,response.data,field).then(()=>{
                setTimeout(() => {
                  this.itemSubscription.unsubscribe()
                  this.load(this.type)
                  window.scrollTo(0, scrollPosition);
                }, 100);
              })
            }
          })
      }
    })
  }

  addPhase(){
    this.items[this.activeTab].phases.push({title:'',description:''})
    this.update('phases')  
  }

  removePhase(index:number){
    this.items[this.activeTab].phases.splice(index,1)
    this.update('phases')
  }

  movePhase(index:number, direction:number){
    let temp = this.items[this.activeTab].phases[index]
    this.items[this.activeTab].phases[index] = this.items[this.activeTab].phases[index+direction]
    this.items[this.activeTab].phases[index+direction] = temp
    this.update('phases')
  }

  savePhasesToInfo(){
    for(let i=0;i<this.items.length;i++){
      this.firestore.set('public_info',this.items[i].id,this.items[i].phases,'phases',false,'',()=>{
        //on error
        let obj = {
          phases:this.items[i].phases
        }
        this.firestore.set('public_info',this.items[i].id,obj)
      })
    }
  }
}
