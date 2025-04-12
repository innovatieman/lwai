import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService } from '../auth/auth.service';
import { FirestoreService } from './firestore.service';
import { TranslateService } from '@ngx-translate/core';
import { combineLatest, map, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BadgesService {
  badges: any[] = [];
  constructor(
    private fire: AngularFirestore,
    private auth: AuthService,
    private firestore: FirestoreService,
    private translate: TranslateService,
  ) { 
    this.loadCases(() => {
      console.log(this.badges);
    });
  }

  loadCases(callback?:Function) {
        const currentLang = this.translate.currentLang || 'en';
        // Query voor cases die toegankelijk zijn voor de gebruiker
        this.fire
          .collection('badges')
          .snapshotChanges()
          .pipe(
            // Map documenten naar objecten
            map(docs =>
              docs.map((e: any) => ({
                id: e.payload.doc.id,
                ...e.payload.doc.data(),
              }))
            ),
            // Haal vertalingen op voor de huidige taal
            switchMap(cases =>
              combineLatest(
                cases.map(doc =>
                  this.fire
                    .collection(`badges/${doc.id}/translations`)
                    .doc(currentLang)
                    .get()
                    .pipe(
                      map(translationDoc => ({
                        ...doc,
                        translation: translationDoc.exists ? translationDoc.data() : null,
                      }))
                    )
                )
              )
            )
          )
          .subscribe(cases => {
            // Combineer hoofdgegevens en vertalingen
            this.badges = cases.map(doc => ({
              ...doc,
              title: doc.translation?.title || doc.title,
              text: doc.translation?.text || doc.text,
            }));
            if (callback) {
              callback();
            }
          });
      }

}


