import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private userInfo:any = {
    name: 'Mark',
    avatar: 'Marky',
    level: 'Beginner',
    displayName: ' Mark'
  }
  constructor() { }

  public basic(){
    return this.userInfo
  }

  setUser(user:any){
    this.userInfo = user;
  }

  editUser(){
    return this.userInfo
  }
}
