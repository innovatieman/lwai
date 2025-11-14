import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subject, take, takeUntil } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';
import { ModalService } from 'src/app/services/modal.service';
import { SelectMenuService } from 'src/app/services/select-menu.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-mailflow',
  templateUrl: './mailflow.page.html',
  styleUrls: ['./mailflow.page.scss'],
})
export class MailflowPage implements OnInit {
  allMails: any[] = [];
  selectedItem: any = null;
  newMailItem: any = {
    title: 'Nieuwe E-Mail',
    from: 'AliciaLabs Conversations <alicia@alicialabs.nl>',
    subject: '',
    body: '',
    flow: 'registration',
    days: 1,
    active: false,
    information: '',
    exclude:{
      has_training: false,
      has_organisation: false,
      has_conversation: false,
      is_customer: false,
      has_no_training: false,
      has_no_organisation: false,
      has_no_conversation: false,
      is_no_customer: false
    }
  };
  selectedFlows: string[] = []

  // Mogelijke exclude toggles
  excludeKeys: string[] = [
    'has_training',
    'has_no_training',
    'has_organisation',
    'has_no_organisation',
    'has_conversation',
    'has_no_conversation',
    'is_customer',
    'is_no_customer',
  ];

  // Labels voor weergave
  excludeLabels: { [key: string]: string } = {
    has_training: 'Met Training',
    has_no_training: 'Geen Training',
    has_organisation: 'Met Organisatie',
    has_no_organisation: 'Geen Organisatie',
    has_conversation: 'Gesprek Gevoerd',
    has_no_conversation: 'Gesprek Niet Gevoerd',
    is_customer: 'Is Een Klant',
    is_no_customer: 'Is Geen Klant',
  };

  // Huidige filterstatus (standaard uit)
  excludeFilter: { [key: string]: boolean } = {};

  // Gefilterde lijst
  filteredMails: any[] = [];
  private leave$ = new Subject<void>();
  constructor(
    private fire:AngularFirestore,
    public icon:IconsService,
    public modalService:ModalService,
    public helpers:HelpersService,
    public translate:TranslateService,
    private popoverController:PopoverController,
    private selectMenuservice:SelectMenuService,
    public media:MediaService,
    public auth:AuthService,
    private functions:AngularFireFunctions,
    private toast:ToastService,
  ) { }

  ngOnInit() {
    this.getAllMails();
    // Initieel alle mails tonen
    this.filteredMails = this.allMails;
    this.excludeKeys.forEach(key => this.excludeFilter[key] = false);


  }

  ionViewWillEnter() {
    this.getAllMails();
    // Initieel alle mails tonen
    this.filteredMails = this.allMails;
    this.excludeKeys.forEach(key => this.excludeFilter[key] = false);
  }

  ionViewWillLeave() {
    this.leave$.next();
    this.leave$.complete();
  }

  getAllMails() {
    this.fire.collection('mailflow').valueChanges({ idField: 'id' }).pipe(takeUntil(this.leave$)).subscribe((mails: any[]) => {
      this.allMails = mails;
      for(let mail of this.allMails) {
        if(!mail.exclude) {
          mail.exclude = {
            has_training: false,
            has_organisation: false,
            has_conversation: false,
            is_customer: false,
            has_no_training: false,
            has_no_organisation: false,
            has_no_conversation: false,
            is_no_customer: false
          };
        }
      }
      this.allMails = this.allMails.sort((a, b) => {
        return a.days - b.days || a.title.localeCompare(b.title);
      });
      this.updateFilteredMails();
    });
  }

  newMail() {
    let obj = JSON.parse(JSON.stringify(this.newMailItem));
    this.modalService.inputFields('Nieuwe E-Mail','',[
      {
        name: 'title',
        type: 'text',
        title: 'Titel',
        value: obj.title
      },
      {
        name: 'information',
        type: 'textarea',
        title: 'Informatie voor admin',
        value: obj.information,
        rows: 3
      },
      {
        name: 'from',
        type: 'text',
        title: 'Van',
        value: obj.from
      },
      {
        name: 'flow',
        type: 'select',
        title: 'Flow',
        value: obj.flow,
        options:['direct','registration', 'inspiration', 'learning', 'customer']
      },
      {
        name: 'days',
        type: 'number',
        title: 'Dagen vanaf start',
        value: obj.days
      },
      {
        name: 'subject',
        type: 'text',
        title: 'Onderwerp',
        value: obj.subject
      },
      {
        name: 'body',
        type: 'html',
        title: 'Bericht',
        value: obj.body
      },

    ],((result:any)=>{
      if(result.data){
        this.fire.collection('mailflow').add({
          title: result.data[0].value,
          information: result.data[1].value,
          from: result.data[2].value,
          flow: result.data[3].value,
          days: result.data[4].value,
          subject: result.data[5].value,
          body: result.data[6].value,
          created: new Date(),
          created_by: this.auth.userInfo.displayName,
          updated_by:this.auth.userInfo.displayName,
          updated:new Date(),
          active: false,
          exclude:{
            has_training: false,
            has_organisation: false,
            has_conversation: false,
            is_customer: false,
            has_no_training: false,
            has_no_organisation: false,
            has_no_conversation: false,
            is_no_customer: false
          }
        });
      }
    }))
  }

