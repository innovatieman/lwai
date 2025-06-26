import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/auth/auth.service';
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
  constructor(
    public media: MediaService,
    public icon:IconsService,
    public auth:AuthService,
    public nav:NavService,
    private route: ActivatedRoute,
    private translate:TranslateService,
    private toast:ToastService
  ) { }

  ngOnInit() {

    this.route.params.subscribe(params => {
      if(params['tab']){
        this.activeTab = params['tab'];
      }
    });
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
}
