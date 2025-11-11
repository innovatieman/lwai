const { onCall, CallableRequest } = require("firebase-functions/v2/https");
import type { CallableRequest } from 'firebase-functions/lib/common/providers/https';

import * as functions from 'firebase-functions/v1';
import admin, { db } from '../firebase'
import moment from 'moment'
import * as responder from '../utils/responder'

exports.startStreaming = onCall(
    {
      region: 'europe-west1',
      memory: '1GiB',
    },
    async (request: CallableRequest<any>) => {

      let data:any = request.data;

    // Check if the user is authenticated
    console.log('start streaming request',JSON.stringify(data));
    let encryptedData = atob(data.stream);
    try{
        data = JSON.parse(encryptedData);
    } catch (error) {
        return new responder.Message('Invalid data format', 400);
    }

    console.log('Decrypted stream data:', JSON.stringify(data));
    // Validate input data
    if (!data.trainerId || !data.trainingId || !data.caseId) {
      return new responder.Message('Trainer ID and Training ID are required', 400);
    }

    // Check if the user has permission to create an elearning
    const trainerDoc = await db.collection('trainers').doc(data.trainerId).get();
    if (!trainerDoc.exists) {
      return new responder.Message('trainer does not exist', 403);
    }

    // Check if the training exists
    const trainingDoc = await db.collection('trainers').doc(data.trainerId).collection('trainings').doc(data.trainingId).get();
    if (!trainingDoc.exists) {
      return new responder.Message('Training does not exist', 404);
    } 

    const creditsRef = db.collection('trainers').doc(data.trainerId).collection('trainings').doc(data.trainingId).collection('credits');
    const creditsSnapshot = await creditsRef.get();
    let totalCredits = 0;
    creditsSnapshot.forEach(doc => {
      const creditData:any = doc.data();
      totalCredits += creditData.total || 0;
    });
    let onlyTest:boolean = false;
    if(totalCredits <= 0){
      return new responder.Message('Not enough credits to start streaming', 403);
    }
    if(totalCredits < 160){
      onlyTest = true;
    }

    


    let trainingData:any = trainingDoc.data();
    if (!trainingData || !trainingData.published || trainingData.publishType != 'stream') {
      return new responder.Message('Training data is not available', 404);
    }

    if(!trainingData.streamAllowedOrigins || !Array.isArray(trainingData.streamAllowedOrigins) || trainingData.streamAllowedOrigins.length == 0){
      trainingData.streamAllowedOrigins = ['*'];
      // return new responder.Message('No allowed origins configured', 403);
    }

    let originToCheck = data.parentOrigin || '';
    console.log('Origin to check:', originToCheck);


    if(originToCheck && trainingData.streamAllowedOrigins.indexOf(originToCheck) == -1 && trainingData.streamAllowedOrigins[0] != '*'){
      console.log('Origin not allowed:', originToCheck);
      return new responder.Message('Origin not allowed: ' + originToCheck, 403);
    }

    // Check if the case exists


    const caseDoc = await db.collection('trainers').doc(data.trainerId).collection('trainings').doc(data.trainingId).collection('items').doc(data.caseId).get();
    if (!caseDoc.exists) {
      return new responder.Message('Case does not exist', 404);
    } 
    let caseData:any = caseDoc.data();
    

    caseData.stream=true;
    caseData.trainerId = data.trainerId;
    caseData.trainingId = data.trainingId;
    caseData.logo = trainerDoc.data()?.logo || null;
    caseData.onlyTest = onlyTest;
    caseData.startingCredits = totalCredits;


    const user = await createTempUser(data.caseId);
    
    return { user, case: caseData };

  })



