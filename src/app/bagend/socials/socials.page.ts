import { Component, OnInit } from '@angular/core';
import { FirestoreService } from 'src/app/services/firestore.service';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';
import { ModalService } from 'src/app/services/modal.service';
import { NavService } from 'src/app/services/nav.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-socials',
  templateUrl: './socials.page.html',
  styleUrls: ['./socials.page.scss'],
})
export class SocialsPage implements OnInit {
  show:string = 'agents';
  agents:any[] = [];
  constructor(
    public nav:NavService,
    public icon:IconsService,
    private firestore:FirestoreService,
    public media:MediaService,
    private toast:ToastService,
    public modal:ModalService
  ) { }

  ngOnInit() {
    this.getAgents();
  }

  getAgents(){
    this.firestore.get('social_agents').subscribe((res:any) => {
      this.agents = res.map((item:any) => {
        return {
          id: item.payload.doc.id,
          ...item.payload.doc.data()
        }
      });
      console.log(this.agents);
    });
  }

  update(agent:any){
    let data = JSON.parse(JSON.stringify(agent));
    delete data.id;
    delete data.show;
    this.firestore.update('social_agents', agent.id, data).then(() => {
      this.toast.show('Agent updated successfully');
    })
  }

  editAgent(agent:any,field:string){
    this.modal.editHtmlItem({value:agent[field]},(result:any)=>{
      console.log(result);
      if(result.data){
        agent[field] = result.data.value
        this.update(agent)
      }
    })
  }

}
