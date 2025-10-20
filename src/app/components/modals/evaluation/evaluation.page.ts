import { Component, Input, OnInit } from '@angular/core';
import { ModalController, PopoverController } from '@ionic/angular';
import { AuthService } from 'src/app/auth/auth.service';
import { ExportService } from 'src/app/services/export.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';
import { MenuPage } from '../../menu/menu.page';
import { SelectMenuService } from 'src/app/services/select-menu.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-evaluation',
  templateUrl: './evaluation.page.html',
  styleUrls: ['./evaluation.page.scss'],
})
export class EvaluationPage implements OnInit {
  feedbackGiven:boolean = false
  vh:number = 0;
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
    public helper:HelpersService,
    private exportService:ExportService,
    private popoverController:PopoverController,
    private selectMenuservice:SelectMenuService,
    private translate:TranslateService
  ) { }

  ngOnInit() {
    if(this.options.skills){
      this.options.skills = JSON.parse(this.options.skills)
    }
    if(this.options.firstTime){
      this.calculateSkillsScore() 
    }
    console.log('options',this.options)
    if(this.options.exportPdf=='conversation'){
      this.options.buttons.unshift({
        // text:'Exporteer als PDF',
        value:'pdf',
        icon:'faPrint',
        color:'primary',
        fill:'solid',
        click:()=>{
          this.exportPdf()
        }
      })
    }
  }

  ngAfterViewInit() {
    this.vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${this.vh}px`);
    
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
  shortMenu: any;
  async exportPdf(){

    let options:any[] = [
      {
        title:this.translate.instant('buttons.export_pdf'),
        icon:'faGlobe',
        id:'exportAll',
      },
      // {
      //   title:'Exporteer alleen het gesprek',
      //   icon:'faComments',
      //   id:'exportConversation',
      // },
      // {
      //   title:'Exporteer alleen de eindevaluatie',
      //   icon:'faGraduationCap',
      //   id:'exportFeedback',
      // },
    ]

     this.shortMenu = await this.popoverController.create({
          component: MenuPage,
          componentProps:{
            customMenu:true,
            pages:options,
            listShape:true
          },
          cssClass: 'customMenu',
          event: event,
          translucent: false,
        });
        this.shortMenu.shadowRoot.lastChild.lastChild['style'].cssText = 'border-radius: 24px !important;';
    
        await this.shortMenu.present()
        await this.shortMenu.onWillDismiss();
    
    
        if(this.selectMenuservice.selectedItem){
          if(this.selectMenuservice.selectedItem.id == 'exportAll'){
            this.exportService.caseToPdf(this.options.conversation)
          }
          else{
            this.exportService.caseToPdf(this.options.conversation)
          }
        }



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
    let conversationLength = 0

    if(this.options.conversation.stream){
      return 0
    }


    if(this.options.conversation.messages){
      conversationLength = (this.options.conversation.messages.length -1) /2
    }
    let score = 0 //conversationLength - 10
    // if(score < 0){
    //   score = 0
    // }
    let difficultyMultiplier = 1
    const userLevel = this.auth.skillsLevel(this.auth.skills[skill].score)
    const conversationLevel = this.options.conversation_level

    this.skillScore[skill].prevScore = this.auth.skills[skill].score
    let performanceBonus = this.performanceBonus[this.options.skills.evaluation[this.helper.capitalizeNames(skill)].score]
    let goalBonus = 0
    if(this.options.skills?.goal_bonus){
      goalBonus = this.options.skills.goal_bonus
    }

    if(userLevel == conversationLevel){
      difficultyMultiplier = 1
    }
    else if(conversationLevel - userLevel == 1){
      if(performanceBonus < 0){
        difficultyMultiplier = 0.5
      }
      else{
        difficultyMultiplier = 1.5
      }
    }
    else if(conversationLevel - userLevel == -1){
      if(performanceBonus < 0){
        difficultyMultiplier = 1.5
      }
      else{
        difficultyMultiplier = 0.5
      }
    }
    else if(conversationLevel - userLevel >= 2){
      if(performanceBonus < 0){
        difficultyMultiplier = 0
      }
      else{
        difficultyMultiplier = 2
      }
    }
    else if(conversationLevel - userLevel <= -2){
      if(performanceBonus < 0){
        difficultyMultiplier = 2
      }
      else{
        difficultyMultiplier = 0
      }
    }

    if(conversationLength >= 5){
      score += performanceBonus
      score *= difficultyMultiplier
      score += goalBonus
    }
    return score
  }

}
