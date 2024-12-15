import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'nanToZero'
})
export class NanToZeroPipe implements PipeTransform {

  transform(value: any,): any {
    if(!value){return 0};
    if(typeof value == 'number'){
      return value
    } 
    return 0
  }

}
