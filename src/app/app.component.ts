import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToggleConsoleService } from './services/toggle-console.service';
import { environment } from 'src/environments/environment';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { ToastController } from '@ionic/angular';
import { NavService } from './services/nav.service';
import { fromEvent, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AngularFireAuth } from '@angular/fire/compat/auth';

const originalSetTimeout = window.setTimeout;

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  private resizeSubscription: Subscription | undefined;
  constructor(
    private translate: TranslateService,
    private toggleConsole:ToggleConsoleService,
    private swUpdate: SwUpdate,
    private toastController: ToastController,
    private nav:NavService,
    private afAuth:AngularFireAuth
  ) {
    this.setRealViewportHeight();

    if(localStorage.getItem('streamCase')){
      this.logout('stream-case/finished')
      return
    }

    // window.addEventListener('resize', this.setRealViewportHeight);

    this.resizeSubscription = fromEvent(window, 'resize')
    .pipe(debounceTime(200))
    .subscribe(() => {
      this.setRealViewportHeight();
    });



    if(!environment.log_on){
      this.toggleConsole.disableConsole();
    }
    this.nav.setLang()

    this.listenForUpdates();

    this.nav.renewPWA.subscribe(()=>{
      this.swUpdate.activateUpdate().then(() => {
        console.log('Update activated, reloading...');
        setTimeout(() => {
          document.location.reload();
        }, 2000);
      });
    })
  }


  async logout(location?:any,stream?:boolean): Promise<void> {
    if(!location){
      location = '/login';
    }
    try {
      await this.afAuth.signOut();
      if(localStorage.getItem('streamCase') || stream){
        localStorage.removeItem('streamCase')
      }
      this.nav.go(location);
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }


  setRealViewportHeight() {

    
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
  
  async listenForUpdates() {
    if (!this.swUpdate.isEnabled) {
      // console.log('Service Worker updates are not enabled.');
      return;
    }

    this.swUpdate.versionUpdates.subscribe(async (event: VersionEvent) => {
      if (event.type === 'VERSION_READY') {
        console.log('New update available:', event);
        const toast = await this.toastController.create({
          message: 'New update available! Reloading...',
          duration: 5000,
          position: 'bottom',
          color: 'primary',
        });
        await toast.present();

        // Activate the update and reload
        this.swUpdate.activateUpdate().then(() => {
          console.log('Update activated, reloading...');
          setTimeout(() => {
            document.location.reload();
          }, 2000);
        });
      }
    });
  }

}
  