  editMail(item:any,event?:Event) {
    if(event){
      event.stopPropagation();
      event.preventDefault();
    }
    this.modalService.designMail({ mailItem: item },(result:any)=>{
      console.log(result);
    })
  }

  editMailOud(item:any,event?:Event) {
    if(event){
      event.stopPropagation();
      event.preventDefault();
    }
    let obj = JSON.parse(JSON.stringify(item));
    this.modalService.inputFields('E-Mail Bewerken','',[
      {
        name: 'title',
        type: 'text',
        title: 'Titel',
        value: obj.title
      },
      {
        name: 'information',
        type: 'textarea',
        title: 'Informatie voor admin',
        value: obj.information,
        rows: 3
      },
      {
        name: 'from',
        type: 'text',
        title: 'Van',
        value: obj.from
      },
      {
        name: 'flow',
        type: 'select',
        title: 'Flow',
        value: obj.flow,
        options:['direct','registration', 'inspiration', 'learning', 'customer']
      },
      {
        name: 'days',
        type: 'number',
        title: 'Dagen vanaf start',
        value: obj.days
      },
      {
        name: 'subject',
        type: 'text',
        title: 'Onderwerp',
        value: obj.subject
      },
      {
        name: 'body',
        type: 'html',
        title: 'Bericht',
        value: obj.body
      },

    ],((result:any)=>{
      console.log(result);
      if(result.data=='delete'){
        this.fire.collection('mailflow').doc(item.id).delete();
        return;
      }
      if(result.data){
        this.fire.collection('mailflow').doc(item.id).update({
          title: result.data[0].value,
          information: result.data[1].value,
          from: result.data[2].value,
          flow: result.data[3].value,
          days: result.data[4].value,
          subject: result.data[5].value,
          body: result.data[6].value,
          updated_by:this.auth.userInfo.displayName,
          updated:new Date()
        });
      }
    }),{delete:true})
  }

  toggleActive(item:any,event?:Event) {
    if(event){
      event.stopPropagation();
      event.preventDefault();
    }
    this.fire.collection('mailflow').doc(item.id).update({
      active: !item.active,
      updated_by:this.auth.userInfo.displayName,
      updated:new Date()
    });
  }

  startMailFlow(){
    this.toast.show('Dit is voor test doeleinden en doet nu even niets.');
    return
    this.functions.httpsCallable('testMailFlow')({ days: 1 }).pipe(take(1)).subscribe((response:any)=>{
      console.log('Mail flow started:', response);
    });
  }

  toggleExclude(item:any, field:string, event?:Event) {
    if(event){
      event.stopPropagation();
      event.preventDefault();
    }
    item.exclude[field] = !item.exclude[field];
    this.fire.collection('mailflow').doc(item.id).update({
      exclude: item.exclude,
      updated_by:this.auth.userInfo.displayName,
      updated:new Date()
    });
  }

  get allFlows() {
    let flows:any[] = [];
    this.allMails.forEach((mail:any) => {
      if (!flows.includes(mail.flow)) {
        flows.push(mail.flow);
      }
    });
    return flows.sort();
  }


  toggleFlow(flow:string){
    if(this.selectedFlows.includes(flow)){
      this.selectedFlows = []
    }
    else{
      this.selectedFlows = [flow]
    }
  }

  flowSelected(flow:string){
    return this.selectedFlows.includes(flow)
  }

  hasAnyExcludeFilter(): boolean {
    return Object.values(this.excludeFilter).some(v => v);
  }

  resetExcludeFilters() {
    this.excludeKeys.forEach(key => this.excludeFilter[key] = false);
    this.updateFilteredMails();
  }

  updateFilteredMails() {
    if (!this.hasAnyExcludeFilter()) {
      this.filteredMails = this.allMails;
      return;
    }

    this.filteredMails = this.allMails.filter(mail => {
      if (!mail.exclude) return false;

      // Check of mail voldoet aan alle actieve filters
      return this.excludeKeys.every(key => {
        return !this.excludeFilter[key] || mail.exclude[key];
      });
    });
  }

