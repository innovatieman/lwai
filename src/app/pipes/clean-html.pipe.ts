import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cleanHtml'
})
export class CleanHtmlPipe implements PipeTransform {

  transform(value: any, ...args: any[]): any {
    if(!value){return null}
    
    value = value
      .split('</ol><p><br></p><p>').join('</ol>')
      .split('</p><p><br></p><ol>').join('<ol>')
      .split('</ul><p><br></p><p>').join('</ul>')
      .split('</p><p><br></p><ul>').join('<ul>')
      .split('<p><br></p>').join('<br>')
      .split('</p><br><p>').join('<br><br>')
      .split('</p><p>').join('<br>')
      .split('&nbsp;').join(' ')

    return value
  }

}
