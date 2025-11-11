import { Component, ElementRef, Input, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { ModalController, PopoverController } from '@ionic/angular';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';
import { NavService } from 'src/app/services/nav.service';
import { InputFieldsPage } from '../input-fields/input-fields.page';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MenuPage } from '../../menu/menu.page';
import { SelectMenuService } from 'src/app/services/select-menu.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-design-mail',
  templateUrl: './design-mail.page.html',
  styleUrls: ['./design-mail.page.scss'],
})
export class DesignMailPage implements OnInit {
  @Input() data: any;
  @ViewChildren('itemRef') itemRefs!: QueryList<ElementRef>;
  mailItem: any = null;
  selectedBlockIndex: number = -1;
  selectedSubBlockIndex: number = -1;
  shortMenu:any;
  caretPosition:number = 0;
  activeIndex: number | null = null;
  year: number = new Date().getFullYear();
  constructor(
    public modalCtrl: ModalController,
    public media: MediaService,
    public icon: IconsService,
    private nav: NavService,
    private fire: AngularFirestore,
    public popoverController: PopoverController,
    public selectMenuservice: SelectMenuService,
    public translate: TranslateService,
  ) { }

  ngOnInit() {
    console.log(this.data);
    this.mailItem = this.data.mailItem;
  }

  save(){
    console.log('Saving mail item');
    this.fire.collection('mailflow').doc(this.mailItem.id).update(this.mailItem).then(()=>{
      console.log('Saved');
      // this.modalCtrl.dismiss({updated:true});
    });
  }

  close(){
    this.modalCtrl.dismiss();
  }

  moveBlock(index:number,direction:string,subIndex?:number,fieldIndex?:number){
    if(direction=='up'){
      if(!subIndex&&subIndex!==0){
        if(index>0){
          let item = this.mailItem.content.splice(index,1)[0];
          this.mailItem.content.splice(index-1,0,item);
        }
      }
      else{
        if(!fieldIndex&&fieldIndex!==0){
          fieldIndex = 0;
        }
        if(index>=0 && subIndex>=0 && fieldIndex>0){
          let item = this.mailItem.content[index].data[subIndex].splice(fieldIndex,1)[0];
          this.mailItem.content[index].data[subIndex].splice(fieldIndex-1,0,item);
        }
      }
    }
    else if(direction=='down'){
      if(!subIndex&&subIndex!==0){
        if(index<this.mailItem.content.length-1){
          let item = this.mailItem.content.splice(index,1)[0];
          this.mailItem.content.splice(index+1,0,item);
        }
      }
      else{
        if(!fieldIndex&&fieldIndex!==0){
          fieldIndex = 0;
        }
        if(index>=0 && subIndex>=0 && fieldIndex>0){
          let item = this.mailItem.content[index].data[subIndex].splice(fieldIndex,1)[0];
          this.mailItem.content[index].data[subIndex].splice(fieldIndex+1,0,item);
        }
      }
    }
  }

  removeContent(index:number){
    this.mailItem.content.splice(index,1);
    this.selectedBlockIndex = -1;
    this.save();
  }

