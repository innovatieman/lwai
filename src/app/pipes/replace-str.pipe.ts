import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'replaceStr'
})
export class ReplaceStrPipe implements PipeTransform {

  transform(value: string, needle:string,replaceWith:string): any {
    if(!value){return null};
    if(!needle||!replaceWith){return value}
    let nwValue = value.split(needle).join(replaceWith)
    return nwValue 
  }

}
