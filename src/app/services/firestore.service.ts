import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument, USE_EMULATOR} from '@angular/fire/compat/firestore';
import {arrayUnion,arrayRemove} from 'firebase/firestore'
import { AngularFireAnalytics } from '@angular/fire/compat/analytics';
import { map } from 'rxjs/operators';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  constructor(
    private fire:AngularFirestore,
    public analytics:AngularFireAnalytics,
    private toast:ToastService
  ) { }

  create(collection:string,data:any,callback?:any){
    return this.fire.collection(collection).add(data)
    .then(response=> {
      if(callback!=undefined){
        callback(response)
      }
    })
    .catch(err => console.log(err, 'You do not have access! - '+collection))
  }

  createSub(collection:string,doc:string,subcollection:string,data:any,callback?:any){
    return this.fire.collection(collection).doc(doc).collection(subcollection).add(data)
    .then(response=> {
      if(callback!=undefined){
        callback(response)
      }
    })
    .catch(err => console.log(err, 'You do not have access!  - '+collection + ' => '+doc+' => ' + subcollection))
  }

  createSubSub(collection:string,doc:string,subcollection:string,subDoc:string,subSubcollection:string,data:any,callback?:any){
    return this.fire.collection(collection).doc(doc).collection(subcollection).doc(subDoc).collection(subSubcollection).add(data)
    .then(response=> {
      if(callback!=undefined){
        callback(response)
      }
    })
    .catch(err => console.log(err, 'You do not have access!  - '+collection + ' => '+doc+' => ' + subcollection + ' => ' + subDoc + ' => ' + subSubcollection))
  }
  
  createSubSubAsync(
    collection: string,
    doc: string,
    subcollection: string,
    subDoc: string,
    subSubcollection: string,
    data: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.createSubSub(
        collection,
        doc,
        subcollection,
        subDoc,
        subSubcollection,
        data,
        (res: any) => resolve(res)  // geef het response object terug
      );
    });
  }

  setSub(collection:string,doc:string,subcollection:string,id:string,data:any,field?:string,callback?:any,isArrayOnPurpose?:boolean){
    if(data&&data.constructor&&data.constructor.toString().indexOf("Array") != -1&&!isArrayOnPurpose){
      let obj:any = {}
      for (let i=0;i<data.length;i++) {
        obj[i] = data[i]
      }
      data = JSON.parse(JSON.stringify(obj))
    }
    if(field){
      let obj:any = {}
      obj[field] = data
      return this.fire.collection(collection).doc(doc).collection(subcollection).doc(id).update(obj)
      .then(_=> {
      })
      .catch(err => console.log(err, 'You do not have access!'))
    }
    return this.fire.collection(collection).doc(doc).collection(subcollection).doc(id).set(data)
    .then(_=> {
    })
    .catch(err => console.log(err, 'You do not have access!  - '+collection + ' => '+doc+' => ' + subcollection))
  }

  setSubSub(collection:string,doc:string,subcollection:string,subDoc:string,subSubcollection:string,id:string,data:any,field?:string,callback?:any,isArrayOnPurpose?:boolean){
    if(data&&data.constructor&&data.constructor.toString().indexOf("Array") != -1&&!isArrayOnPurpose){
      let obj:any = {}
      for (let i=0;i<data.length;i++) {
        obj[i] = data[i]
      }
      data = JSON.parse(JSON.stringify(obj))
    }
    if(field){
      let obj:any = {}
      obj[field] = data
      return this.fire.collection(collection).doc(doc).collection(subcollection).doc(subDoc).collection(subSubcollection).doc(id).update(obj)
      .then(_=> {
      })
      .catch(err => console.log(err, 'You do not have access!'))
    }
    return this.fire.collection(collection).doc(doc).collection(subcollection).doc(subDoc).collection(subSubcollection).doc(id).set(data)
    .then(_=> {
    })
    .catch(err => console.log(err, 'You do not have access!  - '+collection + ' => '+doc+' => ' + subcollection + ' => ' + subDoc + ' => ' + subSubcollection))
  }

  set(collection:string,id:string,data:any,field?:string,isArrayOnPurpose?:boolean,source?:string,callback?:any){
    if(data&&data.constructor&&data.constructor.toString().indexOf("Array") != -1&&!isArrayOnPurpose){
      let obj:any = {}
      for (let i=0;i<data.length;i++) {
        obj[i] = data[i]
      }
      data = JSON.parse(JSON.stringify(obj))
    }
    if(field){
      let obj:any = {}
      obj[field] = data
      return this.fire.doc(collection+'/'+id).update(obj)
      .then(_=> {
      })
      .catch(err => {
        console.log(err, 'You do not have access!')
        if(callback){
          callback()
        }
      })
    }
    return this.fire.doc(collection+'/'+id).set(data)
    .then(_=> {
    })
    .catch(err => console.log(err, 'You do not have access!'))
  }


  update(collection:string,id:string,obj:any){
    return this.fire.doc(collection+'/'+id).update(obj)
    .then(_=> {
    })
    .catch(err => console.log(err, 'You do not have access1! - '+collection + ' => '+id))
  }

  updateSub(collection:string,doc:string,subcollection:string,subDoc:string,obj:any,errorCallback?:any){
 //  console.log("collection: ", collection);
    return this.fire.doc(collection+'/'+doc+'/'+subcollection+'/'+subDoc).update(obj)
    .then(_=> {
    })
    .catch(err => {
      if(errorCallback){
        errorCallback()
      }
      else{
      }
    })
  }

  updateSubSub(collection:string,doc:string,subcollection:string,subDoc:string,subSubcollection:string,subSubDoc:string,obj:any,errorCallback?:any){
    return this.fire.doc(collection+'/'+doc+'/'+subcollection+'/'+subDoc+'/'+subSubcollection+'/'+subSubDoc).update(obj)
    .then(_=> {
    })
    .catch(err => {
      if(errorCallback){
        errorCallback()
      }
      else{
      }
    })
  }

  setDeep(collection:string,layers:string[],value:any){
    let obj:any = {}
    obj[layers[layers.length-1]] = value

    let deep = ''
    for (let i=0;i<layers.length-1;i++) {
      deep = deep + '/' + layers[i]
    }
    return this.fire.doc(collection+deep).update(obj)
      .then(_=> {
        // this.toast.show('Gegevens opgeslagen')
      })
      .catch(err => console.log(err, 'You do not have access!'))
  }


  addToArray(collection:string,id:string,data:any,field:string,subField?:string,errorCallback?:any){
    let obj:any = {}
      if(!subField){
        obj[field] = arrayUnion(data)
      }
      else{
        obj[field] = {}
        obj[field][subField] = arrayUnion(data)
      }
      return this.fire.doc(collection+'/'+id).update(obj)
      .then(_=> {
      })
      .catch(err => {
        if(errorCallback){
              errorCallback(err)
        }
      })
  }
  addToArraySub(collection:string,id:string,subCollection:string,subId:string,data:any,field:string,subField?:string){
    let obj:any = {}
    if(!subField){
      obj[field] = arrayUnion(data)
    }
    else{
      obj[field] = {}
      obj[field][subField] = arrayUnion(data)
    }
    return this.fire.doc(collection+'/'+id+"/"+subCollection+'/'+subId).update(obj)
    .then(_=> {
    })
    .catch(err => console.log(err, 'You do not have access!'))
}
  
  removeFromArray(collection:string,id:string,data:any,field:string){
    let obj:any = {}
    obj[field] = arrayRemove(data)
    return this.fire.doc(collection+'/'+id).update(obj)
    .then(_=> {
    })
    .catch(err => console.log(err, 'You do not have access!'))
  }

  removeFromArraySub(collection:string,doc:string,subcollection:string,id:string,data:any,field:string){
    let obj:any = {}
    obj[field] = arrayRemove(data)
    return this.fire.doc(collection+'/'+doc+'/'+subcollection+'/'+id).update(obj)
    .then(_=> {
    })
    .catch(err => console.log(err, 'You do not have access!'))
  }

  get(collection:string,limit?:number){
    if(collection.substring(0,9)=='undefined'){
      collection = collection.split('undefined_').join('')
    }
    if(limit){
      return this.fire.collection(collection,ref=>ref.limit(limit)).snapshotChanges()
    }
    else{
      return this.fire.collection(collection).snapshotChanges()
    }
  }

  observe(collection:string){
    return this.fire.collection(collection)
  }

  query(collection:string,where:string,key:any,operator?:any){
    if(!operator){
      operator='=='
    }
    return this.fire.collection(collection,ref => ref.where(where,operator,key)).snapshotChanges()
  }

  queryDouble(collection:string,where:string,key:any,operator:any='==',where2:string,key2:any,operator2:any='=='){
    return this.fire.collection(collection,ref => ref.where(where,operator,key).where(where2,operator2,key2)).snapshotChanges()
  }

  queryGet(collection:string,where:string,key:any,operator?:any,limit?:number,orderBy?:boolean){
    if(!operator){
      operator='=='
    }
    if(limit){
      if(orderBy){
        return this.fire.collection(collection,ref => ref.orderBy(key).limit(limit)).get()
      }
      return this.fire.collection(collection,ref => ref.where(where,operator,key).limit(limit)).get()
    }
    return this.fire.collection(collection,ref => ref.where(where,operator,key)).get()
  }


  querySub(collection:string,doc:string,subcollection:string,where:string,key:any,operator?:any){
    if(!operator){
      operator='=='
    }
    return this.fire.collection(collection).doc(doc).collection(subcollection ,ref => ref.where(where,operator,key)).snapshotChanges()
  }

  querySubSub(collection:string,doc:string,subcollection:string,subDoc:string,subSubCollection:string,where:string,key:any,operator?:any){
      if(!operator){
        operator='=='
      }
      return this.fire.collection(collection).doc(doc).collection(subcollection).doc(subDoc).collection(subSubCollection ,ref => ref.where(where,operator,key)).snapshotChanges()
  }

  querySubMultiple(collection:string,doc:string,subcollection:string,where:string,value1:any,operator1:any,operator2:any,value2:any){
    return this.fire.collection(collection).doc(doc).collection(subcollection,ref => ref.where(where,operator1,value1).where(where,operator2,value2)).snapshotChanges()
  }

  getSub(collection:string,doc:string,subcollection:string){
    return this.fire.collection(collection).doc(doc).collection(subcollection).snapshotChanges()
  }

  getSubSub(collection:string,doc:string,subcollection:string,subDoc:string,subSubCollection:string){
    return this.fire.collection(collection).doc(doc).collection(subcollection).doc(subDoc).collection(subSubCollection).snapshotChanges()
  }

  getSubDoc(collection:string,doc:string,subcollection:string,subDoc:string){
    return this.fire.collection(collection).doc(doc).collection(subcollection).doc(subDoc).snapshotChanges()
  }
  getSubSubDoc(collection:string,doc:string,subcollection:string,subDoc:string,subSubCollection:string,subSubDoc:string){
    return this.fire.collection(collection).doc(doc).collection(subcollection).doc(subDoc).collection(subSubCollection).doc(subSubDoc).snapshotChanges()
  }
  queryMultiple(collection:string,where:string,array:any,operator?:any){
    if(!operator){operator="in"}
    return this.fire.collection(collection, ref => ref.where(where,operator,array)).snapshotChanges()
  }


  getDoc(collection:string,doc:string){
    return this.fire.collection(collection).doc(doc).snapshotChanges()
  }
  getDocListen(collection:string,doc:string){
    return this.fire.collection(collection).doc(doc).valueChanges()
  }
  delete(collection:string,id:string,field?:string){
    return this.fire.doc(collection+'/'+id).delete()
    .then(_=> {
    })
    .catch(err => console.log(err, 'You do not have access!'))
  }

  deleteSub(collection:string,doc:string,subcollection:string,subDoc:string){
    return this.fire.doc(collection+'/'+doc+'/'+subcollection+'/'+subDoc).delete()
    .then(_=> {
    })
    .catch(err => console.log(err, 'You do not have access!'))
  }

  deleteSubSub(collection:string,doc:string,subcollection:string,subDoc:string,subSubcollection:string,subSubDoc:string){
    return this.fire.doc(collection+'/'+doc+'/'+subcollection+'/'+subDoc+'/'+subSubcollection+'/'+subSubDoc).delete()
    .then(_=> {
    })
    .catch(err => console.log(err, 'You do not have access!'))
  }

  sizeDoc(collection:string,id:string){
    const snapshot = this.fire
      .collection(collection)
      .doc(id)
      .get().subscribe(result=>{
        let data = result.data()
      })
  }
  sizeSubDoc(collection:string,id:string,subcollection:string,subId:string){
    const snapshot = this.fire
      .collection(collection)
      .doc(id)
      .collection(subcollection)
      .doc(subId)
      .get().subscribe(result=>{
        let data = result.data()
      })
  }


  async getLength(collection:string,callback:any){
    return this.fire.collection(collection).get().toPromise().then((querySnapshot) => {
      callback(querySnapshot?.size);
    });
  }
  
  async getDocIds(collection:string){
    let docs = await this.fire.collection(collection).get().toPromise()
    if(!docs||docs.empty){
      return []
    }
    return docs.docs.map(doc => doc.id)
  }


  async getCollectionGroup(collection:string,callback:any){
    await this.fire.collectionGroup(collection).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data:any = a.payload.doc.data();
        const id = a.payload.doc.id;
        let type_client = ''
        let client_id = ''
        if(a.payload.doc.ref.parent.parent){
          type_client = a.payload.doc.ref.parent.parent.parent.id;
        }
        if(a.payload.doc.ref.parent.parent){
          client_id = a.payload.doc.ref.parent.parent.id;
        }
        return { id, client_id, type_client, ...data };
      }))
    )
    .subscribe((res)=>{
      callback(res)
    })
  }

  backup(collection:string,agent:string,data:any){

    let backupData = {
      content: data,
      timestamp: new Date().getTime()
    }

    return this.fire.collection('backups').doc(collection).collection(agent).add(backupData)
    .then(response=> {
      this.toast.show('Backup gemaakt')
    })
    .catch(err => console.log(err, 'You do not have access!'))
  }


}
