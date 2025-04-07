import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { InfoService } from 'src/app/services/info.service';
import { ModalService } from 'src/app/services/modal.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-types',
  templateUrl: './types.page.html',
  styleUrls: ['./types.page.scss'],
})
export class TypesPage implements OnInit {

  constructor(
    public infoService: InfoService,
    public helper:HelpersService,
    private firestore:FirestoreService,
    public translate:TranslateService,
    public icon:IconsService,
    private modalService:ModalService,
    private toast:ToastService,
  ) { }

  ngOnInit() {
    // this.setTypes()
  }


  deleteSubject(type:any,subject:any){
    this.modalService.showConfirmation(this.translate.instant('confirmation_questions.delete')).then((response:any)=>{
      if(response){
        this.firestore.deleteSub('conversation_types',type.id,'subjects',subject.id).then(()=>{
          this.toast.show(this.translate.instant('toast.deleted'),3000,'bottom')
        })
      }
    })
  }

  addSubject(type:any){
    let languages = []
    for(let lang in type){
      if(lang != 'id' && lang != 'order' && lang != 'subjects'){
        languages.push(lang)
      }
    }
    let items:any = [
      {title:'ID',type:'text',value:'',required:true,name:'id'},
    ]
    for(let lang of languages){
      items.push({title:this.translate.instant('languages.'+lang),type:'text',value:'',required:true,name:lang})
    }
    this.modalService.inputFields('Add Subject','',items,(response:any)=>{
      if(response.data){
        let newSubject:any = {}
        for(let item of response.data){
          newSubject[item.name] = item.value
        }
        this.firestore.setSub('conversation_types',type.id,'subjects',newSubject.id,newSubject).then(()=>{
          this.toast.show(this.translate.instant('toast.added'),3000,'bottom')
        })
      }
    })
  }

  update(type_id:string,subject_id:string,field:any,value:any){
    if(value == ''){
      this.toast.show(this.translate.instant('error_messages.field_required'),3000,'bottom')
      return
    }
    let obj:any = {}
    obj[field] = value
    this.firestore.updateSub('conversation_types',type_id,'subjects',subject_id,obj).then(()=>{
      this.toast.show(this.translate.instant('toast.updated'),3000,'bottom')
    })
  }

