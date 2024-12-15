import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment'
@Pipe({
  name: 'dateFormat'
})
export class DateFormatPipe implements PipeTransform {
  constructor(
    private translate:TranslateService
  ){}
  transform(date: moment.MomentInput, output?:string, format?:moment.MomentFormatSpecification): any {
    if(!date){return null};
      if(!format){
        format = 'YYYY-MM-DD HH:mm:ss'
      }
      if(!output){
        output = 'shortDate'
      }
      const formats:any={
        longDate:this.translate.instant('date_format_long'),
        longDateTime:this.translate.instant('date_format_longDateTime'),
        shortDate:this.translate.instant('date_format_shortDate'),
        shortDateTime:this.translate.instant('date_format_shortDateTime'),
      }
      if(!formats[output]){
        switch (output) {
          case 'longDate':
            return moment(date, format).locale(this.translate.currentLang).format(formats.longDate);
          case 'longDateTime':
            return moment(date, format).locale(this.translate.currentLang).format(formats.longDateTime);
          case 'shortDate':
            return moment(date, format).locale(this.translate.currentLang).format(formats.shortDate);
          case 'shortDateTime':
            return moment(date, format).locale(this.translate.currentLang).format(formats.shortDateTime);
          default:
            return moment(date, format).locale(this.translate.currentLang).format(format.toString());
        }
      }
      return moment(date,format).locale(this.translate.currentLang).format(formats[output])
  }

}
