import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';

@Injectable({
  providedIn: 'root'
})
export class InfoService {
  public_info:any = []
  attitudes:any = []
  positions:any = []
  themes:any = []

  attitudeTypes:any = [
    { id: 'attitude', name: 'Attitude' },
    { id: 'position', name: 'Position' }
  ]
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
    
    this.firestore.query('themes','active',true).subscribe((themes) => {
      this.themes = themes.map((theme:any) => {
        return { id: theme.payload.doc.id, ...theme.payload.doc.data() }
      })
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

  getPosition(level:number){
    let position = this.positions.find((position:any) => position.level === level)
    if(position){
      return position
    }
    //zoek naar de dichtsbijzijnde position naar beneden afgerond op 10-tallen. of naar 1 als het onder de 10 is
    let lower = Math.floor(level/10)*10

    position = this.positions.find((position:any) => position.level === lower)
    if(position){
      return position
    }
    return this.positions[0]
  }

  getTheme(id:string){
    let themes = this.themes.find((theme:any) => theme.id === id)
    if(themes){
      return themes
    }
    return null
  }
}
