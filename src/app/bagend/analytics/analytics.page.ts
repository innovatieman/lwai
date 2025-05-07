import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.page.html',
  styleUrls: ['./analytics.page.scss'],
})
export class AnalyticsPage implements OnInit {

  constructor(
    private functions: AngularFireFunctions,
  ) { }

  ngOnInit() {
    this.functions.httpsCallable('admin_get_all_offers_from_all_users')({}).subscribe((res:any)=>{
      console.log('res', res);
    })
  }

}
