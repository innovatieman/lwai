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

  @Output() pathSelected = new EventEmitter<string[]>();
  @Output() itemSelected = new EventEmitter<any>();
  @Input() child!: boolean;

  constructor(
    public icon: IconsService
  ) { }


  isOpen(): boolean {
    return this.openPathIds.includes(this.item.id);
  }

  toggle(item?: any) {
    if(item?.items){
      if (this.isOpen()) {
          let newPath = [...this.path];
          newPath.pop();
          this.pathSelected.emit(newPath);
      } else {
        this.pathSelected.emit(this.path); // dit pad open
      }
      this.itemSelected.emit(item);
    }
    else{
      console.log(item)
      this.itemSelected.emit(item);
    }
  }

  onChildSelected(childPath: string[]) {
    this.pathSelected.emit(childPath);
  }

  onItemSelected(path: string[], item: any) {
    console.log(path, item);
    try{
      this.itemSelected.emit({ path: path, item: item });
    }
    catch(e){
      console.error(e);
    }
  }
  
  buildChildPath(subId: string): string[] {
    return [...this.path, subId];
  }

}
