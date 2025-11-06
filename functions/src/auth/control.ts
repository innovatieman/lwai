import * as functions from 'firebase-functions/v1';
import admin from '../firebase'
import * as logging from '../logging/events'
import * as responder from '../utils/responder'
import { UserRecord } from 'firebase-functions/v1/auth';
const { onCall, CallableRequest } = require("firebase-functions/v2/https");
import type { CallableRequest } from 'firebase-functions/lib/common/providers/https';


exports.setRole = functions.region('europe-west1').https.onCall((data,context)=>{
    if(context.auth?.token.admin!==true){
        new logging.Logging('setRole',data,context)
        return new responder.Message('not authorized',403)
    }
    return setRole(data.email,data.role).then(()=>{
        return new responder.Message(data.role+' saved')
    })

})

exports.confirmEmail = functions.region('europe-west1').https.onCall(async(data,context)=>{
    const user = await admin.firestore().collection('users').doc(context.auth?.uid).get()
    if(!user.exists){
        return new responder.Message('Admin not found',404)
    }
    const userData = user.data()
    if(!userData?.isAdmin){
        return new responder.Message('Not authorized',403)
    }
    return admin.auth().getUserByEmail(data.email)
    .then(user=>{
        return admin.auth().updateUser(user.uid,{emailVerified:true})
    })
})

exports.deleteUsers = onCall(
    {
      region: 'europe-west1',
      memory: '1GiB',
    },
    async (request: CallableRequest<any>) => {
      
      const { auth, data } = request;
      if (!auth.uid) {
        return new responder.Message('Unauthorized', 401);
      }

      let userDoc = await admin.firestore().collection('users').doc(auth.uid).get();
      if(!userDoc.exists){
        return new responder.Message('User not found', 404);
      }
      let userData:any = userDoc.data();
      if(!userData.isAdmin){
        return new responder.Message('Forbidden', 403);
      } 
        if(data.email){
            return admin.auth().getUserByEmail(data.email)
            .then(user=>{
                return admin.auth().deleteUser(user.uid)
            })
        }
        else if(data.uid){
            return admin.auth().deleteUser(data.uid)
        }
        return new responder.Message('no email or uid',404)
    }
)

exports.removeRole = functions.region('europe-west1').https.onCall((data,context)=>{
    if(context.auth?.token.admin!==true){
        new logging.Logging('removeRole',data,context)
        return new responder.Message('not authorized',403)
    }
    return removeRole(data.email,data.role).then(()=>{
        return new responder.Message(data.role+' removed')
    })
})

async function removeRole(email:string,role:string):Promise<void>{
    const user = await admin.auth().getUserByEmail(email)
    if(user.customClaims && (user.customClaims as any)[role]===true ){
        let roleObj:any = {}
        roleObj[role] = false
        return admin.auth().setCustomUserClaims(user.uid,roleObj)
    }
    return
}

async function setRole(email:string,role:string):Promise<void>{
    const user = await admin.auth().getUserByEmail(email)
    if(user.customClaims && (user.customClaims as any)[role]===true ){
        return
    }
    let roleObj:any = {}
    roleObj[role] = true
    return admin.auth().setCustomUserClaims(user.uid,roleObj)
}

exports.getUserNameByEmail = functions.region('europe-west1').https.onCall(async(data,context)=>{
    const user = await admin.firestore().collection('users').doc(context.auth?.uid).get()
    if(!user.exists){
        return new responder.Message('Admin not found',404)
    }
    const userData = user.data()
    if(!userData?.isAdmin){
        return new responder.Message('Not authorized',403)
    }
    
    return getUserByEmail(data.email).then((user:any)=>{
        return new responder.Message(user)
    })
})

exports.getUserActivityByEmail = functions.region('europe-west1').https.onCall((data,context)=>{
    return getUserLastLoginByEmail(data.email).then((user:any)=>{
        return new responder.Message(user)
    })
})

async function getUserByEmail(email:string){
    try{
        const user = await admin.auth().getUserByEmail(email)
        return {
            displayName:user.displayName,
            email:user.email,
            created:user.metadata.creationTime,
        }
    }
    catch(err){
        return null
    }
}

async function getUserLastLoginByEmail(email:string){
    try{
        const user = await admin.auth().getUserByEmail(email)
        return user.metadata.lastSignInTime
    }
    catch(err){
        return null
    }
}

exports.setVerified = functions.region('europe-west1').https.onCall((data,context)=>{
    if(context.auth?.token.admin!==true){
        new logging.Logging('setVerified',data,context)
        return new responder.Message('not authorized',403)
    }
 //   console.log('verify '+ data.email)
    return setVerified(data.email)
    .then(result=>{
        if(result){
            return new responder.Message('email verified',200)
        }
        return new responder.Message('Not a user',200)

    })
    .catch(err=>{
        return new responder.Message([err,data.email],200)
    })
})

async function setVerified(email:string){
    const user:UserRecord = await admin.auth().getUserByEmail(email)
    if(user){
     //   console.log('user found: '+ user.uid)
        return admin.auth().updateUser(user.uid,{emailVerified:true})
    }
    return null
}