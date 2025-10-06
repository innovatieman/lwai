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
    // Verwijder '}' als het direct vóór de § staat
    .replace(/}\s*\n?\s*§/g, '')

    // Daarna: vervang overgebleven §
    .replace(/§+/g, '') 

    // Begin-accolades strippen
    .replace(/^({+)/, '')

    // Eind-accolades en optionele dubbelepunt strippen
    .replace(/(}+):?$/, '')
}
}