  convertContent(content:any){
    if(!content){return ''}
    let html = ''
    html = html += `<div class="headerDefault" style="width:100%;text-align:center;padding-bottom:20px;"><img src="https://www.alicialabs.com/wp-content/uploads/2025/01/logo_full_black_sm.png" alt="Alicialabs Logo" style="max-width:200px;"/></div>`;

    for(let item of content){
      if(item.type=='text'){
        let text = item.value.replace(/\n/g, '<br/>');
        html = html += `<p style="font-size:${item.fontSize || '14px'};padding-left:${item.marginLeft || '0px'};padding-right:${item.marginRight || '0px'};padding-top:${item.marginTop || '0px'};padding-bottom:${item.marginBottom || '0px'};font-size:${item.fontSize || '14p'};font-weight:${item.fontWeight || 400};text-align:${item.alignment || 'left'}">${text}</p>`;
      }
      if(item.type=='button'){
        html = html += `<div style="width:100%;text-align:${item.alignment || 'left'};padding-top:${item.marginTop || '0px'};padding-bottom:${item.marginBottom || '0px'};padding-left:${item.marginLeft || '0px'};padding-right:${item.marginRight || '0px'};"><a href="${item.url}" target="_blank" style="text-decoration:none;display:inline-block;padding:5px 8px;background-color:${item.backgroundColor || '#2b6cf5'};color:${item.color || '#fff'};border-radius:${item.borderRadius || '0px'};font-weight:500;text-transform:uppercase;padding-left:${item.paddingLeft || '14px'};padding-right:${item.paddingRight || '14px'};padding-top:${item.paddingTop || '8px'};padding-bottom:${item.paddingBottom || '8px'};">${item.text}</a></div>`
      }
      if(item.type=='image'){
        html = html += `<div class="iets" style="width:100%;text-align:${item.alignment || 'left'};padding-left:${item.marginLeft || '0px'}; padding-right:${item.marginRight || '0px'}; padding-top:${item.marginTop || '0px'}; padding-bottom:${item.marginBottom || '0px'};">${item.url ? `<a href="${item.url}" target="_blank" style="text-decoration:none;">` : ''}<img src="${item.src}" style="max-width:100%;border-radius:${item.borderRadius || '0px'};height:${item.height || 'auto'};" />${item.url ? `</a>` : ''}</div>`;
      }
      if(item.type=='spacer'){
        html = html += `<div style="width:100%;height:${item.height || '20px'};"></div>`;
      }
      if(item.type=='divider'){
        html = html += `<div style="width:100%;padding-left:${item.marginLeft || '0px'}; padding-right:${item.marginRight || '0px'}; margin-top:${item.marginTop || '15px'}; margin-bottom:${item.marginBottom || '15px'};"><div style="width:100%;border-top:1px solid #ccc;height:1px"></div></div>`;
      }

      if(item.type==='caseCard'){
        html += this.renderCaseCard(item);
      }
        // <ion-card noPadding pointer fullheight class="caseItem" [ngStyle]="{'box-shadow':shadow ? '0 0 7px rgba(0, 0, 0, 0.3)' : 'none'}">
        //   <ion-card-content noPadding fullHeight>
        //       <div backgroundImage class="avatarImage" *ngIf="item.photo" [ngStyle]="{'background-image': 'url(' + item.photo + ')'}"></div>
        //       <div backgroundImage class="avatarImage" *ngIf="!item.photo" [ngStyle]="{'background-image': 'url(assets/img/default_avatar.png)'}"></div>
        //       <div flex center center-ver center-hor style="height:calc(100% - 275px)">
        //           <ion-card-header>
        //               <ion-card-title font-18 weight600>{{title ? title : caseItem.title}}</ion-card-title>
        //               <ion-card-subtitle font-14 weight400>{{userInfo ? userInfo.substring(0, 60) + (userInfo.length > 60 ? '...' : '') : caseItem.user_info.substring(0, 60) + (caseItem.user_info.length > 60 ? '...' : '')}}</ion-card-subtitle>
        //           </ion-card-header>
        //       </div>
        //       <div center flex center-ver center-hor>
        //           <ion-button class="saveButton cardButton" fill="outline" size="small">{{buttonText ? buttonText : (caseItem.buttonText || translate.instant('cases.start_conversation'))}}</ion-button>
        //       </div>
        //   </ion-card-content>
        // </ion-card>


      if (item.type === 'table' && item.data) {
        // console.log('Generating table:', item);
        html += `<table style="width:100%;border-spacing:0;border-collapse:collapse;"><tr>`;

        for (let i=0; i < Object.keys(item.data).length; i++) {
          let columnItems = item.data[i];
          html += `<td style="vertical-align:top;padding:0 10px;width:50%;">`;

          for (let colItem of columnItems) {
            if (colItem.type === 'text') {
              const text = (colItem.value || '').replace(/\n/g, '<br/>');
              html += `<p style="font-size:${colItem.fontSize || '14px'};padding-left:${colItem.marginLeft || '0px'};padding-right:${colItem.marginRight || '0px'};padding-top:${colItem.marginTop || '0px'};padding-bottom:${colItem.marginBottom || '0px'};font-weight:${colItem.fontWeight || 400};text-align:${colItem.alignment || 'left'}">${text}</p>`;
            }

            if (colItem.type === 'button') {
              html += `<div style="width:100%;text-align:${colItem.alignment || 'center'};padding-top:${item.marginTop || '0px'};padding-bottom:${item.marginBottom || '0px'};padding-left:${item.marginLeft || '0px'};padding-right:${item.marginRight || '0px'};"><a href="${colItem.url}" target="_blank" style="text-decoration:none;display:inline-block;padding:5px 8px;background-color:${colItem.backgroundColor || '#2b6cf5'};color:${colItem.color || '#fff'};border-radius:${colItem.borderRadius || '0px'};;font-weight:500;text-transform:uppercase;padding-left:${item.paddingLeft || '14px'};padding-right:${item.paddingRight || '14px'};padding-top:${item.paddingTop || '8px'};padding-bottom:${item.paddingBottom || '8px'};">${colItem.text || 'Klik hier'}</a></div>`;
            }

            if (colItem.type === 'image') {
              html += `<div style="width:100%;text-align:${colItem.alignment || 'left'};padding-left:${colItem.marginLeft || '0px'};padding-right:${colItem.marginRight || '0px'};padding-top:${colItem.marginTop || '0px'};padding-bottom:${colItem.marginBottom || '0px'};">${colItem.url ? `<a href="${colItem.url}" target="_blank" style="text-decoration:none;">` : ''}<img src="${colItem.src}" style="max-width:100%;border-radius:${colItem.borderRadius || '0px'};height:${colItem.height || 'auto'};" />${colItem.url ? `</a>` : ''}</div>`;
            }

            if (colItem.type === 'divider') {
              html += `<div style="width:100%;margin-top:${colItem.marginTop || '15px'};margin-bottom:${colItem.marginBottom || '15px'};"><div style="width:100%;border-top:1px solid #ccc;height:1px"></div></div>`;
            }

            if (colItem.type === 'spacer') {
              html += `<div style="width:100%;height:${colItem.height || '20px'};"></div>`;
            }

            if(colItem.type==='caseCard'){
              html += this.renderCaseCard(colItem);
            }
          }

          html += `</td>`;
        }

        html += `</tr></table>`;
      }
    }

    html = html += `<div style="margin-top:20px; padding-top:10px; font-size:12px; color:#888;text-align:center;">
      <p>&copy; ${new Date().getFullYear()} ${this.translate.instant('mails.footer_reserved')}</p>
      <p>${this.translate.instant('mails.footer_visit_website')}</p>
      <p>${this.translate.instant('mails.footer_text')}</p>
    </div>`;

    return html
  }

