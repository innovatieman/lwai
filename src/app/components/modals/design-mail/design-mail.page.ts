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
  selectedFieldIndex: number = -1;
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
    this.mailItem.content.forEach((contentItem:any) => {
      if (contentItem.type === 'table') {
        contentItem.columnArray = Object.entries(contentItem.data);
      }
    });
  }

  save(){
    console.log('Saving mail item');
    let item = JSON.parse(JSON.stringify(this.mailItem));
    item.content.forEach((contentItem:any) => {
      if (contentItem.type === 'table') {
        delete contentItem.columnArray;
      }
    });
    this.fire.collection('mailflow').doc(this.mailItem.id).update(item).then(()=>{
      console.log('Saved');
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
        if(fieldIndex>0){
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
        if(fieldIndex<this.mailItem.content[index].data[subIndex].length-1){
          let item = this.mailItem.content[index].data[subIndex].splice(fieldIndex,1)[0];
          this.mailItem.content[index].data[subIndex].splice(fieldIndex+1,0,item);
        }
      }
    }
  }

  removeContent(index:number,subIndex?:number,fieldIndex?:number){
    if(subIndex!==undefined){
      this.mailItem.content[index].data[subIndex].splice(fieldIndex,1);
      this.selectedSubBlockIndex = -1;
      this.save();
      return;
    }
    this.mailItem.content.splice(index,1);
    this.selectedBlockIndex = -1;
    this.save();
  }

  addSubItem(index:number,subIndex?:number,event?:Event){
    if(event){
      event.stopPropagation();
    }
    let list = [
      {
        title:this.translate.instant('design_mail.add_text'),
        icon:'faPen',
        value:'text'
      },
      {
        title:this.translate.instant('design_mail.add_image'),
        icon:'faImage',
        value:'image'
      },
      {
        title:this.translate.instant('design_mail.add_button'),
        icon:'faMousePointer',
        value:'button'
      },
      {
        title:this.translate.instant('design_mail.add_spacer'),
        icon:'faArrowsAltV',
        value:'spacer'
      },
      {
        title:this.translate.instant('design_mail.add_divider'),
        icon:'faMinus',
        value:'divider'
      },
    ]
    this.showshortMenu(event,list,(result:any)=>{
      if(result?.value){
        this.add(result.value,index,subIndex);
      }
    })
  }

  getColumnEntries(data: {[key: string]: any[]}): [string, any[]][] {
    return Object.entries(data);
  }

  styleFor(item: any) {
    return {
      'text-align': item.alignment || 'left',
      'padding-left': item.marginLeft || '0px',
      'padding-right': item.marginRight || '0px',
      'padding-top': item.marginTop || '0px',
      'padding-bottom': item.marginBottom || '0px'
    };
  }

  styleForButton(item: any) {
    // { 'color': contentItem.color || '#ffffff','--background' : contentItem.backgroundColor || '#2b6cf5','border-radius': contentItem.borderRadius ||  '0px', '--border-radius': contentItem.borderRadius ||  '0px', '--padding-start': contentItem.paddingLeft || '14px', '--padding-end': contentItem.paddingRight || '14px', '--padding-top': contentItem.paddingTop || '8px', '--padding-bottom': contentItem.paddingBottom || '8px'}
    return {
      'color': item.color || '#ffffff',
      '--background' : item.backgroundColor || '#2b6cf5',
      'background-color' : item.backgroundColor || '#2b6cf5',
      'border-radius': item.borderRadius ||  '0px',
      '--border-radius': item.borderRadius ||  '0px',
      '--padding-start': item.paddingLeft || '14px',
      '--padding-end': item.paddingRight || '14px',
      '--padding-top': item.paddingTop || '8px',
      '--padding-bottom': item.paddingBottom || '8px'
    };
  }
  styleForText(item: any) {
    //{'text-align': contentItem.alignment || 'left','font-size' : contentItem.fontSize || '14px', 'font-weight' : contentItem.fontWeight || 400}
    return {
      'text-align': item.alignment || 'left',
      'font-size' : item.fontSize || '14px',
      'font-weight' : item.fontWeight || 400,
      'color': item.color || '#000000',
      'background-color': item.backgroundColor || 'transparent',
    };
  } 
  styleForImageHolder(item: any) {
    //{'text-align': contentItem.alignment || 'left','margin-left': contentItem.marginLeft || '0px', '--border-radius': contentItem.borderRadius ||  '0px', 'padding-left': contentItem.marginLeft || '0px', 'padding-right': contentItem.marginRight || '0px', 'padding-top': contentItem.marginTop || '0px', 'padding-bottom': contentItem.marginBottom || '0px'}
    return {
      'text-align': item.alignment || 'left',
      'margin-left': item.marginLeft || '0px',
      '--border-radius': item.borderRadius ||  '0px',
      'padding-left': item.marginLeft || '0px',
      'padding-right': item.marginRight || '0px',
      'padding-top': item.marginTop || '0px',
      'padding-bottom': item.marginBottom || '0px'
    };
  }
  styleForImage(item: any) {
    //{'border-radius': contentItem.borderRadius ||  '12px','height': contentItem.height || 'auto'}
    return {
      'border-radius': item.borderRadius ||  '12px',
      'height': item.height || 'auto'
    };
  }
  styleForDivider(item: any) {
    //{'padding-left': contentItem.marginLeft || '0px', 'padding-right': contentItem.marginRight || '0px', 'margin-top': contentItem.marginTop || '0px', 'margin-bottom': contentItem.marginBottom || '0px'}
    return {
      'padding-left': item.marginLeft || '0px',
      'padding-right': item.marginRight || '0px',
      'margin-top': item.marginTop || '0px',
      'margin-bottom': item.marginBottom || '0px'
    };
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
        item = {type, columns: 2, data: {0:[{type:'text',value:''}],1:[{type:'text',value:''}]}}
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
        this.mailItem.content.forEach((contentItem:any) => {
          if (contentItem.type === 'table') {
            contentItem.columnArray = Object.entries(contentItem.data);
          }
        });
      }
      else{
        this.mailItem.content.push(item);
        this.mailItem.content.forEach((contentItem:any) => {
          if (contentItem.type === 'table') {
            contentItem.columnArray = Object.entries(contentItem.data);
          }
        });
      }

    }
    else{
      if(!subIndex){
        subIndex = 0
      }
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

      this.mailItem.content[index].data[subIndex].push(item);

    }
    if(save){ 
      this.save();
    }
  }

  selectBlock(index:number,subIndex?:number,fieldIndex?:number,event?:Event){
    console.log('Select block',index,subIndex,fieldIndex);
    if(event){
      event.stopPropagation();
    }
    // if(this.selectedBlockIndex===index && this.selectedSubBlockIndex===subIndex){
    //   this.selectedBlockIndex = -1;
    //   this.selectedSubBlockIndex = -1;
    // }

    if(!subIndex&&subIndex!==0){
      subIndex = -1;
      fieldIndex = -1;
    }
    if(!fieldIndex&&fieldIndex!==0){
      fieldIndex = -1;
    }
    this.selectedBlockIndex = index;
    this.selectedSubBlockIndex = subIndex;
    this.selectedFieldIndex = fieldIndex;
  }
  clearSelectedBlock(){
    this.selectedBlockIndex = -1;
    this.selectedSubBlockIndex = -1;
    this.selectedFieldIndex = -1;
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
  
  showIf(type:string[]){
    if(!this.selectedBlockIndex && this.selectedBlockIndex!==0){
      return false;
    }
    if( type.indexOf(this.mailItem.content[this.selectedBlockIndex]?.type) > -1 ){
      return true;
    }

    if(this.selectedSubBlockIndex!==-1){
      if( type.indexOf(this.mailItem.content[this.selectedBlockIndex]?.data[this.selectedSubBlockIndex][this.selectedFieldIndex]?.type) > -1 ){
        return true;
      }
    }

    return false;
  }



  getFieldProp(prop: string): any {
    if (this.selectedFieldIndex == null || this.selectedFieldIndex === -1) {
      return this.mailItem.content[this.selectedBlockIndex]?.[prop];
    } else {
      return this.mailItem.content[this.selectedBlockIndex]?.columnArray?.[this.selectedSubBlockIndex]?.[1]?.[this.selectedFieldIndex]?.[prop];
    }
  }

  setFieldProp(prop: string, value: any): void {
    if (this.selectedFieldIndex == null || this.selectedFieldIndex === -1) {
      if (this.mailItem.content[this.selectedBlockIndex]) {
        this.mailItem.content[this.selectedBlockIndex][prop] = value;
      }
    } else {
      const field = this.mailItem.content[this.selectedBlockIndex]?.columnArray?.[this.selectedSubBlockIndex]?.[1]?.[this.selectedFieldIndex];
      if (field) {
        field[prop] = value;
      }
    }
  }

  get fieldAlignment(): string {
    return this.getFieldProp('alignment') || 'left';
  }
  set fieldAlignment(value: string) {
    this.setFieldProp('alignment', value);
  }
  get fieldText(): string {
    return this.getFieldProp('text') || '';
  }
  set fieldText(value: string) {
    this.setFieldProp('text', value);
  }
  get fieldUrl(): string {
    return this.getFieldProp('url') || '';
  }
  set fieldUrl(value: string) {
    this.setFieldProp('url', value);
  }
  get fieldExpand(): string {
    return this.getFieldProp('expand') || '';
  }
  set fieldExpand(value: string) {
    this.setFieldProp('expand', value);
  }
  get fieldHeight(): string {
    return this.getFieldProp('height') || '';
  }
  set fieldHeight(value: string) {
    this.setFieldProp('height', value);
  }
  get fieldMarginTop(): string {
    return this.getFieldProp('marginTop') || '';
  }
  set fieldMarginTop(value: string) {
    this.setFieldProp('marginTop', value);
  }
  get fieldMarginBottom(): string {
    return this.getFieldProp('marginBottom') || '';
  }
  set fieldMarginBottom(value: string) {
    this.setFieldProp('marginBottom', value);
  }
  get fieldMarginLeft(): string {
    return this.getFieldProp('marginLeft') || '';
  }
  set fieldMarginLeft(value: string) {
    this.setFieldProp('marginLeft', value);
  }
  get fieldMarginRight(): string {
    return this.getFieldProp('marginRight') || '';
  }
  set fieldMarginRight(value: string) {
    this.setFieldProp('marginRight', value);
  }
  get fieldPaddingTop(): string {
    return this.getFieldProp('paddingTop') || '';
  }
  set fieldPaddingTop(value: string) {
    this.setFieldProp('paddingTop', value);
  }
  get fieldPaddingBottom(): string {
    return this.getFieldProp('paddingBottom') || '';
  }
  set fieldPaddingBottom(value: string) {
    this.setFieldProp('paddingBottom', value);
  }
  get fieldPaddingLeft(): string {
    return this.getFieldProp('paddingLeft') || '';
  }
  set fieldPaddingLeft(value: string) {
    this.setFieldProp('paddingLeft', value);
  }
  get fieldPaddingRight(): string {
    return this.getFieldProp('paddingRight') || '';
  }
  set fieldPaddingRight(value: string) {
    this.setFieldProp('paddingRight', value);
  }
  get fieldBackgroundColor(): string {
    return this.getFieldProp('backgroundColor') || '';
  }
  set fieldBackgroundColor(value: string) {
    this.setFieldProp('backgroundColor', value);
  }
  get fieldColor(): string {
    return this.getFieldProp('color') || '';
  }
  set fieldColor(value: string) {
    this.setFieldProp('color', value);
  }
  get fieldFontSize(): string {
    return this.getFieldProp('fontSize') || '';
  }
  set fieldFontSize(value: string) {
    this.setFieldProp('fontSize', value);
  }
  get fieldFontWeight(): string {
    return this.getFieldProp('fontWeight') || '';
  }
  set fieldFontWeight(value: string) {
    this.setFieldProp('fontWeight', value);
  }
  get fieldBorderRadius(): string {
    return this.getFieldProp('borderRadius') || '';
  }
  set fieldBorderRadius(value: string) {
    this.setFieldProp('borderRadius', value);
  }
  get fieldSrc(): string {
    return this.getFieldProp('src') || '';
  }
  set fieldSrc(value: string) {
    this.setFieldProp('src', value);
  }

}
