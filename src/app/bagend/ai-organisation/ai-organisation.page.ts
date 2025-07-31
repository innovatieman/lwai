import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute } from '@angular/router';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';
import { NavService } from 'src/app/services/nav.service';

@Component({
  selector: 'app-ai-organisation',
  templateUrl: './ai-organisation.page.html',
  styleUrls: ['./ai-organisation.page.scss'],
})
export class AiOrganisationPage implements OnInit {
  projectId: string | null = null;
  constructor(
    private functions:AngularFireFunctions,
    public nav:NavService,
    public media:MediaService,
    public icon:IconsService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.projectId = params['project_id'];
    });
  }

  createCampaign() {
    const callable = this.functions.httpsCallable('createCampaignGoogleAds');
    callable({name:'test_1',budget:10_000_000 }).subscribe({
      next: (result) => {
        console.log('Campaign created successfully:', result);
      },
      error: (error) => {
        console.error('Error creating campaign:', error);
      }
    });
  }

}
