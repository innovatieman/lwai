import { Component, Input, OnInit } from '@angular/core';
import { IconsService } from 'src/app/services/icons.service';

@Component({
  selector: 'app-achievement-horizontal',
  templateUrl: './achievement-horizontal.page.html',
  styleUrls: ['./achievement-horizontal.page.scss'],
})
export class AchievementHorizontalPage implements OnInit {
  @Input() title: string = '';
  @Input() text: string = '';
  @Input() class: string = '';
  @Input() achieved: boolean = false;
  @Input() achievement_icon: string = '';
  constructor(
    public icon:IconsService,
  ) { }

  ngOnInit() {
  }

}