import { Component, OnInit, ViewChild } from '@angular/core';
import { IonSelect } from '@ionic/angular';
import { AuthService } from 'src/app/auth/auth.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-photo-generator',
  templateUrl: './photo-generator.page.html',
  styleUrls: ['./photo-generator.page.scss'],
})
export class PhotoGeneratorPage implements OnInit {
  @ViewChild('selectScript', { static: false }) selectScript!: IonSelect;
  [x: string]: any;
  images:any = []
  selectedImages:any = []

  genders:any = ['Male','Female','Non-binary']
  // ethnicitys:any = ['Northern African','Central African','Southern African' , 'Asian', 'Caucasian', 'Hispanic',' Middle Eastern', 'Native American', 'Mixed-race']
  ethnicitys:any = [
    "Northern African",
    "West African",
    "Central African",
    "East African",
    "Southern African",
    "East Asian",
    "Southeast Asian",
    "South Asian",
    "Central Asian",
    "Northern European",
    "Western European",
    "Eastern European",
    "Southern European",
    "Balkan",
    "Caucasian (Armenian, Georgian, Azerbaijani)",
    "Hispanic - Mestizo",
    "Indigenous Latin American",
    "Afro-Latino",
    "Middle Eastern - Arab",
    "Persian (Iranian, Afghan-Persian)",
    "Turkish & Kurdish",
    "Jewish (Ashkenazi, Sephardic, Mizrahi)",
    "Native American",
    "Indigenous Australian & Maori",
    "Mixed-race / Multiracial"
  ]
  
  ages:any = [ 'Teenager','Young adult', 'Middle-aged', 'Senior', 'Elderly'] //'Child', 'Teenager',
  styles:any = ['Photo-realistic', 'Disney-style illustration', 'Anime-style illustration']
  emotions:any = ['Happy', 'Sad', 'Angry', 'Surprised', 'Neutral (not smiling)', 'Neutral (with a smile)', 'Disgusted', 'Fearful']
  occupations:any = [
    "Person",
    "Doctor",
    "Engineer",
    "Teacher",
    "Scientist",
    "Nurse",
    "Pilot",
    "Chef",
    "Lawyer",
    "Artist",
    "Architect",
    "Software Developer",
    "Dentist",
    "Police Officer",
    "Firefighter",
    "Photographer",
    "Journalist",
    "Electrician",
    "Plumber",
    "Mechanic",
    "Pharmacist",
    "Veterinarian",
    "Accountant",
    "Social Worker",
    "Librarian",
    "Psychologist",
    "Farmer",
    "Athlete",
    "Musician",
    "Entrepreneur",
    "Fashion Designer",
    "Carpenter",
    "Civil Engineer",
    "Graphic Designer",
    "Interpreter",
    "Paramedic",
    "Business Analyst",
    "Construction Worker",
    "Financial Advisor",
    "Marketing Specialist",
    "Event Planner",
    "Model",
    "Animator",
    "Data Scientist",
    "Astronomer",
    "Biologist",
    "Economist",
    "Environmental Scientist",
    "Marine Biologist",
    "Pilot Instructor",
    "Botanist"
  ]
  sources:any = ['OpenAI','Akool','Runware']
  gender:string = 'Male'
  ethnicity:string = 'Western European'
  age:string = 'Middle-aged'
  style:string = 'Photo-realistic'
  occupation:string = 'Person'
  emotion:string = 'Neutral (not smiling)'
  changingType:string = ''
  source:string = 'Runware'
  constructor(
    public nav:NavService,
    public auth:AuthService,
    private firestore:FirestoreService,
    private toast:ToastService,
    private modalService:ModalService,
  ) { }

  ngOnInit() {
    this.loadImages()
  }

  loadImages(){
    this.firestore.get('avatars').subscribe((images:any)=>{
      this.images = images.map((e:any) => {
        return { ...e.payload.doc.data(), id:e.payload.doc.id }
      })
      console.log(this.images)
      this.organizeImages()
    })
  }

  sorting(){
    this.images = this.images.sort((a:any,b:any)=>{
      return a.timestamp - b.timestamp
    })
    console.log(this.images)
  }

