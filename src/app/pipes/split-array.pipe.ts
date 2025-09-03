import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'splitArray'
})
export class SplitArrayPipe implements PipeTransform {

  transform(value: any, chunks:number,start?:number,end?:number): any {
    if(!value){return null};
    if(!chunks){chunks = 1}

    let chunkMax = Math.ceil(value.length / chunks)


    let nwArray = [],
      i = 0,
      n = value.length;

    while (i < n) {
      nwArray.push(value.slice(i, i += chunkMax));
    }
    // console.log(nwArray)
    if(start!=undefined && end){
      console.log(nwArray.slice(start,end))
      return nwArray.slice(start,end)
    }
    if(start!=undefined){
      return nwArray.slice(start)
    }

    

    return nwArray;



  }

}
