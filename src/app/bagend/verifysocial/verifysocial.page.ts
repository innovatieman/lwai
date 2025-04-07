import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FirestoreService } from 'src/app/services/firestore.service';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-verifysocial',
  templateUrl: './verifysocial.page.html',
  styleUrls: ['./verifysocial.page.scss'],
})
export class VerifysocialPage implements OnInit {
  [x:string]: any;
  id:string = '';
  action:string = '';
  data:any = {}
  returnData:any = {}
  editableData:any = {}
  processing:boolean = true
  constructor(
    private route: ActivatedRoute,
    private nav: NavService,
    private firestore:FirestoreService,
    private toast:ToastService,
    private modalService:ModalService
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params=>{

      if(!params['id'] || !params['action']){
        this.toast.show('Geen id of actie opgegeven')
        this.nav.go('start')
        return
      }
      this.id = params['id']
      this.action = params['action']
      this.getData()
    })
  }

  getData(){
    console.log('getData',this.id)
    this.firestore.getDoc('socials_in_action',this.id).subscribe((doc:any)=>{
      if(doc.type=='added'){
        this.data = JSON.parse(JSON.stringify(doc.payload.data()))
        this.data.id = doc.payload.id
        if(this.data.status!='posted'){
          this[this.action]()
        }
        else{
          this.processing = false
          this.toast.show('Dit bericht is al gepost')
        }
      }
      else{
        // this.toast.show('Geen data gevonden')
        this.processing = false
        return
        // this.nav.go('start')
      }
    })
  }

  success(){
    this.returnData = {
      status: 'verification successful'
    }
    this.firestore.update('socials_in_action',this.data.id,this.returnData).then(()=>{
      this.data.status = 'verification successful'
      this.processing = false
      this.nav.go('verifysocial/'+this.data.id+'/nothing')
    })
  }

  cancel(){
    this.returnData = {
      status: 'cancelled'
    }
    this.firestore.update('socials_in_action',this.data.id,this.returnData).then(()=>{
      this.data.status = 'cancelled'
      this.processing = false
      this.nav.go('verifysocial/'+this.data.id+'/nothing')
    })
  }

  rebuild_text(){
    this.returnData = {
      status: 'new',
    }
    this.firestore.update('socials_in_action',this.data.id,this.returnData).then(()=>{
      this.data.status = 'new'
      this.processing = false
      this.nav.go('verifysocial/'+this.data.id+'/nothing')
    })
  }

  rebuild_photo(){
    this.returnData = {
      status: 'text created',
      image:''
    }
    this.firestore.update('socials_in_action',this.data.id,this.returnData).then(()=>{
      this.data.status = 'text created'
      this.processing = false
      this.nav.go('verifysocial/'+this.data.id+'/nothing')
    })
  }

  rebuild_all(){
    this.returnData = {
      status: 'new',
      image:''
    }
    this.firestore.update('socials_in_action',this.data.id,this.returnData).then(()=>{
      this.data.status = 'new'
      this.processing = false
      this.nav.go('verifysocial/'+this.data.id+'/nothing')
    })
  }

  edit(){
    this.processing = false
    this.editableData = {
      status: 'verification successful',
      content: this.data.content,
      title: this.data.title
    }
    let fields = [
      {
        title: 'Titel',
        type: 'text',
        value: this.editableData.title,
        required: true
      },
      {
        title: 'Content',
        type: 'html',
        value: this.editableData.content,
        required: true
      }
    ]
    this.modalService.inputFields('Verbeter het maar','',fields,(response:any)=>{
      console.log(response)
      if(response.data){
        this.editableData.title = response.data[0].value
        this.editableData.content = response.data[1].value
        this.returnData = {
          status: 'verification successful',
          content: this.editableData.content,
          title: this.editableData.title
        }
        this.toast.showLoader('Verwerken')
        this.firestore.update('socials_in_action',this.data.id,this.returnData).then(()=>{
          this.data.status = 'verification successful'
          this.toast.hideLoader()
          this.nav.go('verifysocial/'+this.data.id+'/nothing')
        })
      }
    })
  }

  rewritten(){
    this.returnData = {
      status: 'verification successful',
      text: this.editableData.text,
      title: this.editableData.title
    }
    this.firestore.update('socials_in_action',this.data.id,this.returnData).then(()=>{
      this.data.status = 'verification successful'
      this.processing = false
      this.nav.go('verifysocial/'+this.data.id+'/nothing')
    })
  }

  nothing(){
    this.processing = false
  }
}