  async create(prompt?:string){
    this.toast.showLoader('Creating image...')
    let url = 'https://generateandstoreimage-p2qcpa6ahq-ew.a.run.app'

    if(this.source=='Runware'){
      url = 'https://europe-west1-lwai-3bac8.cloudfunctions.net/generateAndStoreAvatars'
      // url = 'https://generateandstoreimagerunway-p2qcpa6ahq-ew.a.run.app'
    }
    
    let obj:any = {
      "userId": this.auth.userInfo.uid,
      "size": "1024x1024",
      prompt:prompt || '',
      gender: this.gender,
      age: this.age,
      style: this.style,
      occupation: this.occupation,
      ethnicity: this.ethnicity,
      emotion: this.emotion,
      akool: this.source=='Akool'?true:false
    }

    if(prompt){
      obj.noPadding = true
    }
    setTimeout(() => {
      this.toast.hideLoader()
      this.toast.show('Opdracht gegeven aan AI',4000,'top')
    }, 1000);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(obj),
    });
    if (!response.ok) {
      console.error("Request failed:", response.status, response.statusText);
      return;
    }
    const responseData = await response.json();
    console.log(responseData)
    // const imageUrl = responseData.imageUrl;

    // console.log("Image URL:", imageUrl);
  }

  countingScript:number = 0
  countingScriptMax:number = 0
  startScript(startingPoint?:boolean){
    if(startingPoint){
      this.countingScript = this[this.changingType+'s'].indexOf(this[this.changingType])
    }
    console.log(this.changingType)
    if(this.changingType){
      this.toast.showLoader('creating Images')
      this.countingScriptMax = this[this.changingType+'s'].length
      if(this[this.changingType+'s'][this.countingScript]){
        console.log(this[this.changingType+'s'][this.countingScript])
        this[this.changingType] = this[this.changingType+'s'][this.countingScript]
        this.createFromScript(async ()=>{
          this.countingScript++
          console.log('waiting')
          await this.wait(2)
          this.startScript()
        })
      }
      else{
        this.toast.hideLoader()
        this.toast.show('Finished script',4000,'bottom')
        this.changingType = ''
      }
    }
  }

  countErrors = 0
  async sendToAPI(){

    try{
      await this.createFromScript(async ()=>{})
      await this.wait(3)
      this.countErrors=0
      return null
    }
    catch(e){
      this.countErrors++
      if(this.countErrors>=10){
        console.error('failed at '+this.age,this.ethnicity)
        return 'stop'
      }
      await this.wait(10)
      return 'error'
    }

  }


  counter:number = 0
  maxCounter:number = 0
  async startFullScript(){
    this.maxCounter = this.ages.length * this.ethnicitys.length * this.gender.length
    this.counter = 0
    let age = this.currentIndex('age')
    let ethnicity = this.currentIndex('ethnicity')
    let gender = this.currentIndex('gender')

    for(let i=age;i<this.ages.length;i++){
      for(let j=ethnicity;j<this.ethnicitys.length;j++){
        for(let k=gender;k<this.gender.length;k++){

          this.age = this.ages[i]
          this.ethnicity = this.ethnicitys[j]
          console.log(this.age,this.ethnicity,this.gender)
          this.counter++

          let result = await this.sendToAPI()
          if(result=='stop'){
            return
          }
          if(result=='error'){
            k--
          }
        }
        gender = 1

      }

      ethnicity = 0
    }
        


 
      // this.toast.showLoader('creating Images')
      // this.countingScriptMax = this[this.changingType+'s'].length
      // if(this[this.changingType+'s'][this.countingScript]){
      //   console.log(this[this.changingType+'s'][this.countingScript])
      //   this[this.changingType] = this[this.changingType+'s'][this.countingScript]
      //   this.createFromScript(async ()=>{
      //     this.countingScript++
      //     console.log('waiting')
      //     await this.wait(2)
      //     this.startScript()
      //   })
      // }
      // else{
      //   this.toast.hideLoader()
      //   this.toast.show('Finished script',4000,'bottom')
      //   this.changingType = ''
      // }
    
  }

 currentIndex(option:string){
  let index = this[option+'s'].indexOf(this[option])
  if(index==-1){
    return 0
  }
  return index
 }

  async wait(seconds:number){
    return new Promise(resolve => setTimeout(resolve, seconds*1000));
  }

  async createFromScript(callback:Function){
    let url = 'https://generateandstoreimage-p2qcpa6ahq-ew.a.run.app'
    
    if(this.source=='Runware'){
      url = 'https://europe-west1-lwai-3bac8.cloudfunctions.net/generateAndStoreAvatars'
      // url = 'https://generateandstoreimagerunway-p2qcpa6ahq-ew.a.run.app'
    }

    let obj = {
      "userId": this.auth.userInfo.uid,
      "size": "1024x1024",
      prompt:'',
      gender: this.gender,
      age: this.age,
      style: this.style,
      occupation: this.occupation,
      ethnicity: this.ethnicity,
      emotion: this.emotion,
      akool: this.source=='Akool'?true:false
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(obj),
    });
    if (!response.ok) {
      console.error("Request failed:", response.status, response.statusText);
      return;
    }
    const responseData = await response.json();
    console.log(responseData)
    // const imageUrl = responseData.imageUrl;

    // console.log(imageUrl);
    callback();
  }

