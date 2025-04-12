import admin from '../firebase'
import * as functions from 'firebase-functions/v1';
import moment from 'moment'
import * as responder from '../utils/responder'

exports.log = functions.region('europe-west1').https.onCall((data,context)=>{
    let logItem:any = data
    if(context?.auth?.uid){
      logItem.user = context.auth.uid
    }
    if(context?.rawRequest?.ip){
      logItem.ip = context?.rawRequest?.ip
    }
    return logEvent(logItem)
    .then(()=>{
      return new responder.Message('logged')
    })
    .catch(err=>{
      return new responder.Message(err,500)
    })
})

exports.logDeletedUser = functions.region('europe-west1').auth.user().onDelete((user) => {
  return logEvent({
    event:'deleteUser',
    uid:user.uid,
    email:user.email
  })
});


exports.createdUser = functions.region('europe-west1').auth.user().onCreate((user) => {
  return logEvent({
    event:'createUser',
    uid:user.uid,
    email:user.email
  })
});

function logEvent(event:any){
  return admin.firestore().collection('logging').add({
    timestamp: moment().unix(),
    log:event
  })
  .then(response=>{
    return response
  })
  .catch(err=>{
    return err
  })
}

export class Logging {
  constructor(name:string,data:any,context:any){
    let logItem:any = data
    logItem.name = name
    if(context?.auth?.uid){
      logItem.user = context.auth.uid
    }
    return logEvent(logItem)
  }
}
