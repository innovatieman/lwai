import { EventEmitter, Injectable, Output } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { catchError, combineLatest, defaultIfEmpty, forkJoin, map, of, switchMap, firstValueFrom } from 'rxjs';
import { NavService } from './nav.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class InfoService {
    @Output()  conversationTypesLoaded:EventEmitter<boolean> = new EventEmitter()
  
  // public_info:any = []
  attitudes:any = []
  positions:any = []
  themes:any = []
  conversation_types:any = []
  categories:any = []
  attitudeTypes:any = [
    { id: 'attitude', name: 'Attitude' },
    { id: 'position', name: 'Position' }
  ]
  constructor(
    public firestore:FirestoreService,
    private functions:AngularFireFunctions,
    private nav:NavService,
    private translate:TranslateService,
  ) { 
    this.loadInfo()
    this.nav.changeLang.subscribe((lang) => {
      this.loadInfo()
    })
  }

  async loadInfo() {

    const attitudesSnapshot = await firstValueFrom(this.firestore.get('attitudes'));

    const attitudesList = await Promise.all(
      attitudesSnapshot.map(async (attitude: any) => {
        const attitudeData = attitude.payload.doc.data();
        const lang = this.translate.currentLang;

        try {
          const langDoc = await firstValueFrom(
            this.firestore.getSubDoc('attitudes', attitude.payload.doc.id, 'languages', lang)
          );

          if (langDoc) {
            const langData:any = langDoc.payload.data();
            attitudeData.title = langData.title;
            attitudeData.description = langData.description;
          }
        } catch (error) {
          // console.warn('Taaldata niet gevonden voor attitude:', attitude.payload.doc.id);
        }

        return { id: attitude.payload.doc.id, ...attitudeData };
      })
    );
    this.attitudes = attitudesList.sort((a: any, b: any) => a.level - b.level);

    const categoriesSnapshot = await firstValueFrom(this.firestore.get('categories'));

    this.categories = await Promise.all(
      categoriesSnapshot.map(async (cat: any) => {
        const catData = cat.payload.doc.data();
        const lang = this.translate.currentLang;

        try {
          const langDoc = await firstValueFrom(
            this.firestore.getSubDoc('categories', cat.payload.doc.id, 'languages', lang)
          );
          if (langDoc) {
            const langData:any = langDoc.payload.data();
            catData.title = langData.title;
            catData.phaseList = langData.phaseList;
            catData.phaseExplanation = langData.phaseExplanation;
          }
        } catch (error) {
          // console.warn('Taaldata niet gevonden voor attitude:', attitude.payload.doc.id);
        }

        return { id: cat.payload.doc.id, ...catData };
      })
    );
    
    this.firestore.query('themes','active',true).subscribe((themes) => {
      this.themes = themes.map((theme:any) => {
        return { id: theme.payload.doc.id, ...theme.payload.doc.data() }
      })
    })

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
        setTimeout(() => {
          this.conversationTypesLoaded.emit(true)
        }, 1000);
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

  fillConversationTypes(filter:any){
    if(filter){
      for(let i = 0; i < this.conversation_types.length; i++){
        let conversation_type = this.conversation_types[i]
        if(filter.types.includes(conversation_type.id)){
          this.conversation_types[i].selected = true
        }
        for(let j = 0; j < conversation_type.subjects.length; j++){
          if(filter.subjects.includes(conversation_type.subjects[j].id)){
            this.conversation_types[i].subjects[j].selected = true
          }
        }
      }
      // console.log(this.conversation_types)
    }
  }

  getAttitude(level:number){
    if(level==undefined){
      return this.attitudes[0]
    }
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

  getCategoryPhaseList(id:string,text:boolean = false){
    let phaseList = []
    let category = this.categories.find((category:any) => category.id === id)
    if(category){
      console.log(category)
      phaseList = category.phaseExplanation
      if(text){
        let phaseListText = ''
        for(let i = 0; i < phaseList.length; i++){
          phaseListText += '<b>'+phaseList[i].title+'</b>&nbsp;&nbsp;<i>(' + phaseList[i].short + ')</i><br>' + phaseList[i].explanation + '<br><br>'
        }
        return phaseListText
      }
      return phaseList
    }
    return null
  }
}
