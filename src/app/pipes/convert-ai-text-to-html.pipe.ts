import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'convertAiTextToHtml',
})
export class ConvertAiTextToHtmlPipe implements PipeTransform {

  transform(inputText: string): string {
    const lines = inputText.split('\n');
  
    let html = '';
    let inList = false;
  
    lines.forEach((line) => {
      const trimmed = line.trim();
  
      if (trimmed.startsWith('*')) {
        if (!inList) {
          html += '<ul>';
          inList = true;
        }
  
        // Haal het sterretje weg
        let content = trimmed.slice(1).trim();
  
        // Match voor vetgedrukte kop gevolgd door dubbele punt
        // Werkt voor zowel **Kop:** als **Kop**:
        const boldMatch = content.match(/^\*\*(.+?)\*\*:?\s*(.*)/);
  
        if (boldMatch) {
          const title = boldMatch[1].trim();
          const rest = boldMatch[2].trim();
          html += `<li><strong>${title}</strong> ${rest}</li>`;
        } else {
          html += `<li>${content}</li>`;
        }
  
      } else if (trimmed === '') {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        html += '<br>';
      } else {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        html += `<p>${trimmed}</p>`;
      }
    });
  
    if (inList) {
      html += '</ul>';
    }
    
    html = html.split('<p>html</p>').join('')
    return html;
  }

}