  // async setTypes(){
  //   let types:any = {
  //     "friends": {
  //         "id": "friends",
  //         "order": 1,
  //         "nl": "Familie, vrienden, buren",
  //         "en": "Family, friends, neighbours",
  //         "subCats": [
  //             { "id": "special_events", "nl": "Bijzondere gebeurtenissen", "en": "Special events" },
  //             { "id": "relationship_problems", "nl": "Relatieproblemen", "en": "Relationship problems" },
  //             { "id": "children_family", "nl": "Kinderen en gezin", "en": "Children and family" },
  //             { "id": "family", "nl": "Familie", "en": "Family" },
  //             { "id": "friends", "nl": "Vrienden", "en": "Friends" },
  //             { "id": "neighbours", "nl": "Buren", "en": "Neighbours" }
  //         ]
  //     },
  //     "opinions": {
  //         "id": "opinions",
  //         "order": 2,
  //         "nl": "Botsende meningen",
  //         "en": "Conflicting opinions",
  //         "subCats": [
  //             { "id": "climate_environment", "nl": "Klimaat en milieu", "en": "Climate and environment" },
  //             { "id": "politics", "nl": "Politiek", "en": "Politics" },
  //             { "id": "health", "nl": "Gezondheid", "en": "Health" },
  //             { "id": "science", "nl": "Wetenschap", "en": "Science" },
  //             { "id": "ethics", "nl": "Ethiek", "en": "Ethics" },
  //             { "id": "social_rights", "nl": "Sociale rechten", "en": "Social rights" },
  //             { "id": "safety_crime", "nl": "Veiligheid & Criminaliteit", "en": "Safety & Crime" },
  //             { "id": "culture", "nl": "Cultuur", "en": "Culture" },
  //             { "id": "migration", "nl": "Migratie", "en": "Migration" },
  //             { "id": "privacy", "nl": "Privacy", "en": "Privacy" },
  //             { "id": "social_media", "nl": "Sociale media", "en": "Social media" },
  //             { "id": "technology", "nl": "Technologie", "en": "Technology" },
  //             { "id": "religion_belief", "nl": "Religie en levensbeschouwing", "en": "Religion and beliefs" },
  //             { "id": "debate", "nl": "Debat", "en": "Debate" }
  //         ]
  //     },
  //     "work": {
  //         "id": "work",
  //         "order": 3,
  //         "nl": "Werksituaties",
  //         "en": "Work situations",
  //         "subCats": [
  //             { "id": "communication_colleagues", "nl": "Communicatie met collega’s", "en": "Communication with colleagues" },
  //             { "id": "leadership", "nl": "Leidinggeven", "en": "Leadership" },
  //             { "id": "job_applications", "nl": "Sollicitaties", "en": "Job applications" },
  //             { "id": "salary_conditions", "nl": "Salaris en arbeidsvoorwaarden", "en": "Salary and employment conditions" },
  //             { "id": "work_conflict", "nl": "Conflict op het werk", "en": "Work conflict" },
  //             { "id": "organizational_changes", "nl": "Veranderingen in de organisatie", "en": "Organizational changes" }
  //         ]
  //     },
  //     "professions": {
  //         "id": "professions",
  //         "order": 4,
  //         "nl": "Beroepen",
  //         "en": "Professions",
  //         "subCats": [
  //             { "id": "customer_service", "nl": "Klantenservice", "en": "Customer service" },
  //             { "id": "healthcare", "nl": "Zorg", "en": "Healthcare" },
  //             { "id": "safety_enforcement", "nl": "Veiligheid & Handhaving", "en": "Safety & Enforcement" },
  //             { "id": "commercial", "nl": "Commercieel", "en": "Commercial" },
  //             { "id": "education", "nl": "Onderwijs", "en": "Education" },
  //             { "id": "childcare_profession", "nl": "Kinderopvang", "en": "Childcare" },
  //             { "id": "housing", "nl": "Wonen", "en": "Housing" },
  //             { "id": "coaching", "nl": "Coaching", "en": "Coaching" },
  //             { "id": "consulting", "nl": "Advies", "en": "Consulting" }
  //         ]
  //     },
  //     "clients": {
  //         "id": "clients",
  //         "order": 5,
  //         "nl": "Klant, patiënt, burger",
  //         "en": "Client, patient, citizen",
  //         "subCats": [
  //             { "id": "healthcare_clients", "nl": "Zorg", "en": "Healthcare" },
  //             { "id": "safety_enforcement_clients", "nl": "Veiligheid & Handhaving", "en": "Safety & Enforcement" },
  //             { "id": "commercial_clients", "nl": "Commercieel", "en": "Commercial" },
  //             { "id": "education_clients", "nl": "Onderwijs", "en": "Education" },
  //             { "id": "childcare_clients", "nl": "Kinderopvang", "en": "Childcare" },
  //             { "id": "housing_clients", "nl": "Wonen", "en": "Housing" }
  //         ]
  //     },
  //     "non_human": {
  //         "id": "non_human",
  //         "order": 6,
  //         "nl": "Niet-menselijk",
  //         "en": "Non-human",
  //         "subCats": [
  //             { "id": "plants_animals", "nl": "Planten en dieren", "en": "Plants and animals" },
  //             { "id": "devices", "nl": "Apparaten", "en": "Devices" },
  //             { "id": "objects", "nl": "Gebruiksvoorwerpen", "en": "Objects" },
  //             { "id": "science_fiction", "nl": "Science fiction", "en": "Science fiction" }
  //         ]
  //     }
  // }
  
  //   for(let type in types){
  //     let typeData = {...types[type]}
  //     delete typeData.subCats
  //     await this.firestore.set('conversation_types',typeData.id,typeData)
  //     for(let subCat of types[type].subCats){
  //       this.firestore.setSub('conversation_types',typeData.id,'subjects',subCat.id,subCat)
  //     }
  //   } 
  // }


}
