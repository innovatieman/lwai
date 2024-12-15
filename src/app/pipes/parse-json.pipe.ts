import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'parseJSON',
})
export class ParseJSONPipe implements PipeTransform {

  transform(value: string): any {
    try{
      return JSON.parse(value);
    }
    catch(e){
      return value;
    }
  }

}
