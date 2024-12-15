import { Component, OnInit } from '@angular/core';
import { FirestoreService } from 'src/app/services/firestore.service';
import { IconsService } from 'src/app/services/icons.service';

@Component({
  selector: 'app-instructions',
  templateUrl: './instructions.page.html',
  styleUrls: ['./instructions.page.scss'],
})
export class InstructionsPage implements OnInit {
  instructions:any = []
  activeTab: number = 0;
  constructor(
    public firestore:FirestoreService,
    public icon:IconsService
  ) { }

  ngOnInit() {
    this.loadInstructions()
  }

  private loadInstructions() {
    this.firestore.get('instructions').subscribe((instructions) => {
      this.instructions = instructions.map((instruction:any) => {
        return { id: instruction.payload.doc.id, ...instruction.payload.doc.data() }
      })
      
    })
  }

  changeTab(tab:number){
    this.activeTab = tab
  }

  update(field?:string){
    console.log(this.activeTab,field)
    const scrollPosition = window.scrollY;
    if(field){
      this.firestore.set('instructions',this.instructions[this.activeTab].id,this.instructions[this.activeTab][field],field).then(()=>{
        setTimeout(() => {
          window.scrollTo(0, scrollPosition);
        }, 100);
      })
    }


  }

}
