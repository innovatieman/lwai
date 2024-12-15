import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'maxLength'
})
export class MaxLengthPipe implements PipeTransform {

  transform(value: any, max?:any,ellipses?:boolean): unknown {
    if(!value||!max){return value};
    // let nwArr:any[] = JSON.parse(JSON.stringify(value))
    if(typeof value === 'string'){
      if(value.length<=max){return value}
      if(ellipses){
        return value.substring(0,max)+'...'
      }
      return value.substring(0,max)
    }
    return value.splice(0,max)
  }

}