  add(type:string,index?:number,subIndex?:number){
    if(!this.mailItem.content){
      this.mailItem.content = [];
    }
    let save:boolean = true;
    let item:any = {}
    if(!index&&index!==0){
      if(type=='text'){
        item = {type,value:''}
      }
      else if(type=='image'){
        item = {type, src: ''}
      }
      else if(type=='button'){
        item = {type, text: '', url: ''};
      }
      else if(type=='spacer'){
        item = {type, height: '20px'};
      }
      else if(type=='divider'){
        item = {type,marginTop:'15px',marginBottom:'15px' };
      }
      else if(type=='table'){
        item = {type, rows: 1, columns: 2, data: [[{type:'text',value:''},{type:'text',value:''}]]}
      }
      else if(type=='caseCard'){
        let itemCard:any = {
          photo:'',
          title:'Dit is een case titel',
          user_info:'Dit is een subtitel'
        }
        item = {type,item:itemCard};
      }

      if(this.selectedBlockIndex!=-1){
        this.mailItem.content.splice(this.selectedBlockIndex+1, 0, item);
      }
      else{
        this.mailItem.content.push(item);
      }

    }
    else{
      if(!subIndex){
        subIndex = 0
      }
      if(type=='text'){
        this.mailItem.content[index].data[subIndex].push({type, value: ''});
      }
      else if(type=='image'){
        this.mailItem.content[index].data[subIndex].push({type, src: ''});
        // this.getInputImage(index,subIndex,this.mailItem.content[index].data[subIndex].length-1);
        // save = false;
      }
      else if(type=='button'){
        this.mailItem.content[index].data[subIndex].push({type, text: '', url: ''});
      }
      else if(type=='spacer'){
        this.mailItem.content[index].data[subIndex].push({type, height: 20});
      }
      else if(type=='divider'){
        this.mailItem.content[index].data[subIndex].push({type});
      }
    }
    if(save){ 
      this.save();
    }
  }

  selectBlock(index:number,subIndex?:number){
    if(this.selectedBlockIndex===index && this.selectedSubBlockIndex===subIndex){
      this.selectedBlockIndex = -1;
      this.selectedSubBlockIndex = -1;
    }
    else{
      this.selectedBlockIndex = index;
      this.selectedSubBlockIndex = subIndex || -1;
    }
  }
  clearSelectedBlock(){
    this.selectedBlockIndex = -1;
    this.selectedSubBlockIndex = -1;
  }


  // getInputImage(index:number,subIndex?:number,fieldIndex?:number){
  //   let img = '';
  //   let height = 'auto';
  //   let borderRadius = '0px';
  //   if(!subIndex&&subIndex!==0){
  //     img = this.mailItem.content[index].src;
  //     height = this.mailItem.content[index].height || 'auto';
  //     borderRadius = this.mailItem.content[index].borderRadius || '0px';
  //   }
  //   else{
  //     if(!fieldIndex&&fieldIndex!==0){
  //       fieldIndex = 0;
  //     }
  //     img = this.mailItem.content[index].data[subIndex][fieldIndex].src;
  //     height = this.mailItem.content[index].data[subIndex][fieldIndex].height || 'auto';
  //     borderRadius = this.mailItem.content[index].data[subIndex][fieldIndex].borderRadius || '0px';
  //   }

  //   this.inputFields('Afbeelding kiezen','Kies een afbeelding voor in de e-mail',[
  //     {
  //       name: 'image',
  //       type: 'text',
  //       title: 'Afbeelding',
  //       value: img
  //     },
  //     {
  //       name: 'height',
  //       type: 'text',
  //       title: 'Hoogte',
  //       value: height
  //     },
  //     {
  //       name: 'borderRadius',
  //       type: 'text',
  //       title: 'Hoekradius',
  //       value: borderRadius
  //     }
  //   ],((result:any)=>{
  //     if(result.data){
  //       if(!subIndex&&subIndex!==0){
  //         this.mailItem.content[index].src = result.data[0].value;
  //         this.mailItem.content[index].height = result.data[1].value;
  //         this.mailItem.content[index].borderRadius = result.data[2].value;
  //         this.save();
  //       }
  //       else{
  //         if(!fieldIndex&&fieldIndex!==0){
  //           fieldIndex = 0;
  //         }
  //         this.mailItem.content[index].data[subIndex][fieldIndex].src = result.data[0].value;
  //         this.mailItem.content[index].data[subIndex][fieldIndex].height = result.data[1].value;
  //         this.mailItem.content[index].data[subIndex][fieldIndex].borderRadius = result.data[2].value;
  //         this.save();
  //       }
  //     }
  //   }));

  // }

  // getInputButton(index:number,subIndex?:number,fieldIndex?:number){
  //   let text = '';
  //   let url = '';
  //   if(!subIndex&&subIndex!==0){
  //     text = this.mailItem.content[index].text;
  //     url = this.mailItem.content[index].url;
  //   }
  //   else{
  //     if(!fieldIndex&&fieldIndex!==0){
  //       fieldIndex = 0;
  //     }
  //     text = this.mailItem.content[index].data[subIndex][fieldIndex].text;
  //     url = this.mailItem.content[index].data[subIndex][fieldIndex].url;
  //   }

