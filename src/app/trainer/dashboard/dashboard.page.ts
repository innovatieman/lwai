import { Component, OnInit } from '@angular/core';
import { NavService } from 'src/app/services/nav.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {

  constructor(
    public nav: NavService,
  ) { }

  ngOnInit() {
  }

}
