import admin from '../firebase'
import * as functions from 'firebase-functions/v1';
import * as responder from '../utils/responder'

exports.get_public_info = functions.region('europe-west1').https.onCall((data:any,context:any)=>{
    if(!context.auth){
        return {error:'Not authorized',code:401}
    }
    if(!data.type){
        return new responder.Message('No type provided',400)
    }

    if(data.type=='public_info'){
        if(data.collection&&data.document,data.field){
            return fieldIsAuthorized(data.collection,data.document,data.field)
            .then(async (result)=>{
                if(!result){
                    return new responder.Message('Not authorized',401)
                }
                const docRef = admin.firestore().collection(data.collection).doc(data.document)
                let docData = await docRef.get()
                if(!docData.exists){
                    return new responder.Message('Document not found',404)
                }
                let doc = docData.data()
                if(!doc[data.field]){
                    return new responder.Message('Field not found',404)
                }
                return new responder.Message(doc[data.field])
            })
        }
        else{
            return new responder.Message('No collection, document or field provided',400)
        }
    }
    else{
        return new responder.Message('Type not recognized',400)
    }
})


async function fieldIsAuthorized(collection:string,doc:string,field:string){
    
    const docRef = admin.firestore().collection('public_info').doc(collection)
    const docData = await docRef.get()
    if(!docData.exists){
        return false
    }
    const docFields = docData.data()
    if(docFields?.documents[doc]?.includes(field)){
        return true
    }
    if(docFields?.documents['all']?.includes(field)){
        return true
    }
    return false

}