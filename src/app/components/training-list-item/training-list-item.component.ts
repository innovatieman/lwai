import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IconsService } from 'src/app/services/icons.service';

@Component({
  selector: 'app-training-list-item',
  templateUrl: './training-list-item.component.html',
  styleUrls: ['./training-list-item.component.scss'],
})
export class TrainingListItemComponent {
  @Input() item!: any;
  @Input() openPathIds: string[] = [];
  @Input() path: string[] = [];
  @Input() active: boolean = false;
  @Input() finished: boolean = false;
  @Input() itemMenuIsFinished!: (itemId: string) => boolean; // ⬅️ voeg dit toe
  @Input() itemMenuIsActive!: (itemId: string) => boolean; // ⬅️ voeg dit toe

  @Output() pathSelected = new EventEmitter<string[]>();
  @Output() itemSelected = new EventEmitter<any>();
  @Input() child!: boolean;

  constructor(
    public icon: IconsService,
  ) { }


  isOpen(): boolean {
    return this.openPathIds.includes(this.item.id);
  }

  toggle(event:Event,item?: any) {
    event.stopPropagation();
    if(item?.items){
      if (this.isOpen()) {
          let newPath = [...this.path];
          newPath.pop();
          this.pathSelected.emit(newPath);
      } else {
        this.pathSelected.emit(this.path);
      }
    }
    else{
      // this.itemSelected.emit(item);
      this.itemSelected.emit({
        item: this.resolveDeepItem(item),
        path: this.path
      });
    }
  }

  onChildSelected(childPath: string[]) {
    this.pathSelected.emit(childPath);
  }

  resolveDeepItem(item: any): any {
    while (item?.item) {
      item = item.item;
    }
    return item;
  }

  lengthTree:number=0;
  onItemSelected(path: string[], item: any) {
    try{
      console.log({
        path: path,
        item: this.resolveDeepItem(item)
     });
     this.itemSelected.emit({
        path: path,
        item: this.resolveDeepItem(item)
     });

    }
    catch(e){
      console.error(e);
    }
  }
  
  buildChildPath(subId: string): string[] {
    return [...this.path, subId];
  }

}
