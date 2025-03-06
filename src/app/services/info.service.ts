import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { catchError, combineLatest, defaultIfEmpty, forkJoin, map, of, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InfoService {
  // public_info:any = []
  attitudes:any = []
  positions:any = []
  themes:any = []
  conversation_types:any = []

  attitudeTypes:any = [
    { id: 'attitude', name: 'Attitude' },
    { id: 'position', name: 'Position' }
  ]
  constructor(
    public firestore:FirestoreService,
    private functions:AngularFireFunctions
  ) { 
    this.loadInfo()
  }

  loadInfo() {
    // this.firestore.get('public_info').subscribe((info) => {
    //   this.public_info = info.map((infoItem:any) => {
    //     return { id: infoItem.payload.doc.id, ...infoItem.payload.doc.data() }
    //   })
      
    // })

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

    // this.firestore.get('conversation_types').subscribe((conversation_types) => {
    //   this.conversation_types = conversation_types.map((conversation_type:any) => {
        
    //     // add the id to the object and load the subcollection 'subjects'
    //     let item = { id: conversation_type.payload.doc.id, ...conversation_type.payload.doc.data() }
    //     this.firestore.getSub('conversation_types',item.id,'subjects').subscribe((subjects) => {
    //       item.subjects = subjects.map((subject:any) => {
    //         return { id: subject.payload.doc.id, ...subject.payload.doc.data() }
    //       })
    //     })
    //   })
    // })

    this.firestore.get('conversation_types').pipe(
      switchMap((conversation_types) => {
        if (!conversation_types.length) {
          console.warn('Geen conversation types gevonden.');
          return of([]);
        }
    
        // Maak een lijst van observables voor elk conversation_type
        const requests = conversation_types.map((conversation_type: any) => {
          const item = { id: conversation_type.payload.doc.id, ...conversation_type.payload.doc.data() };
    
          return this.firestore.getSub('conversation_types', item.id, 'subjects').pipe(
            defaultIfEmpty([]),  // Lege sub-collecties geven een lege array terug
            catchError(() => of([])),  // Fout afvangen zonder de keten te onderbreken
            map((subjects) => {
              item.subjects = subjects.map((subject: any) => ({
                id: subject.payload.doc.id,
                ...subject.payload.doc.data()
              }));
              return item;
            })
          );
        });
    
        // Gebruik combineLatest om resultaten dynamisch te combineren
        return combineLatest(requests);
      })
    ).subscribe({
      next: (result) => {
        this.conversation_types = result;
      },
      error: (err) => {
        console.error('Fout in combineLatest:', err);
      }
    });

    // setTimeout(() => {
    //   console.log(this.conversation_types)
    // }, 2000);
  }

  async loadPublicInfo(collection:string,document:string,field:string,subCollection?:string,subDocument?:string,callback?:Function){
    let info = ''
    let getPublicSubscription = await this.functions.httpsCallable('get_public_info')({type:'public_info',collection:collection,document:document,field:field,subCollection:subCollection,subDoc:subDocument})
    .subscribe((result:any) => {
      if(result.result){
        info = result.result
      }
      if(callback) {
        callback(info)
        getPublicSubscription.unsubscribe()
        return
      }
      getPublicSubscription.unsubscribe()
      return info
    })
    // .forEach((result:any) => {
    //   console.log(result)
    //   info = result
    // })
  }


  getConversationType(id?:string,subject?:any,returnArray?:boolean){
    if(!id&&!subject){
      if(returnArray){
        return []
      }
      return {}}
    if(id){
      let conversation_type = this.conversation_types.find((conversation_type:any) => conversation_type.id === id)
      if(conversation_type){
        if(subject){
          let sub = conversation_type.subjects.find((sub:any) => sub.id === subject)
          if(sub){
            return sub
          }
        }
        return conversation_type
      }
    }
    else if(subject&& typeof subject === 'string'){
      for(let i = 0; i < this.conversation_types.length; i++){
        let conversation_type = this.conversation_types[i]
        let sub = conversation_type.subjects.find((sub:any) => sub.id === subject)
        if(sub){
          sub.conversation_type = conversation_type.id
          return sub
        }
      }
      return {}
    }
    // else if subject is array
    else if(subject&& typeof subject === 'object'){
     let conversation_types = []
      for(let i = 0; i < this.conversation_types.length; i++){
        let conversation_type = this.conversation_types[i]
        let subs = conversation_type.subjects.filter((sub:any) => subject.includes(sub.id))
        if(subs.length){
          // conversation_type.subjects = subs
          conversation_types.push(conversation_type.id)
        }
      }
      if(conversation_types.length){
        return conversation_types
      }
    }
    return {}
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