async function createTempUser(caseId:string) {

  const randomPassword = Math.random().toString(36).slice(-8);
  const newUser = await admin.auth().createUser({
      email: `stream_${caseId}_${Date.now()}@alicialabs.com`,
      emailVerified: true,
      password: randomPassword,
      displayName: 'User'
  });

  await admin.firestore().collection('users').doc(newUser.uid).set(
      {
          language: 'nl',
          email: newUser.email,
          displayName: newUser.displayName,
          registeredAt: admin.firestore.FieldValue.serverTimestamp(),
          isConfirmed: true,
          isAdmin:false,
          tempuser: true,
          filter:{
              subjects:[],
              subjectTypes:[],
              types:[],
          }
      }
  );

  admin.firestore()
  .collection("users")
  .doc(newUser.uid)
  .collection("subscriptions")
  .add({
      type: "basic",
      period: "unlimited",
      startDate: admin.firestore.Timestamp.now(),
      endDate: admin.firestore.Timestamp.fromDate(
          new Date(admin.firestore.Timestamp.now().toDate().getTime() + 7 * 24 * 60 * 60 * 1000 * 52 * 100)
      ),
      status: "active",
  });

  admin.firestore()
  .collection("users")
  .doc(newUser.uid)
  .collection("credits")
  .doc('credits').set({
      total: 0,
      amount: 0,
      lastUpdated: admin.firestore.Timestamp.now(),
      added:moment().unix(),
      created:moment().unix(),
      expires:moment().add(1,'year').unix(),
  });

  admin.firestore()
  .collection("users")
  .doc(newUser.uid)
  .collection("skills")
  .doc('skills').set({
      impact: {
          score: 40,
          prevScore:40
      },
      flow: {
          score: 40,
          prevScore:40
      },
      logic: {
          score: 40,
          prevScore:40
      }
  });


  const token = await admin.auth().createCustomToken(newUser.uid);



  return { uid: newUser.uid, email: newUser.email, token };
}

exports.deleteTempUserManual = onCall(
    {
      region: 'europe-west1',
      memory: '1GiB',
    },
    async (request: CallableRequest<any>) => {
      
      const { auth } = request;
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
      await deleteOldTempUsers();

      return new responder.Message('Temp users deleted', 200);

    })

exports.deleteTempUser = functions.region('europe-west1')
  .runWith({ memory: '1GB' })
  .pubsub.schedule('15 4 * * *') // Elke dag om 04:15 uur
  .timeZone('Europe/Amsterdam')
  .onRun(async (context) => {

    await deleteOldTempUsers();

    return null;

  }); 

  async function deleteOldTempUsers() {

     // Zoek alle gebruikers aan die eerder dan gisteren zijn aangemaakt en tempuser zijn
    const tempUsersRef = admin.firestore().collection('users').where('tempuser', '==', true).where('registeredAt', '<=', admin.firestore.Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)));
    const tempUsers = await tempUsersRef.get();

    //delete users
    const deletePromises = tempUsers.docs.map(async (doc) => {
      const userId = doc.id;
      try {
        await admin.auth().deleteUser(userId);
        // console.log(`Deleted user ${userId}`);
      } catch (error) {
        console.error(`Error deleting user ${userId}:`, error);
      }
    });

    await Promise.all(deletePromises);
    return;
  }


  exports.deleteTestUsers = onCall(
    {
      region: 'europe-west1',
      memory: '1GiB',
    },
    async (request: CallableRequest<any>) => {
      
      const { auth } = request;
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

      const matchingUsers: any[] = [];
      let nextPageToken: string | undefined;

      do {
        const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
        listUsersResult.users.forEach((userRecord) => {
          const email = userRecord.email || '';
          if (email.endsWith('@innovatieman.nl')) {
            matchingUsers.push({
              uid: userRecord.uid,
              email: userRecord.email,
            });
          }
        });
        nextPageToken = listUsersResult.pageToken;
      } while (nextPageToken);

      return { count: matchingUsers.length, users: matchingUsers }
    }

  )

  exports.deleteStreamTempUsersOld = onCall(
    {
      region: 'europe-west1',
      memory: '1GiB',
    },
    async (request: CallableRequest<any>) => {
      
      const { auth } = request;
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

      const matchingUsers: any[] = [];
      let nextPageToken: string | undefined;

      do {
        const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
        listUsersResult.users.forEach((userRecord) => {
          const email = userRecord.email || '';
          if (email.startsWith('stream_')) {
            matchingUsers.push({
              uid: userRecord.uid,
              email: userRecord.email,
            });
          }
        });
        nextPageToken = listUsersResult.pageToken;
      } while (nextPageToken);

      return { count: matchingUsers.length, users: matchingUsers }
    }

  )