import { Injectable } from '@angular/core';
import { combineLatest, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService } from '../auth/auth.service';
import { FirestoreService } from './firestore.service';

@Injectable({
  providedIn: 'root'
})
export class CasesService {
  all:any[] = []
  isAdmin:boolean = false
  constructor(
    private fire:AngularFirestore,
    private auth:AuthService,
    private firestore: FirestoreService
  ) { 
    this.auth.isAdmin().subscribe((admin) => {
      this.isAdmin = admin;
    });
    this.loadCases()
  }

  get conversations(){
    let arr:any[] = []
    this.all.forEach((e:any) => {
      if(arr.indexOf(e.conversation) === -1){
        arr.push(e.conversation)
      }
    })
    return arr
  }

  single(id:string){
    let caseArr = this.all.filter((e:any) => {
      return e.id === id
    })
    return caseArr[0]
  }


  loadCases() {
    const userQuery = this.fire.collection('cases', ref => ref.where('open_to_user', '==', true)).snapshotChanges();
    const publicQuery = this.fire.collection('cases', ref => ref.where('open_to_public', '==', true)).snapshotChanges();
  
    let adminQuery = of([] as any[]);
  
    if (this.isAdmin) {
      adminQuery = this.fire.collection('cases', ref => ref.where('title', '!=', '')).snapshotChanges();
    }
  
    // Combineer alle observables
    combineLatest([userQuery, publicQuery, adminQuery])
      .pipe(
        map(([userDocs, publicDocs, adminDocs]) => {
          const allDocs = [...userDocs, ...publicDocs, ...adminDocs];
  
          // Filter dubbele documenten op ID
          const uniqueDocs = allDocs.reduce((acc: any[], current) => {
            if (!acc.some((doc:any) => doc.payload.doc.id === current.payload.doc.id)) {
              acc.push(current);
            }
            return acc;
          }, []);
  
          return uniqueDocs.map((e:any) => ({
            id: e.payload.doc.id,
            ...e.payload.doc.data(),
          }));
        })
      )
      .subscribe(docs => {
        this.all = docs;
      });
  }


  query(collection:string,where:string,key:any,operator?:any){
    if(!operator){
      operator='=='
    }
    return this.fire.collection(collection,ref => ref.where(where,operator,key)).snapshotChanges()
  }

}
