import { Injectable } from '@angular/core';
import { NavController } from '@ionic/angular';



@Injectable({
  providedIn: 'root'
})
export class NavService {
  constructor(
    private navController: NavController,
  ) { }

  public go(page: string,backwards?: boolean){
    if(backwards){
      this.navController.navigateBack(page);
    }
    else{
      this.navController.navigateForward(page, {animated: false});
    }

  }
  public back(){
    this.navController.back();
  }

  goto(url: string,newTab?: boolean){
    if(newTab){
      window.open(url,'_blank');
      return;
    }
    else{
      location.href = url;
    }
  }
}
