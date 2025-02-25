import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'searchMany',
})
export class SearchManyPipe implements PipeTransform {

  transform(value: any[],filter:string, subList?:string, field?:string): any {
    if(!value) return []
    if(!filter) return value
    let nwValue:any = []
    filter = filter.toLowerCase()
    if(subList) {
      value.forEach((item) => {
        if(item[subList]) {
          let subItems = item[subList]
          let subItemsFiltered = subItems.filter((subItem:any) => {
            if(field) {
              return subItem[field].toLowerCase().includes(filter)
            } else {
              return subItem.toLowerCase().includes(filter)
            }
          })
          if(subItemsFiltered.length) {
            nwValue.push({ ...item, [subList]: subItemsFiltered })
          }
        }
      })
      return nwValue
    } 
    else {
      return value.filter((item) => {
        if(field) {
          return item[field].toLowerCase().includes(filter)
        } else {
          return item.toLowerCase().includes(filter)
        }
      })
    }

  }

}
