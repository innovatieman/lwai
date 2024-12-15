import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sortBy'
})
export class SortByPipe implements PipeTransform {

  transform(value: any[] | null, direction: number, prop?: string,undefinedBottom?:boolean,trigger?:any,copyValue?:boolean): any {  
    if (!value) {  
      return [];  
    }  
    if (!direction || !prop) {  
      return value  
    }  
    if(copyValue){
      value = JSON.parse(JSON.stringify(value))
    }
    if (value!.length > 0) {  
      const _direction = direction,  
        _isArr = Array.isArray(value),  
        _type = typeof value![0],  
        _flag = _isArr && _type === 'object' ? true : _isArr && _type !== 'object' ? false : true;  
      value!.sort((a, b) => {  
        a = _flag ? a[prop] : a;  
        b = _flag ? b[prop] : b;  
        if(undefinedBottom&&a===undefined){
          a = 99999999999 * -direction
        }
        if(undefinedBottom&&b===undefined){
          b = 99999999999 * -direction
        }
        if (typeof a === 'string') {  
          return a > b ? -1 * _direction : 1 * _direction;  
        } else if (typeof a === 'number') {  
          return a - b > 0 ? -1 * _direction : 1 * _direction;  
        }  
        return 0;
      });  
    }  
    return value;  
  }  

}
