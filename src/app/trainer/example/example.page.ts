import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/auth/auth.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { LevelsService } from 'src/app/services/levels.service';
import { MediaService } from 'src/app/services/media.service';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';
import { ToastService } from 'src/app/services/toast.service';
import { TrainerService } from 'src/app/services/trainer.service';

@Component({
  selector: 'app-example',
  templateUrl: './example.page.html',
  styleUrls: ['./example.page.scss'],
})
export class ExamplePage implements OnInit {
  [x:string]: any;
  id:any;
  type:any;
  trainingItem:any;
  modulesBreadCrumbs:any = [];
  itemsLoaded:boolean = false;
  constructor(
    public nav: NavService,
    public trainerService:TrainerService,
    public media:MediaService,
    private firestore:FirestoreService,
    public auth:AuthService,
    public icon:IconsService,
    private toast:ToastService,
    public translate:TranslateService,
    public helper:HelpersService,
    private route:ActivatedRoute,
    private modalService:ModalService,
    public levelService:LevelsService
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.id = params['id'];
      this.type = params['type'];
    });
    this.auth.userInfo$.subscribe(userInfo => {
      if (userInfo) {
        this.auth.hasActive('trainer').subscribe((trainer)=>{
          if(trainer &&!this.itemsLoaded){
              this.trainerService.loadTrainingsAndParticipants(()=>{
                this.itemsLoaded = true;
                if(!this.trainerService.breadCrumbs.length){
                  this.trainerService.breadCrumbs.push({type:this.type,item:this.exampleItem(this.type,this.id)})
                }
              })
              this.trainerService.loadModules(()=>{})
              this.trainerService.loadInfoItems(()=>{})
              this.trainerService.loadCases(()=>{})
              setTimeout(() => {
                this.itemsLoaded = true;
              }, 1000);
          }
        })
      }
    })

    this.auth.isOrgAdmin().subscribe((isAdmin)=>{
      console.log('isAdmin',isAdmin)
     if(isAdmin && !this.itemsLoaded){
        this.trainerService.loadTrainingsAndParticipants(()=>{
          this.itemsLoaded = true;
          if(!this.trainerService.breadCrumbs.length){
            this.trainerService.breadCrumbs.push({type:this.type,item:this.exampleItem(this.type,this.id)})
          }
        })
        this.trainerService.loadModules(()=>{})
        this.trainerService.loadInfoItems(()=>{})
        this.trainerService.loadCases(()=>{})
        setTimeout(() => {
          this.itemsLoaded = true;
        }, 1000);
     }
    })

  }

  exampleItem(type:string,id:string):any{
    if(type =='infoItem'){
      if(this.trainerService.breadCrumbs.length && this.trainerService.breadCrumbs[0].type=='training'){
        return this.trainerService.getItemTraining(id,this.trainerService.breadCrumbs[0].item.id) || {}
      }
      else{
        return this.trainerService.getInfoItem(id) || {}
      }
    }
    else if(type == 'module'){
      return this.trainerService.getModule(id) || {}
    }
    else if(type == 'training'){
      return this.trainerService.getTraining(id) || {}
    }
    else if(type == 'case'){
      if(this.trainerService.breadCrumbs.length && this.trainerService.breadCrumbs[0].type=='training'){
        return this.trainerService.getItemTraining(id,this.trainerService.breadCrumbs[0].item.id) || {}
      }
      else{
        return this.trainerService.getCase(id) || {}
      }
    }
  }

  selectSubModule(module:any){
      console.log('select submodule',module)
      this.modulesBreadCrumbs.push(module)
      console.log(this.modulesBreadCrumbs)
  }

  selectTrainingItem(item:any){
    console.log('select training item',item)
    console.log(this.trainerService.breadCrumbs)
    console.log(this.exampleItem(this.trainerService.breadCrumbs[0].type,item.id))
    if(item.type == 'infoItem'){
      if(this.trainerService.breadCrumbs.length && (this.trainerService.breadCrumbs[0].type=='training' || this.trainerService.breadCrumbs[0].type=='module')){
        this.modulesBreadCrumbs.push({type:'infoItem',item:this.exampleItem(item.type,item.id)})
      }
      else{
        this.modulesBreadCrumbs.push({type:'infoItem',item:item})
      }
    }
    else if(item.type == 'module'){
      if(this.trainerService.breadCrumbs.length && this.trainerService.breadCrumbs[0].type=='module'){
        
        this.modulesBreadCrumbs.push({type:'module',item:this.exampleItem(this.trainerService.breadCrumbs[0].type,this.trainerService.breadCrumbs[0].item.id)})
      }
      else{
        this.modulesBreadCrumbs.push({type:'module',item:item})
      }
    }
    else if(item.type == 'training'){
      this.modulesBreadCrumbs.push({type:'training',item:item})
    }
    console.log(this.modulesBreadCrumbs)
    // this.trainingItem = item
  }

  get latestBreadCrumbs(){
    if(this.modulesBreadCrumbs.length > 0){
      return this.modulesBreadCrumbs[this.modulesBreadCrumbs.length-1]
    }
    else{
      return {}
    }
  }

  backBreadCrumbs(){
    if(this.modulesBreadCrumbs.length > 0){
      this.modulesBreadCrumbs.pop()
    }
  }

  backToEdit(){
    if(this.trainerService.originEdit){
      this.nav.go(this.trainerService.originEdit)
    }
    else{
      if(this.type){
        if(this.type == 'infoItem'){
          this.nav.go('trainer/info-items')
        }
        else if(this.type == 'module'){
          this.nav.go('trainer/modules')
        }
        else if(this.type == 'training'){
          this.nav.go('trainer/trainings')
        }
        else if(this.type == 'case'){
          this.nav.go('trainer/cases')
        }
      }
      else{
        this.nav.go('trainer/trainings')
      }
      
    }
  }

  showCaseInfo(caseItem:any){
    this.modalService.showCaseInfo(caseItem)
  }

  setPageParam(){
    let param = ''
    param = 'trainer/example'
    return param
  }

  setOptionsParam(){
    let param = ''
    param = 'trainer/example'
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
