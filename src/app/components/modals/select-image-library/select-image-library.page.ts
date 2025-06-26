import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { FirestoreService } from 'src/app/services/firestore.service';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';
import { SelectItemPage } from '../select-item/select-item.page';
import { FilterKeyPipe } from 'src/app/pipes/filter-key.pipe';

@Component({
  selector: 'app-select-image-library',
  templateUrl: './select-image-library.page.html',
  styleUrls: ['./select-image-library.page.scss'],
})
export class SelectImageLibraryPage implements OnInit {
  @Input() properties:any = {}
  images:any = []
  selectedImage:any = null
  maxItems:number = 60
  start:number = 0
  end:number = this.maxItems
  filterOptions:any = {}
  filter:any = {
    age:[],
    emotion:[],
    ethnicity:[],
    gender:[],
    occupation:[],
    style:[],
    occupationCategory:[],
    type:[]
  }
  hideFilters:boolean = false
  constructor(
    private firestore:FirestoreService,
    public media:MediaService,
    public modalController:ModalController,
    public icon:IconsService,
    private FilterKeyPipe:FilterKeyPipe
  ) { }

  ngOnInit() {
    this.loadImages()
  }

  loadImages(){
    this.firestore.get('avatars').subscribe((images:any)=>{
      this.images = images.map((e:any) => {
        let img = e.payload.doc.data()
        img.id = e.payload.doc.id
        return img
      })
      // console.log(this.images)
      this.getFilterOptions()
      if(this.properties && this.properties.type){
        this.filter.type = [this.properties.type]
        this.hideFilters = true
      }
    })
  }

  select(image:any){
    this.modalController.dismiss(image)
  }

  clearFilter(event:Event,type:string){
    event.preventDefault()
    event.stopPropagation()
    if(type=='all'){
      this.filter = {
        age:[],
        emotion:[],
        ethnicity:[],
        gender:[],
        occupation:[],
        style:[],
        occupationCategory:[]
      }
    }
    else{
      this.filter[type] = []
    }
    this.start = 0
    this.end = this.maxItems
    this.getFilterOptions()

  }

  public async selectFilter(type:string){
    let obj:any = {
      extraData:{multiple:true,field:'value',object:true},
    }
    let list:any = []
    for(let option of this.filterOptions[type]){
      list.push({value:option})
      if(this.filter[type].includes(option)){
        list[list.length-1].selected = true
      }
    }
    obj.list = list
    const modalItem = await this.modalController.create({
      component:SelectItemPage,
      componentProps:{
        text:obj.text,
        list:obj.list,
        iconList:obj.iconList,
        title:obj.title,
        extraData:obj.extraData
      },
      cssClass:'listModal',
    })
    modalItem.onWillDismiss().then(result=>{
      console.log(result)
      if(result.data){
        this.filter[type] = []
        for(let item of result.data){
          this.filter[type].push(item.value)
        }
        this.start = 0
        this.end = this.maxItems
        this.getFilterOptions(type)
      }
    })
    return await modalItem.present()
  }

  getFilterOptions(type?:string){
    let options = ['age','emotion','ethnicity','gender','occupation','style','occupationCategory','type']
    this.filterOptions = {}
    for(let image of this.filterImagesByAllFilterKeys()){
      for(let option of options){
        if(!this.filterOptions[option]){
          this.filterOptions[option] = []
        }
        if(!image[option]){
          image[option] = 'unknown'
        }
        if(image[option] && !this.filterOptions[option].includes(image[option])){
          this.filterOptions[option].push(image[option])
        }
      }
    }
    if(type){
      this.filterOptions[type] = []
      for(let image of this.images){
          if(!image[type]){
            image[type] = 'unknown'
          }
          if(image[type] && !this.filterOptions[type].includes(image[type])){
            this.filterOptions[type].push(image[type])
          }
      }
    }
    // console.log(this.filterOptions)

  }

  filterImagesByAllFilterKeys(){
    let images = this.images
    for(let key of Object.keys(this.filter)){
      images = this.FilterKeyPipe.transform(images,key,this.filter[key])
    }
    return images
  }



}
