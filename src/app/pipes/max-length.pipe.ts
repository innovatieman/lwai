import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'maxLength'
})
export class MaxLengthPipe implements PipeTransform {

  transform(value: any, max?:any,ellipses?:boolean): any {
    if(!value||max===undefined||max===null){return value};
    if(typeof value === 'string'){
      if(value.length<=max){return value}
      if(ellipses){
        return value.substring(0,max)+'...'
      }
      return value.substring(0,max)
    }
    let nwArr:any[] = JSON.parse(JSON.stringify(value))
    return nwArr.splice(0,max)
  }

}
