import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'uniqueArray'
})
export class UniqueArrayPipe implements PipeTransform {

  transform(value: any, key: string): any {
    if(!value||!key){return null};
    let nwArr = [];
    for(let i=0;i<value.length;i++){
      if(nwArr.indexOf(value[i][key])==-1){
        nwArr.push(value[i][key])
      }
    }
    return nwArr
  }

}
