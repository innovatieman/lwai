import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AuthService } from 'src/app/auth/auth.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';

@Component({
  selector: 'app-evaluation',
  templateUrl: './evaluation.page.html',
  styleUrls: ['./evaluation.page.scss'],
})
export class EvaluationPage implements OnInit {
  feedbackGiven:boolean = false

    @Input() options:any={
      title:'',
      content:'',
      textBorder:true,
      btnsClass:'',
      buttons:[],
    };

  constructor(
    public modalCtrl:ModalController,
    public icon:IconsService,
    private firestore:FirestoreService,
    public media:MediaService,
    private auth:AuthService,
    public helper:HelpersService
  ) { }

  ngOnInit() {
    if(this.options.skills){
      this.options.skills = JSON.parse(this.options.skills)
    }
    if(this.options.firstTime){
      this.calculateSkillsScore() 
    }
  }

  feedback(value:boolean){
    let obj:any = JSON.parse(JSON.stringify(this.options.feedback))
    obj.positive = value
    for(let key in obj){
      if(obj[key] === null || obj[key] === undefined){
        delete obj[key]
      }
    } 
    this.firestore.create('feedback',obj).then(()=>{
      this.feedbackGiven = true
    })
  }


  performanceBonus:any = {
    1:-10,
    2:-10,
    3:-5,
    4:-5,
    5:0,
    6:0,
    7:5,
    8:5,
    9:10,
    10:10
  }

  skillScore:any = {
    impact:{
      score:0,
      prevScore:0,
    },
    flow:{
      score:0,
      prevScore:0,
    },
    logic:{
      score:0,
      prevScore:0,
    }
  }

  calculateSkillsScore(){
    for(let skill in this.auth.skills){
      this.skillScore[skill].score = this.auth.skills[skill].score + this.skillScoreDef(skill)
    }
    this.firestore.setSub('users',this.auth.userInfo.uid,'skills','skills',this.skillScore)
  }

  skillScoreDef(skill:string){
    let score = 20
    let difficultyMultiplier = 1
    if(this.auth.skillsLevel(this.auth.skills[skill].score)<this.options.conversation_level){
      difficultyMultiplier = 1.5
    }
    else if(this.auth.skillsLevel(this.auth.skills[skill].score)>this.options.conversation_level){
      difficultyMultiplier = 0.5
    }

    this.skillScore[skill].prevScore = this.auth.skills[skill].score
    let performanceBonus = this.performanceBonus[this.options.skills.evaluation[this.helper.capitalizeNames(skill)].score]
    let goalBonus = 0
    if(this.options.skills?.goal_bonus){
      goalBonus = this.options.skills.goal_bonus
    }
    console.log('performanceBonus',performanceBonus)
    console.log('difficultyMultiplier',difficultyMultiplier)
    console.log('goalBonus',goalBonus)
    score += performanceBonus
    score *= difficultyMultiplier
    score += goalBonus
    return score
  }
}