  //   this.inputFields('Knop instellen','Stel de knop in voor in de e-mail',[
  //     {
  //       name: 'text',
  //       type: 'text',
  //       title: 'Tekst',
  //       value: text
  //     },
  //     {
  //       name: 'url',
  //       type: 'text',
  //       title: 'URL',
  //       value: url
  //     }
  //   ],((result:any)=>{
  //     if(result.data){
  //       if(!subIndex&&subIndex!==0){
  //         this.mailItem.content[index].text = result.data[0].value;
  //         this.mailItem.content[index].url = result.data[1].value;
  //         this.save();
  //       }
  //       else{
  //         if(!fieldIndex&&fieldIndex!==0){
  //           fieldIndex = 0;
  //         }
  //         this.mailItem.content[index].data[subIndex][fieldIndex].text = result.data[0].value;
  //         this.mailItem.content[index].data[subIndex][fieldIndex].url = result.data[1].value;
  //         this.save();
  //       }
  //     }
  //   }));

  // }


  public async inputFields(title:string,text:string,fields:any[],callback:Function,extraData?:any){
    let cssClass = 'inputFieldsModal';
    for(let i=0;i<fields.length;i++){
      if(fields[i].type=='html'){
        cssClass = 'editHtmlModal';
        break;
      }
    }
    const modalItem = await this.modalCtrl.create({
      component:InputFieldsPage,
      componentProps:{
        text:text,
        fields:fields,
        title:title,
        extraData:extraData
      },
      cssClass:'infoModal',
    })
    modalItem.onWillDismiss().then(result=>{
      callback(result)
    })
    return await modalItem.present()
  }

  
  addPersonalTag(event:any){
    event.stopPropagation();
    console.log(event);
    let index = this.selectedBlockIndex;
    let subIndex = this.selectedSubBlockIndex;
    let list = [
      {
        title:this.translate.instant('form.name'),
        icon:'faUser',
        value:'{{displayName}}'
      },
    ]
    this.showshortMenu(event,list,(result:any)=>{
      if(result?.value){

        if (this.activeIndex === null) return;

        const itemEl = this.itemRefs.get(this.activeIndex)?.nativeElement?.querySelector('textarea') as HTMLTextAreaElement;
        if (!itemEl) return;

        const start = itemEl.selectionStart;
        const end = itemEl.selectionEnd;

        const original = this.mailItem.content[this.selectedBlockIndex].value;
        const updated = original.substring(0, start) + result.value + original.substring(end);
        this.mailItem.content[this.selectedBlockIndex].value = updated;
        this.save();
        const newPos = start + result.value.length;

        // Zorg dat de cursor terugkomt na het invoegen
        setTimeout(() => {
          itemEl.setSelectionRange(newPos, newPos);
          itemEl.focus();
        }, 0);


      }
    });
    
  }

  setActiveTextarea(index: number, event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.activeIndex = index;
    this.caretPosition = target.selectionStart || 0;
    console.log('Active textarea index set to:', this.activeIndex, 'Caret position:', this.caretPosition);
  }


  updateCaret(event?: any) {
    this.caretPosition = event.target.selectionStart || 0;
  }

  async showshortMenu(event:any,list:any[],callback:Function){
    this.shortMenu = await this.popoverController.create({
      component: MenuPage,
      componentProps:{
        pages:list,
        listShape:true,
        customMenu:true,
      },
      cssClass: 'shortMenu',
      event: event,
      translucent: false,
      reference:'trigger',
    });
    this.shortMenu.shadowRoot.lastChild.lastChild['style'].cssText = 'border-radius: 24px !important;';
    await this.shortMenu.present();
    await this.shortMenu.onDidDismiss()
    callback(this.selectMenuservice.selectedItem)
  }
  
}
