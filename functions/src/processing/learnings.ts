import * as functions from 'firebase-functions/v1';
import admin from '../firebase'
// import * as moment from 'moment'
import * as responder from '../utils/responder'

exports.processLearnings = functions.region('europe-west1').https.onCall(async (data,context)=>{
    const uid = context.auth?.uid

    if(!uid){
        return new responder.Message('Not authorized', 500);
    }

    if(!data.learnings){
        return new responder.Message('No learnings provided', 400);
    }

    let learningsUser:any = {
        useful:data.learnings.useful || '',
        futureLearnings:data.learnings.futureLearnings || '',
        timestamp:Date.now()
    }
    if(data.learnings.caseId){
        learningsUser.caseId = data.learnings.caseId
    }
    if(learningsUser.futureLearnings || learningsUser.useful){
        await admin.firestore().collection('users').doc(uid).collection('learnings').add(learningsUser)
    }

    if(data.learnings.nps){
        const nps = {
            nps:data.learnings.nps,
            timestamp:Date.now(),
            user:context.auth?.uid
        }
        await admin.firestore().collection('nps').add(nps)
    }

    if(data.learnings.realism){
        let realism:any = {
            realism:data.learnings.realism,
            addition:data.learnings.addition || '',
            timestamp:Date.now(),
            user:context.auth?.uid
        }
        if(data.learnings.caseId){
            realism.caseId = data.learnings.caseId
        }
        await admin.firestore().collection('realism_rating').add(realism)
    }
  
    return new responder.Message('Success', 200);
})