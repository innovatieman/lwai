import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent  implements OnInit {
  @Input() full:boolean = false
  @Input() fullXs:boolean = false
  @Input() padding:string = '0px'

  
  
  constructor() { }

  ngOnInit() {}

}
