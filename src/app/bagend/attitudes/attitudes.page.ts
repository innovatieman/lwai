import { Component, OnInit } from '@angular/core';
import { take, timestamp } from 'rxjs';
import { ConfirmationModalComponent } from 'src/app/components/modals/confirmation-modal/confirmation-modal.component';
import { BackupService } from 'src/app/services/backup.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { IconsService } from 'src/app/services/icons.service';
import { ModalService } from 'src/app/services/modal.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-attitudes',
  templateUrl: './attitudes.page.html',
  styleUrls: ['./attitudes.page.scss'],
})
export class AttitudesPage implements OnInit {
  attitudes:any = []
  activeTab: number = 0;
  attitudesSubscription:any
  constructor(
    public firestore: FirestoreService,
    private toast: ToastService,
    public icon:IconsService,
    private modal:ModalService,
    public backupService:BackupService
  ) { }

  ngOnInit() {
    this.loadAttitudes()
  }

  loadAttitudes() {
    this.attitudesSubscription = this.firestore.get('attitudes').pipe(take(1)).subscribe((attitudes:any) => {
      this.attitudes = attitudes.map((docItem: any) => {
        return { id: docItem.payload.doc.id, ...docItem.payload.doc.data() };
      });
      this.attitudes = this.attitudes.sort((a: any, b: any) => a.level - b.level);
    });
  }

  changeTab(tab:number){
    setTimeout(() => {
      this.activeTab = tab
    }, 1);
  }

  update(field?:string){
    if(field){
      this.firestore.set('attitudes',this.attitudes[this.activeTab].id,this.attitudes[this.activeTab][field],field)
    }

  }

  newAttitude:any = {title:'New Attitude',description:'',level:0,visible:false}
  addAttitude(){
    if(this.newAttitude.title==''||this.newAttitude.description==''){
      this.toast.show('Vul alle velden in')
      return
    }
    this.firestore.create('attitudes',this.newAttitude).then(()=>{
      this.newAttitude = {title:'New Attitude',description:'',level:0,visible:false}
      this.loadAttitudes()
    })
  
  }
  
  async removeAttitude(){

      const confirmed = await this.modal.showConfirmation('Weet je zeker dat je deze actie wilt uitvoeren?');
      if (confirmed) {
        this.firestore.delete('attitudes',this.attitudes[this.activeTab].id).then(()=>{
          this.loadAttitudes()
        })
      } else {
        console.log('Actie geannuleerd');
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
              this.firestore.set('attitudes',this.attitudes[this.activeTab].id,response.data,field).then(()=>{
                setTimeout(() => {
                  this.attitudesSubscription.unsubscribe()
                  this.loadAttitudes()
                  window.scrollTo(0, scrollPosition);
                }, 100);
              })
            }
          })
      }
    })
  }

}
