import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatAiText',
  standalone: false
})
export class FormatAiTextPipe implements PipeTransform {

  transform(value: string, html?: boolean): string {
    if (!value) return '';

    return value
    // Genummerde koppen op aparte regels, met witregels erboven en eronder
    .replace(/(?:\r?\n)?(\d\.\s\*\*.*?\*\*)(?!\s*-)/g, '\n\n$1\n')
    // Vetgedrukte tekst -> HOOFDLETTERS
    .replace(/\*\*(.*?)\*\*/g, (_, p1) => p1.toUpperCase())
    // Cursieve bullets -> "-   bullettekst"
    .replace(/\* (.*?)\n/g, "-   $1\n")
    .replace(/\* (.*?)$/g, "-   $1")
    // Voeg witregel toe NA elke genummerde sectie (optioneel, alleen als geen bullet volgt)
    .replace(/(-.*?)\n(?=\d\.)/g, '$1\n')
    // Voeg witregel toe ná het laatste bulletblok
    .replace(/(-.*?)\n(?=\S)/g, '$1\n')
    // Verwijder overgebleven sterretjes (voor de zekerheid)
    .replace(/\*/g, '')
    // Verwijder dubbele spaties (optioneel)
    .replace(/ +/g, ' ')
    // Trim de uiteindes
    .replace(/\n/g, (html ? '<br>' : '\n'))
    .trim();

  }

}
