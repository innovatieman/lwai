import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cleanReaction'
})
export class CleanReactionPipe implements PipeTransform {

  transform(value: string, ...args: any[]): string {
    if(!value){
      return '';
    }
    
    let tempValue = value.split(', reaction:')
    tempValue.splice(0,1)
    return this.clearStringChars(tempValue.join(', reaction:'))


  }

  clearStringChars(input: string) {
    return input.split('{').join('').split('}').join('')
  }
}

