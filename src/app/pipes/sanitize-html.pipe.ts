import { Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
  name: 'sanitizeHtml'
})
export class SanitizeHtmlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) { }
  transform(value: any,type?:string): any {
    if(!type||type=="html"){
      return this.sanitizer.bypassSecurityTrustHtml(value);
    }
    if(type=="style"){
      // console.log(this.sanitizer.bypassSecurityTrustStyle(value))
      return this.sanitizer.bypassSecurityTrustStyle("url('"+value+"')")
    }
    if(type=="url"){
      // console.log(value)

      return this.sanitizer.bypassSecurityTrustUrl(value)
    }
    if(type=="urlResource"){
      // console.log(value)

      return this.sanitizer.bypassSecurityTrustResourceUrl(value)
    }
  }
}