//   [age] 
// [gender] 
// [ethnicity] 
// [occupation],
// who looks [emotion]. 
// The person is positioned in the center of the frame, with the head and shoulders taking up no more than 40% of the image height and width.  
// There is exactly 30% empty space above the head and 30% empty space on both sides of the person.  
// The person’s hairstyle, clothing, and any accessories are chosen creatively by the AI.  
// The background is soft, neutral, and simple (e.g., soft gray or light beige).  
// The face is well-lit with a natural expression, and the portrait is in a [style].  
// The framing should emphasize the empty space, with the head appearing small compared to the overall frame.
// No text, lines, or other elements should be present in the image besides the portrait.

  createWithPrompt(){
    this.modalService.inputFields('Create with prompt','Enter a prompt for the AI to generate an image',[
      {title:'Prompt',type:'textarea',value:`A centered portrait of a 
[age] 
[gender] 
[ethnicity] 
[occupation],
who looks [emotion]. 
The person is positioned in the center of the frame.
The person’s hairstyle, clothing, and any accessories are chosen creatively by the AI.  
The background is soft, neutral, and simple (e.g., soft gray or light beige).  
The face is well-lit with a natural expression, and the portrait is in a [style].  
No text, lines, or other elements should be present in the image besides the portrait.
`},
{title:'Age',type:'select',options:this.ages,value:this.age,required:true},
{title:'Gender',type:'select',options:this.genders,value:this.gender,required:true},
{title:'Ethnicity',type:'text',value:this.ethnicity,required:true},
{title:'Style',type:'select',options:this.styles,value:this.style,required:true},
{title:'Occupation',type:'text',value:'Person',required:true},
{title:'Emotion',type:'select',options:this.emotions,value:this.emotion,required:true},   
    ],(result:any)=>{
      console.log(result.data)
      if(result?.data[0]?.value){
        this.age = result.data[1].value
        this.gender = result.data[2].value
        this.ethnicity = result.data[3].value
        this.style = result.data[4].value
        this.occupation = result.data[5].value
        this.emotion = result.data[6].value
        this.create(result.data[0].value)
      }
    })
  }

  enlarge(image:any){
    console.log(image)
    this.modalService.showText(image.url,image.id,false,[
      {text:'Delete',color:'danger',value:'delete'},
      {text:'OK',color:'secondary',value:''}
    ],true,((response:any)=>{
      console.log(response)
      if(response?.data=='delete'){
        this.firestore.delete('avatars',image.id)
      }
    }),'',{},true)
  }

  organizeImages(){
    let obj:any = {
      all:{},
      age_ethnicity:{},
      gender_ethnicity:{},
      age_gender:{},
      age:{},
      gender:{}
    }
    this.images.forEach((image:any)=>{
      if(image.age){

        if(!obj.all[image.age+'_'+image.ethnicity+'_'+image.gender]){
          obj.all[image.age+'_'+image.ethnicity+'_'+image.gender] = []
        }
        if(!obj.age[image.age]){
          obj.age[image.age] = []
        }
        if(!obj.gender[image.gender]){
          obj.gender[image.gender] = []
        }
        if(!obj.age_ethnicity[image.age+'_'+image.ethnicity]){
          obj.age_ethnicity[image.age+'_'+image.ethnicity] = []
        }
        if(!obj.gender_ethnicity[image.gender+'_'+image.ethnicity]){
          obj.gender_ethnicity[image.gender+'_'+image.ethnicity] = []
        }
        if(!obj.age_gender[image.age+'_'+image.gender]){
          obj.age_gender[image.age+'_'+image.gender] = []
        }
        obj.all[image.age+'_'+image.ethnicity+'_'+image.gender].push(image)
        obj.age[image.age].push(image)
        obj.gender[image.gender].push(image)
        obj.age_ethnicity[image.age+'_'+image.ethnicity].push(image)
        obj.age_gender[image.age+'_'+image.gender].push(image)
        obj.gender_ethnicity[image.gender+'_'+image.ethnicity].push(image)
      }
    })
    // console.log(obj)
  }


  selectImages(){
    console.log(this.images)
    let emotion = 'Sad'

    for(let i=0;i<this.images.length;i++){
      let image = this.images[i]
      if(image.emotion ==emotion){
        this.selectedImages.push(image)
      }
    }

    console.log(this.selectedImages)

  }

  removeSelectedImages(){
    // this.selectedImages.forEach((image:any)=>{
    //   this.firestore.delete('ai-avatars',image.id)
    // })
    // this.selectedImages = []
    // this.toast.show('Selected images removed',3000,'bottom')
  }


}
