import { Component, OnInit } from '@angular/core';
import { IconsService } from 'src/app/services/icons.service';
import { NavService } from 'src/app/services/nav.service';

@Component({
  selector: 'app-not-authorized',
  templateUrl: './not-authorized.page.html',
  styleUrls: ['./not-authorized.page.scss'],
})
export class NotAuthorizedPage implements OnInit {

  constructor(
    private nav: NavService,
    public icon:IconsService
  ) { }

  ngOnInit() {
    setTimeout(() => {
      this.nav.go('login')
    }, 3000);
  }

}
