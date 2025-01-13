import { Component, OnInit } from '@angular/core';
import { NavParams } from '@ionic/angular';

@Component({
  selector: 'app-tooltip',
  templateUrl: './tooltip.page.html',
  styleUrls: ['./tooltip.page.scss'],
})
export class TooltipPage implements OnInit {
  text
  constructor(
    private navParams:NavParams,
  ) {
    this.text = this.navParams.get('text')
   }

  ngOnInit() {
  }

}
