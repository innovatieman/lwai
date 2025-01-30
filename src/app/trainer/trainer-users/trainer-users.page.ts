import { Component, OnInit, ViewChild } from '@angular/core';
import { IonSelect, ItemReorderEventDetail, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/auth/auth.service';
import { MenuPage } from 'src/app/components/menu/menu.page';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { InfoService } from 'src/app/services/info.service';
import { ModalService } from 'src/app/services/modal.service';
import { SelectMenuService } from 'src/app/services/select-menu.service';
@Component({
  selector: 'app-trainer-users',
  templateUrl: './trainer-users.page.html',
  styleUrls: ['./trainer-users.page.scss'],
})
export class TrainerUsersPage implements OnInit {
  @ViewChild('selectNewCase', { static: false }) selectNewCase!: IonSelect;
  [x: string]: any;
  activeTab: number = 0;
  active_courses: any[] = []
  courses_trainer: any[] = []
  old_courses: any[] = []
  openItems: any[] = []
  shortMenu: any;

  constructor(
    public firestore:FirestoreService,
    public icon:IconsService,
    private modal:ModalService,
    public helpers:HelpersService,
    public translate:TranslateService,
    public infoService:InfoService,
    public auth:AuthService,
    private selectMenuservice:SelectMenuService,
    private popoverController:PopoverController
  ) { }

  ngOnInit() {

    this.load('courses_trainer',this.auth.userInfo.uid)
    this.load('active_courses',this.auth.userInfo.uid)
    this.load('old_courses',this.auth.userInfo.uid)
  }

  load(type:string,trainerId:string,callback?:Function){
    this.firestore.query(type,'trainerId',trainerId).subscribe((items) => {
      this[type] = items.map((item:any) => {
        return { id: item.payload.doc.id, ...item.payload.doc.data() }
      })
      if(callback) callback()
    })
  }

  async newCourse(){
    
    this.shortMenu = await this.popoverController.create({
      component: MenuPage,
      componentProps:{
        customMenu:true,
        pages:this.courses_trainer,
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
      console.log(this.selectMenuservice.selectedItem)

      
          let course:any = JSON.parse(JSON.stringify(this.selectMenuservice.selectedItem))
          delete course.id
          course.status = 'concept'
          course.startdate = ''
          course.enddate = ''
          course.users = []
          this.firestore.create('active_courses',course,(res:any) => {
            // this.load('active_courses',this.auth.userInfo.uid)
          })


      


    }


  }

  activate(course:any){
    this.modal.showConfirmation('Weet je zeker dat je deze cursus wilt activeren?').then((res) => {
      if(res){
        course.status = 'active'
        this.firestore.set('active_courses',course.id,'active','status').then(() => {
          // this.load('active_courses',this.auth.userInfo.uid)
          console.log('activated')
        })
      }
    })

  }
}
