import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cleanReaction'
})
export class CleanReactionPipe implements PipeTransform {

  transform(value: string, ...args: any[]): string {
    if(!value){
      return '';
    }
    if(!value.includes('reaction:')){
      return this.clearStringChars(value);
    }
    let tempValue = value.split(', reaction:')
    tempValue.splice(0,1)
    return this.clearStringChars(tempValue.join(', reaction:'))


  }

  clearStringChars(input: string) {
    return input
    .trim()
    .replace(/^({+)/, '')   // begin-accolades strippen
    .replace(/(}+):?$/, ''); // eind-accolades (en optionele dubbelepunt) strippen
    // return input.split('{').join('').split('}').join('')
  }
}

