// import { NgModule, isDevMode } from '@angular/core';
// import { BrowserModule } from '@angular/platform-browser';
// import { RouteReuseStrategy } from '@angular/router';

// import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

// import { AppComponent } from './app.component';
// import { AppRoutingModule } from './app-routing.module';
// import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
// import { environment } from 'src/environments/environment';
// import { getAuth, provideAuth } from '@angular/fire/auth';
// import { getFirestore, provideFirestore } from '@angular/fire/firestore';

// @NgModule({
//   declarations: [AppComponent],
//   imports: [
//     BrowserModule,
//     IonicModule.forRoot(),
//     AppRoutingModule,
//     // provideFirebaseApp(() => initializeApp(environment.firebase)),
//     // provideAuth(() => getAuth()),
//     // provideFireStore(() => getFirestore()),
// ],
//   providers: [
//     { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
//     provideFirebaseApp(() => initializeApp(environment.firebase)),
//     provideAuth(() => getAuth()),
//     provideFirestore(() => getFirestore()),],
//   bootstrap: [AppComponent],
// })
// export class AppModule {}










import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import {AngularFirestoreModule} from '@angular/fire/compat/firestore'
import { AngularFireModule } from '@angular/fire/compat';
import {
  AngularFireFunctions,
  AngularFireFunctionsModule, 
  REGION} from '@angular/fire/compat/functions';
import { environment } from 'src/environments/environment';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { MenuPage } from './components/menu/menu.page';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { HttpLoaderFactory } from './components/menu/menu.module';
import { HighchartsChartModule } from 'highcharts-angular';

import { USE_EMULATOR as USE_AUTH_EMULATOR } from '@angular/fire/compat/auth';
import { USE_EMULATOR as USE_FIRESTORE_EMULATOR } from '@angular/fire/compat/firestore';
import { USE_EMULATOR as USE_FUNCTIONS_EMULATOR } from '@angular/fire/compat/functions';
import { provideFirebaseApp, initializeApp, getApp  } from '@angular/fire/app';
import { connectAuthEmulator, getAuth, provideAuth } from '@angular/fire/auth';
import { connectFirestoreEmulator, Firestore, getFirestore, initializeFirestore, provideFirestore } from '@angular/fire/firestore';
import { ConfirmationModalComponent } from './components/modals/confirmation-modal/confirmation-modal.component';
import { InfoModalPageModule } from './components/modals/info-modal/info-modal.module';


@NgModule({
  declarations: [AppComponent,MenuPage,ConfirmationModalComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    HttpClientModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFirestoreModule,
    AngularFireAuthModule,
    AngularFireFunctionsModule,
    FontAwesomeModule,
    HighchartsChartModule,
    InfoModalPageModule,
    TranslateModule.forRoot({
      loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
      }
    }),
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: REGION, useValue: 'europe-west1' },
    { provide: USE_AUTH_EMULATOR, useValue: environment.useEmulators ? ['http://127.0.0.1', 9099] : undefined },
    { provide: USE_FIRESTORE_EMULATOR, useValue: environment.useEmulators ? ['localhost', 8080] : undefined },
    { provide: USE_FUNCTIONS_EMULATOR, useValue: environment.useEmulators ? ['localhost', 5001] : undefined },
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => {
      const auth = getAuth();
      if (environment.useEmulators) {
        connectAuthEmulator(auth, 'http://localhost:9099', {
          disableWarnings: true,
        });
      }
      return auth;
    }),
    provideFirestore(() => 
    {
      let firestore: Firestore;
      if (environment.useEmulators) {
        // Long polling required for Cypress
        firestore = initializeFirestore(getApp(), {
          // experimentalForceLongPolling: true,
        });
        connectFirestoreEmulator(firestore, 'localhost', 8080);
      } else {
        firestore = getFirestore();
      }
      return firestore;
    }),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

