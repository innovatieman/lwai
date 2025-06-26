import { ChangeDetectorRef, Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { IonInfiniteScroll, ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { CaseinfoPage } from 'src/app/components/modals/caseinfo/caseinfo.page';
import { FilterSearchPipe } from 'src/app/pipes/filter-search.pipe';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { LevelsService } from 'src/app/services/levels.service';
import { MediaService } from 'src/app/services/media.service';
import { NavService } from 'src/app/services/nav.service';

@Component({
  selector: 'app-cases',
  templateUrl: './cases.page.html',
  styleUrls: ['./cases.page.scss'],
})
export class CasesPage implements OnInit {
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;
    @HostListener('window:resize', ['$event'])
    onResize(){
      this.media.setScreenSize()
      this.rf.detectChanges()
    }
  cases: any[] = [];
  maxCases: number = 15;
  visibleCases: any[] = [];
  showCreateSelf: boolean = false;
  searchTerm: string = '';
  filteredCases: any[] = [];
  casesLoaded: boolean = false;
  height: string = '100vh'
  width: string = '100vw'
  constructor(
    public translate: TranslateService,
    public media:MediaService,
    public nav:NavService,
    private modalController:ModalController,
    public helper:HelpersService,
    public levelService:LevelsService,
    private filterSearchPipe:FilterSearchPipe,
    private rf: ChangeDetectorRef,
    public icon:IconsService

  ) { }

  ngOnInit() {
    this.getCases();
    this.updateVisibleCases();
    this.media.setScreenSize();
    let params:any = location.search;
    if(params){
      params = new URLSearchParams(params);
      if(params.has('create_self')){
        this.showCreateSelf = true;
      }
      if(params.has('search')){
        this.searchTerm = params.get('search') || '';
      }
      // if(params.has('height')){
      //   this.height = params.get('height') || '100vh';
      // }
      // if(params.has('width')){
      //   this.width = params.get('width') || '100vw';
      // }
        
    }

  }

  async getCases() {
    const url = 'https://europe-west1-lwai-3bac8.cloudfunctions.net/loadCasesPublic'
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({lang: this.translate.currentLang || 'en'}),
    });
    if (!response.body) {
      throw new Error("Response body is null");
    }
    if (!response.ok) {
      console.error("Request failed:", response.status, response.statusText);
      return;
    }

    try {
      this.cases = await response.json();
      this.updateVisibleCases();
      
      if (this.infiniteScroll) {
        this.infiniteScroll.disabled = this.cases.length <= this.maxCases;
      }
      
      // 🔁 Check of alles in beeld is en zo ja: laad meer
      this.checkIfScrollNeeded();
      this.casesLoaded = true;
      
    } catch (error) {
      console.error("Error parsing JSON:", error);
    }
  }

  showCaseInfo(item:any){
    this.popupCaseInfo(item,(result:any)=>{
      if(result?.data){
        let redirect = 'start/cases?searchTerm='+item.id
        redirect = encodeURIComponent(redirect);
        window.open('https://conversation.alicialabs.com/login?redirect='+redirect, '_blank');
      }
    })
  }

  attempts: number = 0;
  checkIfScrollNeeded() {
    if (this.attempts >= 2) return; // max 3 pogingen
    this.attempts++;
    setTimeout(() => {
      const content = document.getElementById('mainContent');
      if (!content) return;

      const scrollHeight = content.scrollHeight;
      const clientHeight = content.clientHeight;

      const needsMore = scrollHeight <= clientHeight;

      if (needsMore && this.visibleCases.length < this.filteredCases.length) {
        this.loadMore();
        this.checkIfScrollNeeded(); // blijf herhalen tot genoeg geladen
      }
    }, 100); // wacht even op rendering
  }
  
  updateVisibleCases() {
      // | caseFilter: currentFilterTypes.types : currentFilterTypes.subjectTypes : extraFilters.open_to_user | filterKey : 'level' : currentFilterLevels | filterSearch : searchTerm : false : ['title','tags']
      
      // console.log(this.cases.all)

      const filtered = this.cases
    
      let filteredTypes = []
      for(let i = 0; i < filtered.length; i++){
        if(!this.showCreateSelf){
          filteredTypes.push(filtered[i])
        }
        else if(this.showCreateSelf && filtered[i].create_self){
          filteredTypes.push(filtered[i])
        }
      }

      const searched = this.filterSearchPipe.transform(
        filteredTypes,
        this.searchTerm,
        false,
        ['title','tags','user_info','id']
      );

      
      // console.log('filtered')
      this.filteredCases = searched;
      this.filteredCases = this.filteredCases.sort((a, b) => a.order_rating - b.order_rating);
      this.visibleCases = this.filteredCases.slice(0, this.maxCases);
      if (this.infiniteScroll) {
        this.infiniteScroll.disabled = this.visibleCases.length >= this.filteredCases.length;
      }
      // setTimeout(() => {
      //   if (this.infiniteScroll) {
      //     console.log('update visible cases', this.visibleCases.length, this.filteredCases.length);
      //     this.infiniteScroll.disabled = this.visibleCases.length >= this.filteredCases.length;
      //   }
      // }, 400);

      // setTimeout(() => {
      //   if (this.infiniteScroll) {
      //     console.log('update visible cases', this.visibleCases.length, this.filteredCases.length);
      //     this.infiniteScroll.disabled = this.visibleCases.length >= this.filteredCases.length;
      //   }
      // }, 1000);

      // setTimeout(() => {
      //   if (this.infiniteScroll) {
      //     console.log('update visible cases', this.visibleCases.length, this.filteredCases.length);
      //     this.infiniteScroll.disabled = this.visibleCases.length >= this.filteredCases.length;
      //   }
      // }, 1500);

  }

  loadMore(event?: any) {
    this.maxCases += 15;
    this.visibleCases = this.filteredCases.slice(0, this.maxCases);
  
    if (event) {
      event.target.complete();
    }
  
    if (this.maxCases >= this.filteredCases.length && event) {
      event.target.disabled = true;
    }
  }


  public async popupCaseInfo(caseItem:any,callback?:any){
    caseItem.type='public_case'
      const modalItem = await this.modalController.create({
        component:CaseinfoPage,
        componentProps:{
          caseItem:caseItem,
        },
        backdropDismiss:true,
        cssClass:'infoModal',
      })
      if(callback){
        modalItem.onWillDismiss().then(data=>{
          callback(data)
        })
      }
      return await modalItem.present()
    }

}
