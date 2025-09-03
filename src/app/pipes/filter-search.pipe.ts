import { Injectable, Pipe, PipeTransform } from '@angular/core';
import * as e from 'cors';

@Pipe({
  name: 'filterSearch'
})
export class FilterSearchPipe implements PipeTransform {
  @Injectable({ providedIn: 'root' })
  transform(value: any,filter:any,exact?:boolean ,fields?:string[],subKey?:string): any {
    if(!value){return null}
    if(filter===''||filter===undefined||(typeof filter!='string'&&filter.length==0)){return value}
    if(typeof filter != 'string'){
      filter = filter.join('$$--$$').toLowerCase()
      filter = filter.split('$$--$$')
    }
    let nwValue = [];
    if(!fields){
      if(!exact){
        for (let i=0;i<value.length;i++) {
          if(typeof filter == 'string'){

            if(typeof value[i] == 'string'){
              if(value[i].toLowerCase().indexOf(filter.toLowerCase())>-1){
                nwValue.push(value[i])
              }
            }
            else{
              if(value[i].title.toLowerCase().indexOf(filter.toLowerCase())>-1||value[i].value.toLowerCase().indexOf(filter.toLowerCase())>-1){
                nwValue.push(value[i])
              }
            }

          }
          else{
            if(filter.indexOf(value[i].toLowerCase())>-1){
              nwValue.push(value[i])
            }
          }
        }
      }
      else{
        for (let i=0;i<value.length;i++) {
          if(typeof filter == 'string'){
            if(value[i].toLowerCase()==filter.toLowerCase()){
              nwValue.push(value[i])
            }
          }
          else{
            if(filter.indexOf(value[i].toLowerCase())>-1){
              nwValue.push(value[i])
            }
          }
        }
      }
    }
    else{
      if(!exact){
        for (let i=0;i<value.length;i++) {
          let valueChecked = false
          for (let f=0;f<fields.length;f++) {
            

            if(typeof filter == 'string'){

              if(fields[f].indexOf('.')>-1){
                let keys=fields[f].split('.')
                if(!subKey||!value[i][subKey]){
                  if(value[i][keys[0]][keys[1]].toString().toLowerCase().indexOf(filter.toLowerCase())>-1&&!valueChecked){
                    nwValue.push(value[i])
                    valueChecked = true
                  }
                }
                else{
                  if(value[i][subKey][keys[0]][keys[1]].toString().toLowerCase().indexOf(filter.toLowerCase())>-1&&!valueChecked){
                    nwValue.push(value[i])
                    valueChecked = true
                  }
                }
              }

              else{
                if(typeof value[i][fields[f]]!='undefined'&&typeof value[i][fields[f]] != 'string'){
                  // console.log(value[i][fields[f]].toString(),filter.toLowerCase(),value[i][fields[f]].toString().indexOf(filter.toLowerCase())>-1,valueChecked)
                  if(!subKey||!value[i][subKey]){
                    if(value[i][fields[f]].toString().indexOf(filter.toLowerCase())>-1&&!valueChecked){
                      nwValue.push(value[i])
                      valueChecked = true
                    }
                  }
                  else{
                    
                    if(value[i][subKey[f]].toString().indexOf(filter.toLowerCase())>-1&&!valueChecked){
                      nwValue.push(value[i])
                      valueChecked = true
                    }
                  }
                }
                else if(typeof value[i][fields[f]]!='undefined' || (subKey && typeof value[i][subKey][fields[f]]!='undefined')){
                  if(!subKey||!value[i][subKey]){
                    if(value[i][fields[f]].toLowerCase().indexOf(filter.toLowerCase())>-1&&!valueChecked){
                      nwValue.push(value[i])
                      valueChecked = true
                    }
                  }
                  else{
                    if(value[i][subKey][fields[f]].toLowerCase().indexOf(filter.toLowerCase())>-1&&!valueChecked){
                      nwValue.push(value[i])
                      valueChecked = true
                    }
                  }
                }
              }
            }
            else{
              // if(value[i][fields[f]]){
              if(!subKey||!value[i][subKey]){
                if(filter.indexOf(value[i][fields[f]].toLowerCase())>-1&&!valueChecked){
                  nwValue.push(value[i])
                  valueChecked = true
                }
              }
              else{
                if(filter.indexOf(value[i][subKey][fields[f]].toLowerCase())>-1&&!valueChecked){
                  nwValue.push(value[i])
                  valueChecked = true
                }
              }
            }
          }
        }
      }
      else{
        for (let i=0;i<value.length;i++) {
          let valueChecked = false
          for (let f=0;f<fields.length;f++) {
            if(typeof filter == 'string'){
              if(!subKey||!value[i][subKey]){
                if(value[i][fields[f]].toLowerCase()===filter.toLowerCase()&&!valueChecked){
                  nwValue.push(value[i])
                  valueChecked = true
                }
              }
              else{
                if(value[i][subKey][fields[f]].toLowerCase()===filter.toLowerCase()&&!valueChecked){
                  nwValue.push(value[i])
                  valueChecked = true
                }
              }
            }
            else{
              if(!subKey||!value[i][subKey]){
              // if(value[i][fields[f]]){
                if(filter.indexOf(value[i][fields[f]].toLowerCase())>-1&&!valueChecked){
                  nwValue.push(value[i])
                  // valueChecked = true
                }
              }
              else{
                if(filter.indexOf(value[i][subKey][fields[f]].toLowerCase())>-1&&!valueChecked){
                  nwValue.push(value[i])
                  // valueChecked = true
                }
              }
            }
          }
        }
      }
    }
    return nwValue
  }

}
