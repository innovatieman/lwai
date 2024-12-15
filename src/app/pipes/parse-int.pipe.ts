import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'parseInt'
})
export class ParseIntPipe implements PipeTransform {

  transform(value: string,): unknown {
    if(!value){return 0};
    if(isNaN(Number(value))){return 0}
    return Number(value)
  }

}
