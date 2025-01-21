import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToggleConsoleService } from './services/toggle-console.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(
    private translate: TranslateService,
    private toggleConsole:ToggleConsoleService,
  ) {
    // this.setRealViewportHeight();
    // window.addEventListener('resize', this.setRealViewportHeight);

    if(!environment.log_on){
      this.toggleConsole.disableConsole();
    }

    this.translate.setDefaultLang('nl');
    this.translate.use('nl');
  }


// setRealViewportHeight() {
//     const vh = window.innerHeight * 0.01;
//     console.log(vh);
//     document.documentElement.style.setProperty('--real-vh', `${vh}px`);
//     console.log(document.documentElement.style.getPropertyValue('--real-vh'));
//   }
  
  // Stel de hoogte in bij het laden van de pagina
  
  
  // Update bij schermresizes
  
}
