import { Component, EventEmitter, Input, input, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/auth/auth.service';
import { IconsService } from 'src/app/services/icons.service';
import { NavService } from 'src/app/services/nav.service';
import { TrainerService } from 'src/app/services/trainer.service';
import { MenuPage } from '../menu/menu.page';
import { PopoverController } from '@ionic/angular';
import { SelectMenuService } from 'src/app/services/select-menu.service';

@Component({
  selector: 'app-menu-mobile',
  templateUrl: './menu-mobile.component.html',
  styleUrls: ['./menu-mobile.component.scss'],
})
export class MenuMobileComponent  implements OnInit {
  heightMenu:string = '80px';
  menuOpen:boolean = false;
  selectedMenu:any[] = [];
  isAdmin:boolean = false;
  isTrainer:boolean = false;
  isTrainerPro:boolean = false;
  @Input() subMenu:boolean = false;
  @Input() options:string = '';
  @Output() action = new EventEmitter<any>();
  @Input() pageParam: string = '';
  pathname: string = window.location.pathname.split('/').pop() || '';
  [x: string]: any;
  constructor(
    public icon:IconsService,
    public nav:NavService,
    public translate:TranslateService,
    public auth:AuthService,
    private trainerService:TrainerService,
    private popoverController:PopoverController,
    public selectMenuservice:SelectMenuService
  ) { }

  ngOnInit() {
    this.closeMenu()
    if(!this.options || this.options === ''){
      this.selectedMenu = this.menuItems(this.locationURL)
    }
    else{
      this.selectedMenu = this.subMenuItems(this.options);
    }
    this.nav.reloadMenu.subscribe((reload:boolean) => {
      if(reload){
        if(!this.options || this.options === ''){
          this.selectedMenu = this.menuItems(this.locationURL)
        }
        else{
          this.selectedMenu = this.subMenuItems(this.options);
        }
      }
    })
    //trainer_environment
    this.auth.isAdmin().subscribe((admin) => {
      this.isAdmin = admin;
    });
    this.auth.hasActive('trainer').subscribe((trainer)=>{
      this.isTrainer = trainer
    })
    this.auth.hasActive('trainerPro').subscribe((trainerPro)=>{
      this.isTrainerPro = trainerPro
    })

  }

  openMenu(event:Event){
    event.stopPropagation();
    event.preventDefault();
    if(!this.options || this.options === ''){
      this.selectedMenu = this.menuItems(this.locationURL)
    }
    else{
      this.selectedMenu = this.subMenuItems(this.options);
    }
    this.heightMenu = ((this.selectedMenu.length * 68)) + 'px';
    this.menuOpen = true;
    // this.icon.loadIcons();
  }

  closeMenu(event?:Event){
    if(event){
      event.stopPropagation();
      event.preventDefault();
    }
    this.heightMenu = '64px';
    this.menuOpen = false;
    let el = document.getElementById('menuMobileInnerContainer')
    if(el){
      el.scrollTo({top:0,behavior:'smooth'});
    }
    setTimeout(() => {
      if(!this.options || this.options === ''){
        this.selectedMenu = this.menuItems(this.locationURL)
      }
      else{
        this.selectedMenu = this.subMenuItems(this.options);
      }
    }, 20);
  }

    menuItems(page:string){
    if(this.pageParam){
      page = this.pageParam;
    }
    let pageParts = page.split('/');
    let list:any[] = []
    switch(pageParts[0]){
      case 'start':
        switch(pageParts[1]){
          case '':
          case undefined:
          case 'score':
          case 'dashboard':
            list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
            list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
            list.push({title:this.translate.instant('buttons.search_case'),icon:'faSearch',url:'start/cases/search'});
            list.push({title:this.translate.instant('buttons.create_self'),icon:'faLightbulb',url:'start/cases/create_self'});
            if(this.auth.activeCourses?.length || this.auth.myElearnings?.length){
              list.push({title:this.translate.instant('buttons.your_trainings'),icon:'faGraduationCap',url:'start/my_trainings'});
            }
            if(this.auth.myOrganisationsList?.length){
              list.push({title:this.translate.instant('buttons.my_organisation'),icon:'faBuilding',menuAction:'selectOrganisation'});
            }
            list.push({title:this.translate.instant('buttons.account'),icon:'faUser',url:'account/basics'});
            if(this.isTrainer){
              list.push({title:this.translate.instant('buttons.trainer_environment'),icon:'faGraduationCap',menuAction:'trainerMenu'});
            }
            break;         
          case 'cases':
            switch(pageParts[2]){
              case undefined:
              case 'search':
                list.push({title:this.translate.instant('buttons.search_case'),icon:'faSearch',url:'start/cases/search'});
                list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
                list.push({title:this.translate.instant('buttons.search_case'),icon:'faSearch',url:'start/cases/search'});
                list.push({title:this.translate.instant('buttons.create_self'),icon:'faLightbulb',url:'start/cases/create_self'});
                if(this.auth.activeCourses?.length || this.auth.myElearnings?.length){
                  list.push({title:this.translate.instant('buttons.your_trainings'),icon:'faGraduationCap',url:'start/my_trainings'});
                }
                if(this.auth.myOrganisationsList?.length){
                  list.push({title:this.translate.instant('buttons.my_organisation'),icon:'faBuilding',menuAction:'selectOrganisation'});
                }
                list.push({title:this.translate.instant('buttons.account'),icon:'faUser',url:'account/basics'});
                if(this.isTrainer){
                  list.push({title:this.translate.instant('buttons.trainer_environment'),icon:'faGraduationCap',menuAction:'trainerMenu'});
                }
                break;
              case 'create_self':
                list.push({title:this.translate.instant('buttons.create_self'),icon:'faLightbulb',url:'start/cases/create_self'});
                list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
                list.push({title:this.translate.instant('buttons.search_case'),icon:'faSearch',url:'start/cases/search'});
                list.push({title:this.translate.instant('buttons.create_self'),icon:'faLightbulb',url:'start/cases/create_self'});
                if(this.auth.activeCourses?.length || this.auth.myElearnings?.length){
                  list.push({title:this.translate.instant('buttons.your_trainings'),icon:'faGraduationCap',url:'start/my_trainings'});
                }
                if(this.auth.myOrganisationsList?.length){
                  list.push({title:this.translate.instant('buttons.my_organisation'),icon:'faBuilding',url:'start/my_organisation'});
                }
                list.push({title:this.translate.instant('buttons.account'),icon:'faUser',url:'account/basics'});
                if(this.isTrainer){
                  list.push({title:this.translate.instant('buttons.trainer_environment'),icon:'faGraduationCap',menuAction:'trainerMenu'});
                }
                break;
              default:
                list = []
              break;
            }
            break;
          case 'my_trainings':
            list.push({title:this.translate.instant('buttons.your_trainings'),icon:'faGraduationCap',url:'start/my_trainings'});
            list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
            list.push({title:this.translate.instant('buttons.search_case'),icon:'faSearch',url:'start/cases/search'});
            list.push({title:this.translate.instant('buttons.create_self'),icon:'faLightbulb',url:'start/cases/create_self'});
            if(this.auth.activeCourses?.length || this.auth.myElearnings?.length){
              list.push({title:this.translate.instant('buttons.your_trainings'),icon:'faGraduationCap',url:'start/my_trainings'});
            }
            if(this.auth.myOrganisationsList?.length){
              list.push({title:this.translate.instant('buttons.my_organisation'),icon:'faBuilding',menuAction:'selectOrganisation'});
            }
            list.push({title:this.translate.instant('buttons.account'),icon:'faUser',url:'account/basics'});
            if(this.isTrainer){
              list.push({title:this.translate.instant('buttons.trainer_environment'),icon:'faGraduationCap',menuAction:'trainerMenu'});
            }
            break;
          case 'my_organisation':
            list.push({title:this.translate.instant('buttons.my_organisation'),icon:'faBuilding',url:'start/my_organisation'});
            list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
            list.push({title:this.translate.instant('buttons.search_case'),icon:'faSearch',url:'start/cases/search'});
            list.push({title:this.translate.instant('buttons.create_self'),icon:'faLightbulb',url:'start/cases/create_self'});
            if(this.auth.activeCourses?.length || this.auth.myElearnings?.length){
              list.push({title:this.translate.instant('buttons.your_trainings'),icon:'faGraduationCap',url:'start/my_trainings'});
            }
            if(this.auth.myOrganisationsList?.length){
              list.push({title:this.translate.instant('buttons.my_organisation'),icon:'faBuilding',menuAction:'selectOrganisation'});
            }
            list.push({title:this.translate.instant('buttons.account'),icon:'faUser',url:'account/basics'});
            if(this.isTrainer){
              list.push({title:this.translate.instant('buttons.trainer_environment'),icon:'faGraduationCap',menuAction:'trainerMenu'});
            }
            break;
        }
        break;
      case 'account':
        switch(pageParts[1]){
          case undefined:
          case '':
          case 'basics':
            list.push({title:this.translate.instant('buttons.account'),icon:'faUser',url:'account/basics'});
            list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
            list.push({title:this.translate.instant('buttons.account'),icon:'faUser',url:'account/basics'});
            list.push({title:this.translate.instant('page_account.my_finished_cases'),icon:'faComments',url:'account/conversations'});
            list.push({title:this.translate.instant('page_account.credits'),icon:'faCoins',url:'account/credits'});
            if(this.auth.customer?.stripeCustomerId){
              list.push({title:this.translate.instant('page_account.billing'),icon:'faCreditCard',action:'auth.openStripeDashboard'});
            }
            if(this.isTrainer){
              list.push({title:this.translate.instant('buttons.trainer_environment'),icon:'faGraduationCap',menuAction:'trainerMenu'});
            }
            if(!this.isTrainer){
              list.push({title:this.translate.instant('page_account.become_trainer'),icon:'faGraduationCap',url:'account/become_trainer'});
            }
            if(this.isTrainer&&!this.isTrainerPro){
              list.push({title:this.translate.instant('page_account.become_trainer_pro'),icon:'faGraduationCap',url:'account/become_trainer'});
            }
            break;
          case 'credits':
            list.push({title:this.translate.instant('page_account.credits'),icon:'faCoins',url:'account/credits'});
            list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
            list.push({title:this.translate.instant('buttons.account'),icon:'faUser',url:'account/basics'});
            list.push({title:this.translate.instant('page_account.my_finished_cases'),icon:'faComments',url:'account/conversations'});
            list.push({title:this.translate.instant('page_account.credits'),icon:'faCoins',url:'account/credits'});
            if(this.auth.customer?.stripeCustomerId){
              list.push({title:this.translate.instant('page_account.billing'),icon:'faCreditCard',action:'auth.openStripeDashboard'});
            }
            if(this.isTrainer){
              list.push({title:this.translate.instant('buttons.trainer_environment'),icon:'faGraduationCap',menuAction:'trainerMenu'});
            }
            if(!this.isTrainer){
              list.push({title:this.translate.instant('page_account.become_trainer'),icon:'faGraduationCap',url:'account/become_trainer'});
            }
            if(this.isTrainer&&!this.isTrainerPro){
              list.push({title:this.translate.instant('page_account.become_trainer_pro'),icon:'faGraduationCap',url:'account/become_trainer'});
            }
            break;
          case 'conversations':
            list.push({title:this.translate.instant('page_account.my_finished_cases'),icon:'faComments',url:'account/conversations'});
            list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
            list.push({title:this.translate.instant('buttons.account'),icon:'faUser',url:'account/basics'});
            list.push({title:this.translate.instant('page_account.my_finished_cases'),icon:'faComments',url:'account/conversations'});
            list.push({title:this.translate.instant('page_account.credits'),icon:'faCoins',url:'account/credits'});
            if(this.auth.customer?.stripeCustomerId){
              list.push({title:this.translate.instant('page_account.billing'),icon:'faCreditCard',action:'auth.openStripeDashboard'});
            }
            if(this.isTrainer){
              list.push({title:this.translate.instant('buttons.trainer_environment'),icon:'faGraduationCap',menuAction:'trainerMenu'});
            }
            if(!this.isTrainer){
              list.push({title:this.translate.instant('page_account.become_trainer'),icon:'faGraduationCap',url:'account/become_trainer'});
            }
            if(this.isTrainer&&!this.isTrainerPro){
              list.push({title:this.translate.instant('page_account.become_trainer_pro'),icon:'faGraduationCap',url:'account/become_trainer'});
            }
            break;
          case 'become_trainer':
            list.push({title:this.translate.instant('page_account.become_trainer'),icon:'faGraduationCap',url:'account/become_trainer'});
            list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
            list.push({title:this.translate.instant('buttons.account'),icon:'faUser',url:'account/basics'});
            list.push({title:this.translate.instant('page_account.my_finished_cases'),icon:'faComments',url:'account/conversations'});
            list.push({title:this.translate.instant('page_account.credits'),icon:'faCoins',url:'account/credits'});
            if(this.auth.customer?.stripeCustomerId){
              list.push({title:this.translate.instant('page_account.billing'),icon:'faCreditCard',action:'auth.openStripeDashboard'});
            }
            if(this.isTrainer){
              list.push({title:this.translate.instant('buttons.trainer_environment'),icon:'faGraduationCap',menuAction:'trainerMenu'});
            }
            if(!this.isTrainer){
              list.push({title:this.translate.instant('page_account.become_trainer'),icon:'faGraduationCap',url:'account/become_trainer'});
            }
            if(this.isTrainer&&!this.isTrainerPro){
              list.push({title:this.translate.instant('page_account.become_trainer_pro'),icon:'faGraduationCap',url:'account/become_trainer'});
            }
            break;
        }
        break;
      case 'trainer':
        switch(pageParts[1]){
          case 'trainings':
            switch(pageParts[2]){
              case '':
              case undefined:
                list.push({title:this.translate.instant('standards.trainings'),icon:'faGraduationCap',url:'trainer/trainings'});
                list.push({title:this.translate.instant('trainings.concept_training'),icon:'faGraduationCap',clickAction:"filterWith(concept)",indent:40});
                list.push({title:this.translate.instant('trainings.active_training'),icon:'faGraduationCap',clickAction:"filterWith(published)",indent:40});
                list.push({title:this.translate.instant('trainings.closed_training'),icon:'faGraduationCap',clickAction:"filterWith(closed)",indent:40});
                list.push({title:this.translate.instant('dashboard.organisation'),icon:'faBuilding',url:'trainer/dashboard'});
                list.push({title:this.translate.instant('standards.cases'),icon:'faUser',url:'trainer/cases'});
                list.push({title:this.translate.instant('standards.info_items'),icon:'faFileAlt',url:'trainer/info-items'});
                list.push({title:this.translate.instant('standards.modules'),icon:'faGripHorizontal',url:'trainer/modules'});
                list.push({title:this.translate.instant('standards.trainings'),icon:'faGraduationCap',url:'trainer/trainings'});
                list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
                break;
              case 'published':
                list.push({title:this.translate.instant('trainings.active_training'),icon:'faGraduationCap',clickAction:"filterWith(published)"});
                list.push({title:this.translate.instant('trainings.concept_training'),icon:'faGraduationCap',clickAction:"filterWith(concept)",indent:40});
                list.push({title:this.translate.instant('trainings.active_training'),icon:'faGraduationCap',clickAction:"filterWith(published)",indent:40});
                list.push({title:this.translate.instant('trainings.closed_training'),icon:'faGraduationCap',clickAction:"filterWith(closed)",indent:40});
                list.push({title:this.translate.instant('dashboard.organisation'),icon:'faBuilding',url:'trainer/dashboard'});
                list.push({title:this.translate.instant('standards.cases'),icon:'faUser',url:'trainer/cases'});
                list.push({title:this.translate.instant('standards.info_items'),icon:'faFileAlt',url:'trainer/info-items'});
                list.push({title:this.translate.instant('standards.modules'),icon:'faGripHorizontal',url:'trainer/modules'});
                list.push({title:this.translate.instant('standards.trainings'),icon:'faGraduationCap',url:'trainer/trainings'});
                list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
                break;
              case 'concept':
                list.push({title:this.translate.instant('trainings.concept_training'),icon:'faGraduationCap',clickAction:"filterWith(concept)"});
                list.push({title:this.translate.instant('trainings.concept_training'),icon:'faGraduationCap',clickAction:"filterWith(concept)",indent:40});
                list.push({title:this.translate.instant('trainings.active_training'),icon:'faGraduationCap',clickAction:"filterWith(published)",indent:40});
                list.push({title:this.translate.instant('trainings.closed_training'),icon:'faGraduationCap',clickAction:"filterWith(closed)",indent:40});
                list.push({title:this.translate.instant('dashboard.organisation'),icon:'faBuilding',url:'trainer/dashboard'});
                list.push({title:this.translate.instant('standards.cases'),icon:'faUser',url:'trainer/cases'});
                list.push({title:this.translate.instant('standards.info_items'),icon:'faFileAlt',url:'trainer/info-items'});
                list.push({title:this.translate.instant('standards.modules'),icon:'faGripHorizontal',url:'trainer/modules'});
                list.push({title:this.translate.instant('standards.trainings'),icon:'faGraduationCap',url:'trainer/trainings'});
                list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
                break;
              case 'closed':
                list.push({title:this.translate.instant('trainings.closed_training'),icon:'faGraduationCap',clickAction:"filterWith(closed)"});
                list.push({title:this.translate.instant('trainings.concept_training'),icon:'faGraduationCap',clickAction:"filterWith(concept)",indent:40});
                list.push({title:this.translate.instant('trainings.active_training'),icon:'faGraduationCap',clickAction:"filterWith(published)",indent:40});
                list.push({title:this.translate.instant('trainings.closed_training'),icon:'faGraduationCap',clickAction:"filterWith(closed)",indent:40});
                list.push({title:this.translate.instant('dashboard.organisation'),icon:'faBuilding',url:'trainer/dashboard'});
                list.push({title:this.translate.instant('standards.cases'),icon:'faUser',url:'trainer/cases'});
                list.push({title:this.translate.instant('standards.info_items'),icon:'faFileAlt',url:'trainer/info-items'});
                list.push({title:this.translate.instant('standards.modules'),icon:'faGripHorizontal',url:'trainer/modules'});
                list.push({title:this.translate.instant('standards.trainings'),icon:'faGraduationCap',url:'trainer/trainings'});
                list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
                break;
              case 'items_published':
                list.push({title:this.translate.instant('standards.training'),icon:'faTh',clickAction:'setShowPart(items)'});
                list.push({title:this.translate.instant('standards.training'),icon:'faTh',clickAction:'setShowPart(items)'});
                list.push({title:this.translate.instant('trainings.credit_management'),icon:'faCoins',clickAction:'setShowPart(credits)'});
                list.push({title:this.translate.instant('cases.participants'),icon:'faUsers',clickAction:'setShowPart(participants)'});
                list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
                break;
              case 'participants_published':
                list.push({title:this.translate.instant('cases.participants'),icon:'faUsers',clickAction:'setShowPart(participants)'});
                list.push({title:this.translate.instant('standards.training'),icon:'faTh',clickAction:'setShowPart(items)'});
                list.push({title:this.translate.instant('trainings.credit_management'),icon:'faCoins',clickAction:'setShowPart(credits)'});
                list.push({title:this.translate.instant('cases.participants'),icon:'faUsers',clickAction:'setShowPart(participants)'});
                list.push({title:this.translate.instant('trainings.export'),icon:'faFileExport',clickAction:'exportTraining(trainerService:trainingItem)'});
                list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
                break;
              case 'credits_published':
                list.push({title:this.translate.instant('trainings.credit_management'),icon:'faCoins',clickAction:'setShowPart(credits)'});
                list.push({title:this.translate.instant('standards.training'),icon:'faTh',clickAction:'setShowPart(items)'});
                list.push({title:this.translate.instant('trainings.credit_management'),icon:'faCoins',clickAction:'setShowPart(credits)'});
                list.push({title:this.translate.instant('cases.participants'),icon:'faUsers',clickAction:'setShowPart(participants)'});
                list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
                break;
              case 'items_concept':
                list.push({title:this.translate.instant('standards.training'),icon:'faTh',clickAction:'setShowPart(items)'});
                list.push({title:this.translate.instant('standards.training'),icon:'faTh',clickAction:'setShowPart(items)'});
                list.push({title:this.translate.instant('buttons.publish'),icon:'faCloudUploadAlt',clickAction:'setShowPart(publish)'});
                list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
                break;
              case 'publish_concept':
                list.push({title:this.translate.instant('buttons.publish'),icon:'faCloudUploadAlt',clickAction:'setShowPart(publish)'});
                list.push({title:this.translate.instant('standards.training'),icon:'faTh',clickAction:'setShowPart(items)'});
                list.push({title:this.translate.instant('buttons.publish'),icon:'faCloudUploadAlt',clickAction:'setShowPart(publish)'});
                list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
                break;            
            }
            break;
          case 'modules':
            switch(pageParts[2]){
              case '':
              case undefined:
                  list.push({title:this.translate.instant('standards.modules'),icon:'faGripHorizontal',url:'trainer/modules'});
                  list.push({title:this.translate.instant('dashboard.organisation'),icon:'faBuilding',url:'trainer/dashboard'});
                  list.push({title:this.translate.instant('standards.cases'),icon:'faUser',url:'trainer/cases'});
                  list.push({title:this.translate.instant('standards.info_items'),icon:'faFileAlt',url:'trainer/info-items'});
                  list.push({title:this.translate.instant('standards.modules'),icon:'faGripHorizontal',url:'trainer/modules'});
                  list.push({title:this.translate.instant('standards.trainings'),icon:'faGraduationCap',url:'trainer/trainings'});
                  list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
                  break;
            }
            break;
          case 'cases':
            switch(pageParts[2]){
              case '':
              case undefined:
                  list.push({title:this.translate.instant('standards.cases'),icon:'faUser',url:'trainer/cases'});
                  list.push({title:this.translate.instant('dashboard.organisation'),icon:'faBuilding',url:'trainer/dashboard'});
                  list.push({title:this.translate.instant('standards.cases'),icon:'faUser',url:'trainer/cases'});
                  list.push({title:this.translate.instant('standards.info_items'),icon:'faFileAlt',url:'trainer/info-items'});
                  list.push({title:this.translate.instant('standards.modules'),icon:'faGripHorizontal',url:'trainer/modules'});
                  list.push({title:this.translate.instant('standards.trainings'),icon:'faGraduationCap',url:'trainer/trainings'});
                  list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
                  break;
            }
            break;
          case 'info-items':
            switch(pageParts[2]){
              case '':
              case undefined:
                  list.push({title:this.translate.instant('standards.info_items'),icon:'faFileAlt',url:'trainer/info-items'});
                  list.push({title:this.translate.instant('dashboard.organisation'),icon:'faBuilding',url:'trainer/dashboard'});
                  list.push({title:this.translate.instant('standards.cases'),icon:'faUser',url:'trainer/cases'});
                  list.push({title:this.translate.instant('standards.info_items'),icon:'faFileAlt',url:'trainer/info-items'});
                  list.push({title:this.translate.instant('standards.modules'),icon:'faGripHorizontal',url:'trainer/modules'});
                  list.push({title:this.translate.instant('standards.trainings'),icon:'faGraduationCap',url:'trainer/trainings'});
                  list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
                  break;
            }
            break;
          case 'dashboard':
            switch(pageParts[2]){
              case '':
              case undefined:
                  list.push({title:this.translate.instant('dashboard.organisation'),icon:'faBuilding',url:'trainer/dashboard'});
                  list.push({title:this.translate.instant('dashboard.settings'),icon:'faBuilding',clickAction:'setShowPart(settings)',indent:40});
                  if(this.trainerService.trainerInfo.organisation){
                    list.push({title:this.translate.instant('standards.employees'),icon:'faBuilding',url:'trainer/dashboard',clickAction:'setShowPart(employees)',indent:40});
                  }
                  if(this.auth.customer?.stripeCustomerId){
                    list.push({title:this.translate.instant('page_account.billing'),icon:'faCreditCard',action:'auth.openStripeDashboard',indent:40});
                  }
                  list.push({title:this.translate.instant('page_account.become_trainer_pro'),icon:'faGraduationCap',clickAction:'setShowPart(become_trainer)',indent:40});
                  list.push({title:this.translate.instant('standards.cases'),icon:'faUser',url:'trainer/cases'});
                  list.push({title:this.translate.instant('standards.info_items'),icon:'faFileAlt',url:'trainer/info-items'});
                  list.push({title:this.translate.instant('standards.modules'),icon:'faGripHorizontal',url:'trainer/modules'});
                  list.push({title:this.translate.instant('standards.trainings'),icon:'faGraduationCap',url:'trainer/trainings'});
                  list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
                break;
              case 'settings':
                list.push({title:this.translate.instant('dashboard.settings'),icon:'faBuilding',clickAction:'setShowPart(settings)'});
                  list.push({title:this.translate.instant('dashboard.organisation'),icon:'faBuilding',url:'trainer/dashboard'});
                  list.push({title:this.translate.instant('dashboard.settings'),icon:'faBuilding',clickAction:'setShowPart(settings)',indent:40});
                  if(this.trainerService.trainerInfo.organisation){
                    list.push({title:this.translate.instant('standards.employees'),icon:'faBuilding',clickAction:'setShowPart(employees)',indent:40});
                  }
                  if(this.auth.customer?.stripeCustomerId){
                    list.push({title:this.translate.instant('page_account.billing'),icon:'faCreditCard',action:'auth.openStripeDashboard',indent:40});
                  }
                  list.push({title:this.translate.instant('page_account.become_trainer_pro'),icon:'faGraduationCap',clickAction:'setShowPart(become_trainer)',indent:40});
                  list.push({title:this.translate.instant('standards.cases'),icon:'faUser',url:'trainer/cases'});
                  list.push({title:this.translate.instant('standards.info_items'),icon:'faFileAlt',url:'trainer/info-items'});
                  list.push({title:this.translate.instant('standards.modules'),icon:'faGripHorizontal',url:'trainer/modules'});
                  list.push({title:this.translate.instant('standards.trainings'),icon:'faGraduationCap',url:'trainer/trainings'});
                  list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
                break;
              case 'employees':
                list.push({title:this.translate.instant('standards.employees'),icon:'faBuilding',clickAction:'setShowPart(employees)'});
                  list.push({title:this.translate.instant('dashboard.organisation'),icon:'faBuilding',url:'trainer/dashboard'});
                  list.push({title:this.translate.instant('dashboard.settings'),icon:'faBuilding',clickAction:'setShowPart(settings)',indent:40});
                  if(this.trainerService.trainerInfo.organisation){
                    list.push({title:this.translate.instant('standards.employees'),icon:'faBuilding',clickAction:'setShowPart(employees)',indent:40});
                  }
                  if(this.auth.customer?.stripeCustomerId){
                    list.push({title:this.translate.instant('page_account.billing'),icon:'faCreditCard',action:'auth.openStripeDashboard',indent:40});
                  }
                  list.push({title:this.translate.instant('page_account.become_trainer_pro'),icon:'faGraduationCap',clickAction:'setShowPart(become_trainer)',indent:40});
                  list.push({title:this.translate.instant('standards.cases'),icon:'faUser',url:'trainer/cases'});
                  list.push({title:this.translate.instant('standards.info_items'),icon:'faFileAlt',url:'trainer/info-items'});
                  list.push({title:this.translate.instant('standards.modules'),icon:'faGripHorizontal',url:'trainer/modules'});
                  list.push({title:this.translate.instant('standards.trainings'),icon:'faGraduationCap',url:'trainer/trainings'});
                  list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
                break;
              case 'become_trainer':
                  list.push({title:this.translate.instant('page_account.become_trainer_pro'),icon:'faGraduationCap',clickAction:'setShowPart(become_trainer)',indent:40});
                  list.push({title:this.translate.instant('dashboard.organisation'),icon:'faBuilding',url:'trainer/dashboard'});
                  list.push({title:this.translate.instant('dashboard.settings'),icon:'faBuilding',clickAction:'setShowPart(settings)',indent:40});
                  if(this.trainerService.trainerInfo.organisation){
                    list.push({title:this.translate.instant('standards.employees'),icon:'faBuilding',url:'trainer/dashboard',clickAction:'setShowPart(employees)',indent:40});
                  }
                  if(this.auth.customer?.stripeCustomerId){
                    list.push({title:this.translate.instant('page_account.billing'),icon:'faCreditCard',action:'auth.openStripeDashboard',indent:40});
                  }
                  list.push({title:this.translate.instant('page_account.become_trainer_pro'),icon:'faGraduationCap',clickAction:'setShowPart(become_trainer)',indent:40});
                  list.push({title:this.translate.instant('standards.cases'),icon:'faUser',url:'trainer/cases'});
                  list.push({title:this.translate.instant('standards.info_items'),icon:'faFileAlt',url:'trainer/info-items'});
                  list.push({title:this.translate.instant('standards.modules'),icon:'faGripHorizontal',url:'trainer/modules'});
                  list.push({title:this.translate.instant('standards.trainings'),icon:'faGraduationCap',url:'trainer/trainings'});
                  list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
                break;
            }
            break;
          case 'example':
            switch(pageParts[2]){
              case '':
              case undefined:
                  list.push({title:this.translate.instant('cases.check_example'),icon:'faEye'});
                  list.push({title:this.translate.instant('dashboard.organisation'),icon:'faBuilding',url:'trainer/dashboard'});
                  list.push({title:this.translate.instant('standards.cases'),icon:'faUser',url:'trainer/cases'});
                  list.push({title:this.translate.instant('standards.info_items'),icon:'faFileAlt',url:'trainer/info-items'});
                  list.push({title:this.translate.instant('standards.modules'),icon:'faGripHorizontal',url:'trainer/modules'});
                  list.push({title:this.translate.instant('standards.trainings'),icon:'faGraduationCap',url:'trainer/trainings'});
                  list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
                  break;
            }
            break;
        }
        break;
      case 'marketplace':
        switch(pageParts[1]){
          case undefined:
          case '':
          case 'elearnings':
            list.push({title:this.translate.instant('marketplace.elearnings'),icon:'faBookOpen',url:'marketplace/elearnings'});
            list.push({title:this.translate.instant('marketplace.add_training'),icon:'faPlus',url:'marketplace/manual'});
            list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
            list.push({title:this.translate.instant('buttons.search_case'),icon:'faSearch',url:'start/cases/search'});
            list.push({title:this.translate.instant('buttons.create_self'),icon:'faLightbulb',url:'start/cases/create_self'});
            if(this.auth.activeCourses?.length || this.auth.myElearnings?.length){
              list.push({title:this.translate.instant('buttons.your_trainings'),icon:'faGraduationCap',url:'start/my_trainings'});
            }
            if(this.auth.myOrganisationsList?.length){
              list.push({title:this.translate.instant('buttons.my_organisation'),icon:'faBuilding',url:'start/my_organisation'});
            }
            list.push({title:this.translate.instant('buttons.account'),icon:'faUser',url:'account/basics'});
            if(this.isTrainer){
              list.push({title:this.translate.instant('buttons.trainer_environment'),icon:'faGraduationCap',menuAction:'trainerMenu'});
            }
            break;
          
          case 'manual':
            list.push({title:this.translate.instant('marketplace.add_training'),icon:'faPlus',url:'marketplace/manual'});
            list.push({title:this.translate.instant('marketplace.elearnings'),icon:'faBookOpen',url:'marketplace/elearnings'});
            list.push({title:this.translate.instant('buttons.dashboard'),icon:'faHome',url:'start'});
            list.push({title:this.translate.instant('buttons.search_case'),icon:'faSearch',url:'start/cases/search'});
            list.push({title:this.translate.instant('buttons.create_self'),icon:'faLightbulb',url:'start/cases/create_self'});
            if(this.auth.activeCourses?.length || this.auth.myElearnings?.length){
              list.push({title:this.translate.instant('buttons.your_trainings'),icon:'faGraduationCap',url:'start/my_trainings'});
            }
            if(this.auth.myOrganisationsList?.length){
              list.push({title:this.translate.instant('buttons.my_organisation'),icon:'faBuilding',url:'start/my_organisation'});
            }
            list.push({title:this.translate.instant('buttons.account'),icon:'faUser',url:'account/basics'});
            if(this.isTrainer){
              list.push({title:this.translate.instant('buttons.trainer_environment'),icon:'faGraduationCap',menuAction:'trainerMenu'});
            }
            break;
          }
        break;
      default:
        list = []
        break;
    }   
      
    for(let i=0;i<list.length;i++){
      list[0].icon = 'faBars';
    }
    return list;
  }

  subMenuItems(options:string){
    let pageParts = options.split('/');
    let list:any[] = []
    switch(pageParts[0]){
      case 'trainer':
        switch(pageParts[1]){
          case undefined:
          case 'trainings':
            switch(pageParts[2]){
              case undefined:
              case '':
                list.push({title:'',icon:'faPen'});
                list.push({title:this.translate.instant('trainings.new_training'),icon:'faPlus',clickAction:'addTraining'});
                list.push({title:this.translate.instant('trainings.import_training'),icon:'faFileImport',clickAction:'importClick'});
                break;
              case 'item':
                list.push({title:'',icon:'faPen'});
                list.push({title:this.translate.instant('trainings.copy_training'),icon:'faPlus',clickAction:'copyTraining'});
                list.push({title:this.translate.instant('cases.check_example'),icon:'faEye',clickAction:'example'});
                list.push({title:this.translate.instant('trainings.delete_training'),icon:'faTrashAlt',clickAction:'deleteTraining(trainerService:trainingItem)'});
                list.push({title:this.translate.instant('trainings.export'),icon:'faFileExport',clickAction:'exportTraining(trainerService:trainingItem)'});
                break;
            }
            break;
          case 'modules':
            switch(pageParts[2]){
              case undefined:
              case '':
                list.push({title:'',icon:'faPen'});
                list.push({title:this.translate.instant('cases.new_module'),icon:'faPlus',clickAction:'addModule'});
                break;
              case 'item':
                list.push({title:'',icon:'faPen'});
                list.push({title:this.translate.instant('modules.copy_module'),icon:'faPlus',clickAction:'copyModule'});
                list.push({title:this.translate.instant('cases.check_example'),icon:'faEye',clickAction:'example'});
                list.push({title:this.translate.instant('modules.delete_module'),icon:'faTrashAlt',clickAction:'deleteModule(trainerService:moduleItem)'});
                break;
            }
            break;
          case 'cases':
            switch(pageParts[2]){
              case undefined:
              case '':
                list.push({title:'',icon:'faPen'});
                list.push({title:this.translate.instant('cases.new_case'),icon:'faPlus',clickAction:'addCase'});
                list.push({title:this.translate.instant('cases.use_template'),icon:'faCopy',clickAction:'importCase'});
                list.push({title:this.translate.instant('cases.import_case'),icon:'faFileImport',clickAction:'importClick'});
                break;
              case 'item':
                list.push({title:'',icon:'faPen'});
                list.push({title:this.translate.instant('cases.copy_case'),icon:'faCopy',clickAction:'copyCase'});
                list.push({title:this.translate.instant('cases.practice'),icon:'faComments',clickAction:'practice'});
                list.push({title:this.translate.instant('cases.remove_case'),icon:'faTrashAlt',clickAction:'deleteCase'});
                list.push({title:this.translate.instant('cases.export_case'),icon:'faFileExport',clickAction:'exportItem(trainerService:caseItem)'});
                break;
            }
            break;
          case 'info-items':
            switch(pageParts[2]){
              case undefined:
              case '':
                list.push({title:'',icon:'faPen'});
                list.push({title:this.translate.instant('cases.new_info_item'),icon:'faPlus',clickAction:'addItem'});
                list.push({title:this.translate.instant('cases.import_item'),icon:'faFileImport',clickAction:'importClick'});
                break;
              case 'item':
                list.push({title:'',icon:'faPen'});
                list.push({title:this.translate.instant('cases.copy_item'),icon:'faCopy',clickAction:'copyItem'});
                list.push({title:this.translate.instant('cases.check_example'),icon:'faEye',clickAction:'example'});
                list.push({title:this.translate.instant('cases.remove_item'),icon:'faTrashAlt',clickAction:'deleteItem'});
                list.push({title:this.translate.instant('cases.export_item'),icon:'faFileExport',clickAction:'exportItem(trainerService:infoItem)'});
                break;
            }
            break;
          case 'example':
            switch(pageParts[2]){
              case undefined:
              case '':
                list.push({title:'',icon:'faPen',clickAction:'backToEdit',notOpenMenu:true});
                break;
            }
            break;
        }
    }
    return list;
  
  }

  handleClick(first:boolean,item: any, event: Event): void {
  if (!first) {
    if (item.clickAction) {
      this.clickAction(item.clickAction,event);
    }
    else if (item.menuAction) {
      this[item.menuAction]();
    }
    else {
      this.goto(item, event);
      
    }
  } else {
    if(item.notOpenMenu){
      this.handleClick(false, item, event);
      return;
    }
    if (this.menuOpen) {
      this.closeMenu(event);
    } else {
      this.openMenu(event);
    }
  }
}



  shortMenu:any;
  async trainerMenu(){
    if(this.auth.organisations.length==1){
      this.nav.activeOrganisationId = this.auth.organisations[0].id
      if(window.location.pathname.indexOf('trainer')==-1){
        this.nav.go('/trainer/dashboard')
        this.closeMenu();
      }
      return
    }

    let list = []
    for(let i=0;i<this.auth.organisations.length;i++){
      list.push({
        title:this.auth.organisations[i].name,
        icon:this.auth.organisations[i].logo ? '' :'faStar',
        image:this.auth.organisations[i].logo ? this.auth.organisations[i].logo : '',
        // url:'/trainer/trainings',
        id:this.auth.organisations[i].id,
        value:this.auth.organisations[i].id,
      })
    }

    this.shortMenu = await this.popoverController.create({
      component: MenuPage,
      componentProps:{
        customMenu:true,
        pages:list
      },
      cssClass: 'customMenu',
      event: event,
      translucent: false,
      reference:'trigger',
    });
    this.shortMenu.shadowRoot.lastChild.lastChild['style'].cssText = 'border-radius: 24px !important;';
    await this.shortMenu.present();
    await this.shortMenu.onWillDismiss().then((result:any)=>{
      if(this.selectMenuservice.selectedItem){
        this.nav.changeOrganisation(this.selectMenuservice.selectedItem.id)
        if(window.location.pathname.indexOf('trainer')==-1){
          this.nav.go('/trainer/dashboard')
          this.closeMenu();
        }
      }
      
    })
  }

  async selectOrganisation(event?:any){
    if(event){
      event.preventDefault()
      event.stopPropagation()
    }
    let list = []
    if(this.auth.organisations.length==1){
      this.nav.gotoOrganisation(event,this.auth.organisations[0].id)
      this.closeMenu();
      return;
    }
    for(let i=0;i<this.auth.organisationTrainings.length;i++){
      list.push({
        title:this.auth.organisationTrainings[i].name,
        icon:this.auth.organisationTrainings[i].logo ? '' :'faGripHorizontal',
        image:this.auth.organisationTrainings[i].logo ? this.auth.organisationTrainings[i].logo : '',
        id:this.auth.organisationTrainings[i].id,
        value:this.auth.organisationTrainings[i].id,
        logo:this.auth.organisationTrainings[i].logo !=undefined,
      })
    }

    this.shortMenu = await this.popoverController.create({
      component: MenuPage,
      componentProps:{
        customMenu:true,
        pages:list
      },
      cssClass: 'customMenu',
      event: event,
      translucent: false,
      reference:'trigger',
    });
    this.shortMenu.shadowRoot.lastChild.lastChild['style'].cssText = 'border-radius: 24px !important;';
    await this.shortMenu.present();
    await this.shortMenu.onWillDismiss().then((result:any)=>{
      // console.log(this.selectMenuservice.selectedItem)
      if(this.selectMenuservice.selectedItem){
        this.nav.gotoOrganisation(event,this.selectMenuservice.selectedItem.id)
        this.closeMenu();
      }
    })
  }

  

  goto(item:any,event:Event){
    event.stopPropagation();
    event.preventDefault();
    if(item.url){
      if(item.url.includes('trainer/')){
        this.trainerService.emptyBreadCrumbs()
      }
      if(item.url.includes('http') || item.url.includes('https')){
        this.nav.goto(item.url,true);
      }
      else{
        this.nav.go(item.url);
      }
    }
    if(item.action){
      if(item.action.includes('.')){
        let parts = item.action.split('.');
        if(item.action.includes('(')){
          let params = item.action.substring(item.action.indexOf('(') + 1, item.action.indexOf(')'));
          this[parts[0]][parts[1]](params);
        }
        else {
          this[parts[0]][parts[1]]();
        }
      } else if(item.action.includes('(')){
        let action = item.action.substring(0, item.action.indexOf('('));
        let params = item.action.substring(item.action.indexOf('(') + 1, item.action.indexOf(')'));
        this[action](params);
      } else {
        this[item.action]();
      }
    }
    this.closeMenu(event);
  }

  clickAction(action:string,event:Event){
    event.stopPropagation();
    event.preventDefault();
    this.action.emit(action);
    this.closeMenu(event);
  }

  get locationURL(): string {
      return location.pathname.substring(1);
  }
    
}
