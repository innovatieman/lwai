import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';

@Injectable({
  providedIn: 'root'
})
export class InfoService {
  public_info:any = []
  attitudes:any = []
  constructor(
    public firestore:FirestoreService
  ) { 
    this.loadInfo()
  }

  loadInfo() {
    this.firestore.get('public_info').subscribe((info) => {
      this.public_info = info.map((infoItem:any) => {
        return { id: infoItem.payload.doc.id, ...infoItem.payload.doc.data() }
      })
      
    })
    this.firestore.get('attitudes').subscribe((attitudes) => {
      this.attitudes = attitudes.map((attitude:any) => {
        return { id: attitude.payload.doc.id, ...attitude.payload.doc.data() }
      })
      this.attitudes = this.attitudes.sort((a:any,b:any) => a.level - b.level)
    })
  }

  getInfo(id:string){
    // console.log(id,this.public_info[5].intro_phases)
    return this.public_info.find((info:any) => info.id === id)
  }

  getAttitude(level:number){
    let attitude = this.attitudes.find((attitude:any) => attitude.level === level)
    if(attitude){
      return attitude
    }
    //zoek naar de dichtsbijzijnde attitude naar beneden afgerond op 10-tallen. of naar 1 als het onder de 10 is
    let lower = Math.floor(level/10)*10

    attitude = this.attitudes.find((attitude:any) => attitude.level === lower)
    if(attitude){
      return attitude
    }
    return this.attitudes[0]
  }
}
