import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
import * as moment from 'moment'
import { NavService } from 'src/app/services/nav.service';
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
  routeSubscription: any;
  constructor(
    public firestore:FirestoreService,
    public icon:IconsService,
    private modal:ModalService,
    public helpers:HelpersService,
    public translate:TranslateService,
    public infoService:InfoService,
    public auth:AuthService,
    private selectMenuservice:SelectMenuService,
    private popoverController:PopoverController,
    private route:ActivatedRoute,
    private nav:NavService
  ) { }

  log(item: any) {
    console.log(item);
  }
  ngOnInit() {

    this.load('courses_trainer',this.auth.userInfo.uid)
    this.load('active_courses',this.auth.userInfo.uid,()=>{
      this.routeSubscription  = this.route.params.subscribe((params) => {
        if(params['course_id']){
          this.active_courses.forEach((course) => {
            if(course.id == params['course_id']){
              course.show = true
              if(this.routeSubscription){
                this.routeSubscription.unsubscribe()
              }
            }
            
          })
        }
      })
      this.active_courses.forEach((course) => {
        this.loadItems(course)
      })
    })
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

  loadItems(course:any){
    this.firestore.getSub('active_courses',course.id,'items').subscribe((items) => {
      course.items = items.map((item:any) => {
        return { id: item.payload.doc.id, ...item.payload.doc.data() }
      })
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

      this.modal.inputFields('Publiceer een journey','Geef de module een naam',[
            {title:'Titel van de journey*',type:'text',value:course.title,required:true},
            {title:'Korte beschrijving*',type:'textarea',value:course.description,required:true},
            {title:'Startdatum*',type:'date',value:moment().format('YYYY-MM-DD'),required:true},
            {title:'Einddatum',type:'date',value:''},
            {title:'Max aantal deelnemers',type:'number',value:0},
            {title:'Prijs',type:'number',value:course.price},
            {title:'Valuta*',type:'select',value:course,options:['EUR (€)','USD ($)','GBP (£)','JPY (¥)']},
            {title:'Foto URL*',type:'text',value:course.photo,required:true},
            {title:'Thema*',type:'select',value:course.theme,options:[1,2,3,4,5,6,7,8,9,10],required:true},
          ],(result:any) => {
            // console.log(result)
            if(result.data){
              let newItem = JSON.parse(JSON.stringify(course))
              delete newItem.id
              newItem.title = result.data[0].value
              newItem.description = result.data[1].value
              newItem.startdate = result.data[2].value
              newItem.enddate = result.data[3].value
              newItem.maxUsers = result.data[4].value
              newItem.price = result.data[5].value
              newItem.currency = result.data[6].value
              newItem.photo = result.data[7].value
              newItem.theme = result.data[8].value
              newItem.status = 'active'
              this.firestore.create('active_courses',newItem,(response:any) => {
                if(response.id){
                  this.nav.go('/trainer/users/'+response.id)
                }
              })
            }
          
          })


          // delete course.id
          // course.status = 'concept'
          // course.startdate = ''
          // course.enddate = ''
          // course.users = []
          // this.firestore.create('active_courses',course,(res:any) => {
          //   // this.load('active_courses',this.auth.userInfo.uid)
          // })


      


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
