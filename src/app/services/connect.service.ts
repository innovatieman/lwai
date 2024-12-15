import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class ConnectService {
  connectUrlApi: string = '';
  constructor(
    private http: HttpClient,
    private functions:AngularFireFunctions
  ) { }

  public get(url:string,callback:any,responseType?:any){
    const token = localStorage.getItem('token');
    let options = {};
    if(token){
      options = {
        headers: new HttpHeaders ().set('Authorization', 'Bearer '+ token),
      };
    }
    return this.http.get(url,options)
    .subscribe(
      (response: any) => {
        // // console.log(response)
        response = response.response;
        callback(response);
      });


  }

  public post(url:string,data:any,callback:any){
    let options = {};
      options = {
        header: new HttpHeaders().set('Content-Type', 'application/json')
      };
      console.log(data)
    return this.http.post(url,data,options)
      .subscribe(
        (response: any) => {
          response = response.response;
          callback(response);
        });
  }

  
  public getLocal(url:string,callback:any){
    const options = {};
    return this.http.get(url,options)
    .subscribe(
      (response: any) => {
        callback(response);
      });


  }

}
