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

  genders:any = ['Male','Female','Non-binary']
  ethnicitys:any = ['African', 'Asian', 'Caucasian', 'Hispanic',' Middle Eastern', 'Native American', 'Mixed-race']
  ages:any = [ 'Young adult', 'Middle-aged', 'Senior', 'Elderly'] //'Child', 'Teenager',
  styles:any = ['Photo-realistic', 'Disney-style illustration', 'Anime-style illustration']
  emotions:any = ['Happy', 'Sad', 'Angry', 'Surprised', 'Neutral', 'Disgusted', 'Fearful']
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
  sources:any = ['OpenAI','Akool']
  gender:string = 'Male'
  ethnicity:string = 'African'
  age:string = 'Middle-aged'
  style:string = 'Photo-realistic'
  occupation:string = 'Person'
  emotion:string = 'Neutral'
  changingType:string = ''
  source:string = 'OpenAI'
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
    this.firestore.get('ai-avatars').subscribe((images:any)=>{
      this.images = images.map((e:any) => {
        let img = e.payload.doc.data()
        img.id = e.payload.doc.id
        return img
      })
      console.log(this.images)
    })
  }


  async create(prompt?:string){
    this.toast.showLoader('Creating image...')
    let url = 'https://generateandstoreimage-p2qcpa6ahq-ew.a.run.app'
    
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
  startScript(){
    console.log(this.changingType)
    if(this.changingType){
      this.toast.showLoader('creating Images')
      this.countingScriptMax = this[this.changingType+'s'].length
      if(this[this.changingType+'s'][this.countingScript]){
        console.log(this[this.changingType+'s'][this.countingScript])
        this[this.changingType] = this[this.changingType+'s'][this.countingScript]
        this.createFromScript(()=>{
          this.countingScript++
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


  async createFromScript(callback:Function){
    let url = 'https://generateandstoreimage-p2qcpa6ahq-ew.a.run.app'
    
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

  createWithPrompt(){
    this.modalService.inputFields('Create with prompt','Enter a prompt for the AI to generate an image',[
      {title:'Prompt',type:'textarea',value:`A centered portrait of a 
[age] 
[gender] 
[ethnicity] 
[occupation],
who looks [emotion]. 
The person is positioned in the center of the frame, with the head and shoulders taking up no more than 40% of the image height and width.  
There is exactly 30% empty space above the head and 30% empty space on both sides of the person.  
The person’s hairstyle, clothing, and any accessories are chosen creatively by the AI.  
The background is soft, neutral, and simple (e.g., soft gray or light beige).  
The face is well-lit with a natural expression, and the portrait is in a [style].  
The framing should emphasize the empty space, with the head appearing small compared to the overall frame.
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
    this.modalService.showText(image.url,'',false,[
      {text:'Delete',color:'danger',value:'delete'},
      {text:'OK',color:'secondary',value:''}
    ],true,((response:any)=>{
      console.log(response)
      if(response?.data=='delete'){
        this.firestore.delete('ai-avatars',image.id)
      }
    }),'',{},true)
  }
}
