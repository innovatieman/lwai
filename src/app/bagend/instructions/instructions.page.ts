import { Component, OnInit } from '@angular/core';
import { BackupService } from 'src/app/services/backup.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { IconsService } from 'src/app/services/icons.service';
import { ModalService } from 'src/app/services/modal.service';

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
    public icon:IconsService,
    public backupService:BackupService,
    private modal:ModalService
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

  getBackups(type:string){
    this.backupService.getBackups(type,(backups:any)=>{
      // console.log(backups)
    })

  }

  getBackup(id:string, field:string){
    this.modal.backups(this.backupService.backups,{id:id,field:field},'Select a backup to restore',(response:any)=>{
      if(response.data){
        this.modal.showConfirmation('Are you sure you want to restore this backup?').then((responseConfirmation)=>{
          if(responseConfirmation){
            const scrollPosition = window.scrollY;
            this.firestore.set('instructions',this.instructions[this.activeTab].id,response.data,field).then(()=>{
              setTimeout(() => {
                window.scrollTo(0, scrollPosition);
              }, 100);
            })
          }
        })
      }
    })
  }

}