  renderCaseCard(item: any): string {
    const title = item.title || 'Gesprekstitel';
    const userInfo = (item.userInfo || '').substring(0, 60) + ((item.userInfo || '').length > 60 ? '...' : '');
    const photo = item.src || 'https://conversations.alicialabs.com/assets/img/default_avatar.png'; // fallback image
    const buttonText = item.buttonText || 'Start gesprek';
    const url = item.url || 'https://conversations.alicialabs.com/start';

    return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 400px; margin: auto; border-radius: 24px; overflow: hidden; border: 1px solid #e0e0e0;">
      <tr>
        <td style="padding: 0;border-top: 1px solid #ccc;border-left: 1px solid #ccc;border-right: 1px solid #ccc;border-top-left-radius: 24px;border-top-right-radius: 24px;display: block">
          <img src="${photo}" width="100%" height="200" style="display: block; object-fit: cover;" alt="gesprek afbeelding" />
        </td>
      </tr>
      <tr>
        <td style="padding: 24px; text-align: center;border-bottom: 1px solid #ccc;border-left: 1px solid #ccc;border-right: 1px solid #ccc;border-bottom-left-radius: 24px;border-bottom-right-radius: 24px;display: block">
          <h2 style="margin: 0 0 12px; font-size: 18px; color: #002244; font-weight: 600;">${title}</h2>
          <p style="margin: 0 0 24px; font-size: 14px; color: #666;">${userInfo}</p>
          <a href="${url}" target="_blank" style="display: inline-block; padding: 12px 32px; border-radius: 38px; border: 2px solid #2b6cf5; color: #2b6cf5; text-decoration: none; font-weight: 600; font-size: 16px;">
            ${buttonText}
          </a>
        </td>
      </tr>
    </table>
    `.trim();
  }

}
