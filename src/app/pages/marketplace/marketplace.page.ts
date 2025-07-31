import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/auth/auth.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';
import { NavService } from 'src/app/services/nav.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-marketplace',
  templateUrl: './marketplace.page.html',
  styleUrls: ['./marketplace.page.scss'],
})
export class MarketplacePage implements OnInit {
  activeTab:string = ''
  newTrainingCode:string = ''
  elearnings:any[] = []
  item_id:string = ''
  constructor(
    public media: MediaService,
    public icon:IconsService,
    public auth:AuthService,
    public nav:NavService,
    private route: ActivatedRoute,
    private translate:TranslateService,
    private toast:ToastService,
    private firestoreService: FirestoreService,
    public helper:HelpersService
  ) { }

  ngOnInit() {

    this.route.params.subscribe(params => {
      if(params['tab']){
        this.activeTab = params['tab'];
      }
      if(params['item_id']){
        this.item_id = params['item_id'];
      }
    });
    this.getElearnings();
  }

  ionViewDidEnter() {
    setTimeout(() => {
      this.nav.reloadMenu.emit(true)
    }, 10);
  }

  addManualTraining(){
    this.toast.showLoader()
    this.auth.registerWithCode(this.newTrainingCode,(res:any) => {
      this.toast.hideLoader();
      if(res.status==200){
        this.auth.getActiveCourses(this.auth.userInfo,()=>{
          let code = this.auth.readJWT(this.newTrainingCode);
          console.log('code',code)
          let newTraining = this.auth.getTraining(code.trainingId)
          if(newTraining?.status_access == 'active'){
            this.toast.show(this.translate.instant('trainings.training_added'),6000)
          }
          else{
            this.toast.show(this.translate.instant('trainings.training_added_pending'),6000)
          }
          this.nav.go('start/my_trainings');
        },true)
      }
      else{
        this.toast.show(this.translate.instant('error_messages.invalid_code'),6000)
      }
    })
  }

  getElearnings() {
    this.firestoreService.query('elearnings', 'open_to_public', true).subscribe((elearnings:any[]) => {
      this.elearnings = elearnings.map(e => {
        
        return {
          ...e.payload.doc.data(),
          id: e.payload.doc.id
        };
      });
      console.log('elearnings', this.elearnings);
    });
  }

  elearningItem(item_id:any) {
    if(!item_id && !this.item_id) {
      return {}
    }
    if(!item_id && this.item_id) {
      item_id = this.item_id;
    }
    return this.elearnings.find(e => e.id === item_id) || {};
  }

  countItems(item:any,type:string) {
    if(!item || !item.items) {
      return 0;
    }
    let itemsCount = this.countItemsInItems(item.items, type);
    return itemsCount;
  }


  countItemsInItems(items:any[], type:string) {
    if(!items || !Array.isArray(items)) {
      return 0;
    }
    let itemsCount = 0;
    items.forEach(item => {
      if(item.type === type) {
        itemsCount++;
      }
      if(item.items && Array.isArray(item.items)) {
        itemsCount += this.countItemsInItems(item.items, type);
      }
    });
    return itemsCount;
  }

  buyItem(item:any) {
    console.log('Buying item:', item);
    
  }
  
}
