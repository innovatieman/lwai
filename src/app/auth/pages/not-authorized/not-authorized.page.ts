import { Component, OnInit } from '@angular/core';
import { NavService } from 'src/app/services/nav.service';

@Component({
  selector: 'app-not-authorized',
  templateUrl: './not-authorized.page.html',
  styleUrls: ['./not-authorized.page.scss'],
})
export class NotAuthorizedPage implements OnInit {

  constructor(
    private nav: NavService,
  ) { }

  ngOnInit() {
    setTimeout(() => {
      this.nav.go('login')
    }, 3000);
  }

}
