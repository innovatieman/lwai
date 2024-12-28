import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent  implements OnInit {
  @Input() full:boolean = false
  constructor() { }

  ngOnInit() {}

}
