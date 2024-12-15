import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'groupBy',
})
export class GroupByPipe implements PipeTransform {
  transform(list: any[], groupKey: string): Record<string, any[]> {
    if (!list) {
      return {};
    }

    // Groepeer cases op categorie
    return list.reduce((result, item) => {
      const category = item[groupKey];
      if (!result[category]) {
        result[category] = [];
      }
      result[category].push(item);
      return result;
    }, {});
  }
}