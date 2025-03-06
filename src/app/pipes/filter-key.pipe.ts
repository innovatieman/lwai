import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment' 
@Pipe({
  name: 'filterKey'
})
export class FilterKeyPipe implements PipeTransform {
  
  transform(array: any[], key:string,value:any, format?:string,moreDays?:number): any {
    if(!moreDays){moreDays=0}
    if(!array||!key){
      return []
    }

    if(!value&&value!==0&&value!==false){return array}
      // console.log(array,key,value)
    let nwArr=[]
    for(let i=0;i<array.length;i++){
      if(typeof value=='string'|| typeof value=='boolean' || typeof value=='number'){        
        if(value=='empty'){
          if(key.indexOf('.')>-1){
            let keys=key.split('.')
            if(!array[i][keys[0]][keys[1]]){
              nwArr.push(array[i])
            }
          }
          else if(!array[i][key]){
            nwArr.push(array[i])
          }
        }
        else if(value=='notEmpty'){
          if(key.indexOf('.')>-1){
            let keys=key.split('.')
            if(array[i][keys[0]][keys[1]]){
              nwArr.push(array[i])
            }
          }
          else if(array[i][key]){
            nwArr.push(array[i])
          }
        }
        else if(value=='afterToday'){
          if(!format){
            format = 'YYYY-MM-DD'
          }
          if(format=='unix'){
            if(key.indexOf('.')>-1){
              let keys=key.split('.')
              if(array[i][keys[0]][keys[1]]&&moment.unix(array[i][keys[0]][keys[1]]).isAfter(moment().subtract(moreDays+ 1,'days'))){
                nwArr.push(array[i])
              }
            }
            
            else if(array[i][key]&&moment.unix(array[i][key]).isAfter(moment().subtract(moreDays+ 1,'days'))||!array[i][key]){
              nwArr.push(array[i])
            }
          }
          else{
            if(key.indexOf('.')>-1){
              let keys=key.split('.')
              if(array[i][keys[0]][keys[1]]&&moment(array[i][keys[0]][keys[1]],format).isAfter(moment().subtract(moreDays+ 1,'days'))){
                nwArr.push(array[i])
              }
            }
            
            else if(array[i][key]&&moment(array[i][key],format).isAfter(moment().subtract(moreDays+ 1,'days'))||!array[i][key]){
              // console.log(moment().subtract('300 days'))
              nwArr.push(array[i])
            }
          }
        }
        else if(value=='beforeToday'){
          if(!format){
            format = 'YYYY-MM-DD'
          }
          if(format=='unix'){
            if(key.indexOf('.')>-1){
              let keys=key.split('.')
              if(array[i][keys[0]][keys[1]]&&moment.unix(array[i][keys[0]][keys[1]]).isBefore(moment())){
                nwArr.push(array[i])
              }
            }
            
            else if(array[i][key]&&moment.unix(array[i][key]).isBefore(moment())){
              nwArr.push(array[i])
            }
          }
          else{
            if(key.indexOf('.')>-1){
              let keys=key.split('.')
              if(array[i][keys[0]][keys[1]]&&moment(array[i][keys[0]][keys[1]],format).isBefore(moment())){
                nwArr.push(array[i])
              }
            }
            
            else if(array[i][key]&&moment(array[i][key],format).isBefore(moment())){
              nwArr.push(array[i])
            }
          }
        }
        else if(key.substring(0,1)=='!'){
          if(key.indexOf('.')>-1){
            let keys=key.split('.')
            if(array[i][keys[0].substring(1)][keys[1]]!=value){
              nwArr.push(array[i])
            }
          }
          else if(array[i][key.substring(1)]!=value){
            nwArr.push(array[i])
          }
        }
        else{
          if(key.indexOf('.')>-1){
            let keys=key.split('.')
            if(array[i][keys[0]][keys[1]]==value){
              nwArr.push(array[i])
            }
          }
          else if(array[i][key]==value){
            nwArr.push(array[i])
          }
        }
      }
      else{
        if(value.length<1){
          return array
        }
        if(key.substring(0,1)=='!'){
          if(key.indexOf('.')>-1){
            let keys=key.split('.')
              if(value.indexOf(array[i][keys[0]][keys[1]])==-1){
                nwArr.push(array[i])
              }
            // if(array[i][keys[0]][keys[1]]!=value.substring(1)){
            //   nwArr.push(array[i])
            // }
          }
          // else if(array[i][key]!=value.substring(1)){
          else if(value.indexOf(array[i][key.substring(1)])==-1){
            nwArr.push(array[i])
          }
        }
        else{

          if(typeof array[i][key]=='string'|| typeof array[i][key]=='boolean' || typeof array[i][key]=='number'){
            // console.log(typeof array[i][key],array[i][key])
            if(key.indexOf('.')>-1){
              let keys=key.split('.')
              if(value.indexOf(array[i][keys[0]][keys[1]])>-1){
                nwArr.push(array[i])
              }
            }
            else if(value.indexOf(array[i][key])>-1){
              // console.log(array[i])

              nwArr.push(array[i])
            }
          }
          else{
            if(key.indexOf('.')>-1){
              let keys=key.split('.')
              for(let j=0;j<array[i][keys[0]][keys[1]].length;j++){
                if(value.indexOf(array[i][keys[0]][keys[1]][j])>-1 || array[i][keys[0]][keys[1]][j] =='all'){
                  nwArr.push(array[i])
                }
              }
            }
            else{
              console.log(array,i,key)
              for(let j=0;j<array[i][key].length;j++){
                if(value.indexOf(array[i][key][j])>-1 || array[i][key][j]=='all'){
                  nwArr.push(array[i])
                }
              }
            }
          }

        }
      }
    }
    return nwArr

  }

}
