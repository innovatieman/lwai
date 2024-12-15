import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'arrayItem'
})
export class ArrayItemPipe implements PipeTransform {

  transform(value: any[], index:number,key?:string): any {
    if(!value||index===undefined){return null};
    let nwValue = value[index]
    if(key){
      nwValue = nwValue[key]
    }
    return nwValue

  }

}
