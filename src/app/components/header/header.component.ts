import { ChangeDetectorRef, Component, HostListener, Input, OnInit } from '@angular/core';
import { IconsService } from 'src/app/services/icons.service';
import { MediaService } from 'src/app/services/media.service';
import { NavService } from 'src/app/services/nav.service';
import { MenuPage } from '../menu/menu.page';
import { PopoverController } from '@ionic/angular';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent  implements OnInit {
  // @HostListener('window:resize', ['$event'])
  @Input() title:string = ''
  onResize(){
    this.media.setScreenSize()
    this.ref.detectChanges()
  }
  constructor(
    public nav:NavService,
    // public auth:AuthService,
    public icon:IconsService,
    public media:MediaService,
    private ref:ChangeDetectorRef,
    private popoverController:PopoverController
  ) { }

  ngOnInit() {}


  shortMenu:any
  async showshortMenu(event:any){
    this.shortMenu = await this.popoverController.create({
      component: MenuPage,
      componentProps:{},
      cssClass: 'shortMenu',
      event: event,
      translucent: false,
      reference:'trigger',
    });
    await this.shortMenu.present();
  }

}
