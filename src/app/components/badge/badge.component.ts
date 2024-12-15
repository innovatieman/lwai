import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-badge',
  templateUrl: './badge.component.html',
  styleUrls: ['./badge.component.scss'],
})
export class BadgeComponent  implements OnInit {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() class: string = '';
  constructor() { }

  ngOnInit() {}

}
