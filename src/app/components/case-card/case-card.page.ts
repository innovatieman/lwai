import { Component, Input, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { HelpersService } from 'src/app/services/helpers.service';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';

@Component({
  selector: 'app-case-card',
  templateUrl: './case-card.page.html',
  styleUrls: ['./case-card.page.scss'],
})
export class CaseCardPage implements OnInit {
@Input() caseItem:any = null;
@Input() shadow:boolean = false
  constructor(
    public icon: IconsService,
    public media: MediaService,
    public helper: HelpersService,
    public translate: TranslateService
  ) { }

  ngOnInit() {
  }

}
