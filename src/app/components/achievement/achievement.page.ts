import { Component, Input, OnInit } from '@angular/core';
import { IconsService } from 'src/app/services/icons.service';

@Component({
  selector: 'app-achievement',
  templateUrl: './achievement.page.html',
  styleUrls: ['./achievement.page.scss'],
})
export class AchievementPage implements OnInit {
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
