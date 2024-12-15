import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FirestoreService } from 'src/app/services/firestore.service';
import { IconsService } from 'src/app/services/icons.service';
import { ModalService } from 'src/app/services/modal.service';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.page.html',
  styleUrls: ['./categories.page.scss'],
})
export class CategoriesPage implements OnInit {
  categories:any = []
  activeTab: number = 0;
  showNewCategory:boolean = false
  newCategoryTitle:string = ''
  constructor(
    public firestore:FirestoreService,
    public icon:IconsService,
    private modal:ModalService
  ) { }

  ngOnInit() {
    this.loadCategories()
  }

  private loadCategories() {
    this.firestore.get('categories').subscribe((categories) => {
      // add id to categories
      this.categories = categories.map((category:any) => {
        return { id: category.payload.doc.id, ...category.payload.doc.data() }
      })
      
    })
  }
  
  // get categories(): Observable<any[]>  {
  //   return this.categories$.asObservable();
  // }

  changeTab(tab:number){
    this.activeTab = tab
  }

  addPhase(){
    this.categories[this.activeTab].phases.push({title:'',description:''})
    this.update('phases')  
  }

  removePhase(index:number){
    this.categories[this.activeTab].phases.splice(index,1)
    this.update('phases')
  }

  movePhase(index:number, direction:number){
    let temp = this.categories[this.activeTab].phases[index]
    this.categories[this.activeTab].phases[index] = this.categories[this.activeTab].phases[index+direction]
    this.categories[this.activeTab].phases[index+direction] = temp
    this.update('phases')
  }

  update(field?:string){
    console.log(this.activeTab,field)
    const scrollPosition = window.scrollY;
    if(field&&field!='phases'){
      this.firestore.set('categories',this.categories[this.activeTab].id,this.categories[this.activeTab][field],field).then(()=>{
        setTimeout(() => {
          window.scrollTo(0, scrollPosition);
        }, 100);
      })
    }
    else if(field=='phases'){
      console.log(this.categories[this.activeTab][field])
      this.firestore.set('categories',this.categories[this.activeTab].id,this.categories[this.activeTab][field],field,true).then(()=>{
        setTimeout(() => {
          window.scrollTo(0, scrollPosition);
        }, 100);
      })
    }

  }

  savePhasesToInfo(){
    for(let i=0;i<this.categories.length;i++){
      this.firestore.set('public_info',this.categories[i].id,this.categories[i].phases,'phases',false,'',()=>{
        //on error
        let obj = {
          phases:this.categories[i].phases
        }
        this.firestore.set('public_info',this.categories[i].id,obj)
      })
      
    }
  }

  newCategory(newTab?:number){
    if(this.showNewCategory){
      this.showNewCategory = false
      if(newTab){
        this.activeTab = newTab
      }
      else{
        this.activeTab = 0;
      }
    }
    else{
      this.showNewCategory = true
      this.newCategoryTitle = ''
      this.activeTab = -1;
    }
  }

  creatingNew:boolean = false
  addCategory(){
    if(!this.newCategoryTitle || this.creatingNew) return
    this.creatingNew = true
    let obj = {
      title:this.newCategoryTitle,
      description:'',
      systemContent:'',
      content:'',
      extraInfo:'',
      phases:[]
    }
    let id = this.newCategoryTitle.toLowerCase().replace(/ /g,'_')
    this.firestore.set('categories',id,obj).then(()=>{
      this.newCategory(-1)
      this.loadCategories()
      this.creatingNew = false
      const interval = setInterval(() => {
        for(let i=0;i<this.categories.length;i++){
          if(this.categories[i].id == id){
            this.activeTab = i
            clearInterval(interval)
          }
        }
      },200)
    })
  }

  deleteCategory(){
    this.modal.showConfirmation('Are you sure you want to delete this category?').then((response)=>{
      if(response){
        let index = this.activeTab
        this.activeTab = 0
        this.firestore.delete('categories',this.categories[index].id).then(()=>{
          this.loadCategories()
        })
      }
    })
  }

}
