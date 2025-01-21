import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';

@Injectable({
  providedIn: 'root'
})
export class BackupService {
  backups: any[] = [];
  activebackups:string='';
  constructor(
    private firestore:FirestoreService
  ) { }

  async getBackups(type:string,agent:string,callback:Function){
    this.backups = [];
    let subs = await this.firestore.getSub('backups',type,agent).subscribe((data:any)=>{
      data.forEach((backup:any)=>{
        let dataItem = backup.payload.doc.data();
        dataItem.id = backup.payload.doc.id;
        this.backups.push(dataItem);
      });
      subs.unsubscribe();
      this.backups = this.backups.sort((a, b) => (a.timestamp > b.timestamp) ? -1 : 1);
      this.activebackups = type;
      callback(this.backups);
    });
  }

  showBackups(type:string){
    return this.activebackups == type;
  }
  hideBackups(){
    this.activebackups =''
  }

  createbackups(type:string,agent:string,data:any){
    this.firestore.createSub('backups',type,agent,{type:type,data:data,timestamp:new Date().getTime()});
  }
}
