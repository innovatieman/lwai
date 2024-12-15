import { Component, OnInit, ViewChild } from '@angular/core';
import { IonSelect } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { CasesService } from 'src/app/services/cases.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { IconsService } from 'src/app/services/icons.service';
import { ModalService } from 'src/app/services/modal.service';

@Component({
  selector: 'app-cases',
  templateUrl: './cases.page.html',
  styleUrls: ['./cases.page.scss'],
})
export class CasesPage implements OnInit {
  @ViewChild('selectNew', { static: false }) selectNew!: IonSelect;
  activeTab: number = 0;
  cases: any[] = []
  caseItem: any = {}
  categories: any[] = []
  newConversation: string = ''
  constructor(
    public firestore:FirestoreService,
    public icon:IconsService,
    private modal:ModalService
  ) { }


  ngOnInit() {
    this.loadCases()
    this.loadCategories()
  }

  private loadCases() {
    this.firestore.get('cases').subscribe((cases) => {
      this.cases = cases.map((casus:any) => {
        return { id: casus.payload.doc.id, ...casus.payload.doc.data() }
      })
      
    })
  }
  private loadCategories() {
    this.firestore.get('categories').subscribe((categories) => {
      this.categories = categories.map((category:any) => {
        return { id: category.payload.doc.id, ...category.payload.doc.data() }
      })
    })
  }
  categoryInfo(id:string){
    if(!this.categories.length) return {}
    let category = this.categories.filter((e:any) => {
      return e.id === id
    })
    return category[0]
  }

  changeTab(tab:number){
    this.activeTab = tab
  }
  selectCasus(casus:any){
    this.caseItem = casus
  }

  update(field?:string){
    const scrollPosition = window.scrollY;
    if(field){
      this.firestore.set('cases',this.caseItem.id,this.caseItem[field],field).then(()=>{
        setTimeout(() => {
          window.scrollTo(0, scrollPosition);
        }, 100);
      })
    }
  }
  
  openAdd(){
    this.selectNew.open()
  }

  add(){
    if(this.newConversation){
      this.firestore.create('cases',
        {
          conversation:this.newConversation,
          open_to_user:false,
          open_to_public:false,
          open_to_admin:true,
          title:'New Case',
          role:'',
          description:'',
          attitude:1
        }).then(()=>{
          this.newConversation = ''
        })
    }
  }

  deleteCase(){
    this.modal.showConfirmation('Are you sure you want to delete this case?').then((result:any) => {
      if(result){
        this.firestore.delete('cases',this.caseItem.id)
        this.caseItem = {}
        this.loadCases()
      }
    })
  }


}
