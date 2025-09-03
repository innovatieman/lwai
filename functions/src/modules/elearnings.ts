import * as functions from 'firebase-functions/v1';
import admin, { db } from '../firebase'
import moment from 'moment'
import * as responder from '../utils/responder'

exports.createElearning = functions
  .region('europe-west1')
  .runWith({ memory: '1GB' })
  .https.onCall(async (data, context) => {
    // Check if the user is authenticated
    if (!context.auth) {
      return new responder.Message('User must be authenticated to create an elearning', 401);
    }

    // Validate input data
    if (!data.trainerId || !data.trainingId) {
      return new responder.Message('Trainer ID and Training ID are required', 400);
    }

    // Check if the user has permission to create an elearning
    const trainerDoc = await db.collection('trainers').doc(data.trainerId).get();
    if (!trainerDoc.exists || trainerDoc.data()?.admins?.indexOf(context.auth.uid) === -1) {
      return new responder.Message('User does not have permission to create an elearning', 403);
    }

    // Check if the training exists
    const trainingDoc = await db.collection('trainers').doc(data.trainerId).collection('trainings').doc(data.trainingId).get();
    if (!trainingDoc.exists) {
      return new responder.Message('Training does not exist', 404);
    } 

    let trainingData:any = trainingDoc.data();
    if (!trainingData) {
      return new responder.Message('Training data is not available', 404);
    }
    const trainerData = trainerDoc.data();
    trainingData.trainer = {
        id: data.trainerId,
        name: trainerData.name,
        logo: trainerData.logo ? trainerData.logo : null,
        trainer_details: trainerData.trainer_details || '',

    };

    trainingData.created = Date.now();
    trainingData.originalTrainingId = trainingDoc.id;
    trainingData.publishType = 'elearning';
    trainingData.trainerId = data.trainerId;
    trainingData.status = 'published';
    trainingData.open_to_public = true;
    if(data.open_to_user !== undefined && typeof data.open_to_user === 'boolean') {
      trainingData.open_to_user = data.open_to_user;
    }
    delete trainingData.allowed_domains;
    delete trainingData.max_customers;
    delete trainingData.specialCode;

    const trainingItemsRef = db.collection('trainers').doc(data.trainerId).collection('trainings').doc(data.trainingId).collection('items');
    const trainingItemsSnapshot = await trainingItemsRef.get();
    const trainingItems = trainingItemsSnapshot.docs.map(doc => { return { id: doc.id, ...doc.data() }; });

    // Create a new elearning document in the 'elearnings' collection
    const elearningRef = db.collection('elearnings').doc();
    await elearningRef.set(trainingData);

    // Add training items to the new elearning document
    const batch = db.batch();
    trainingItems.forEach(item => {
      const itemRef = elearningRef.collection('items').doc(item.id);
      batch.set(itemRef, item);
    });

    await batch.commit();

    return new responder.Message({ id: elearningRef.id, message: 'Elearning created successfully' });
  })

// exports.buyElearning = functions.region('europe-west1').runWith({memory:'1GB'}).https.onCall(async (data, context) => {
//     if (!context.auth) {
//       return new responder.Message('Not authorized', 401);
//     }
//     try {
//         const elearningId = data.elearningId;
//         const elearningRef = admin.firestore().collection('elearnings').doc(elearningId);
//         const elearningDoc = await elearningRef.get();
//         const elearningData = elearningDoc.data();
//         if(!elearningData){
//             return new responder.Message('Elearning not found', 404);
//         }
//         const elearningItemsRef = elearningRef.collection('items');
//         const elearningItemsSnapshot = await elearningItemsRef.get();
//         const elearningItems = elearningItemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

//         // Process the elearning items as needed
//         // ...
//         const newTraining = await admin.firestore().collection('users').doc(context.auth.uid).collection('my_elearnings').add({
//             user: context.auth.uid,
//             elearningId: elearningId,
//             startDate: moment().unix(),
//             status: 'active',
//             expires: moment().add(1, 'year').unix(),
//             ...elearningData
//         });
//         // Optionally, you can add the items to the user's elearning
//         const batch = admin.firestore().batch();
//         elearningItems.forEach((item:any) => {
//             item.publishType = 'elearning';
//             const itemRef = admin.firestore().collection('users').doc(context.auth.uid).collection('my_elearnings').doc(newTraining.id).collection('items').doc(item.id);
//             batch.set(itemRef, item);
//         });
//         await batch.commit();

//         return new responder.Message('Elearning purchased successfully', 200);
//     } catch (error) {
//         console.error('Error fetching customer data:', error);
//         return new responder.Message('Error fetching customer data', 500);
//     }     
// });


exports.adjustElearning = functions.region('europe-west1').runWith({memory:'1GB'}).https.onCall(async (data, context) => {
  if (!context.auth) {
    return new responder.Message('Not authorized', 401);
  }
  try {
    const elearningId = data.elearningId;
    const updates = data.updates;
    const items = data.items;
    const deleteItems = data.deleteItems;
    const close = data.close;
    const specialCode = data.specialCode;
    const allowedDomains = data.allowedDomains;
    const max_customers = data.max_customers;
    // console.log('Adjusting elearning:', elearningId, 'with updates:', updates, 'items:', items, 'deleteItems:', deleteItems, 'close:', close, 'specialCode:', specialCode, 'allowedDomains:', allowedDomains, 'max_customers:', max_customers);

    // const elearningRef = doc where originalTrainingId is equal to elearningId
    const elearningRef = admin.firestore().collection('elearnings').where('originalTrainingId', '==', elearningId).limit(1);
    const elearningSnapshot = await elearningRef.get();
    if (elearningSnapshot.empty) {
      return new responder.Message('Elearning not found', 404);
    }

    const elearningDoc = elearningSnapshot.docs[0];
    if (!elearningDoc.exists) {
      return new responder.Message('Elearning not found', 404);
    }
    const elearningData = elearningDoc.data();
    if (!elearningData) {
      return new responder.Message('Elearning data is not available', 404);
    }

    // Check if the user has permission to adjust the elearning
    const trainerDoc = await admin.firestore().collection('trainers').doc(elearningData.trainerId).get();
    if (!trainerDoc.exists || trainerDoc.data()?.admins?.indexOf(context.auth.uid) === -1) {
      return new responder.Message('User does not have permission to adjust this elearning', 403);
    }
    // Validate updates
    if ((!updates || typeof updates !== 'object') && (!data.items || !Array.isArray(data.items)) && (!data.deleteItems || !Array.isArray(data.deleteItems)) && !data.specialCode && !data.close) {
      return new responder.Message('Invalid updates data', 400);
    }
    if(items && Array.isArray(items)) {
      const elearningDocRef = admin.firestore().collection('elearnings').doc(elearningDoc.id).collection('items');
      const batch = admin.firestore().batch();
      items.forEach((item:any) => {
        if(item.id) {
          // Update existing item
          const itemRef = elearningDocRef.doc(item.id);
          batch.set(itemRef, item);
        } else {
          // Add new item
          const newItemRef = elearningDocRef.doc();
          batch.set(newItemRef, item);
        }
      });
      await batch.commit();
    }
    else if(deleteItems && Array.isArray(deleteItems)) {
      // console.log('Deleting items', deleteItems, 'from:', elearningDoc.id);
      const elearningItemsRef = admin.firestore().collection('elearnings').doc(elearningDoc.id).collection('items');
      const batch = admin.firestore().batch();
      deleteItems.forEach((item:any) => {
          // Delete existing item
          // console.log('Deleting item:', item);
          const itemRef = elearningItemsRef.doc(item);
          batch.delete(itemRef);
      });
      await batch.commit();
    }
    else if(specialCode || allowedDomains || max_customers) {
      // Update the special code
      const specialCodeRef = admin.firestore().collection('elearnings').doc(elearningDoc.id).collection('specialcode');
      await specialCodeRef.doc(specialCode).set({ specialCode: specialCode || '', allowedDomains: allowedDomains || '', maxCustomers: max_customers || 0 });
    }
    else if(close && close===true){
      // copy document and sub collections to closed_elearnings collection
      const closedElearningRef = admin.firestore().collection('closed_elearnings').doc();
      await closedElearningRef.set(elearningData);
      const elearningItemsRef = admin.firestore().collection('elearnings').doc(elearningDoc.id).collection('items');
      const elearningItemsSnapshot = await elearningItemsRef.get();
      const elearningItems = elearningItemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const batch = admin.firestore().batch();
      elearningItems.forEach((item:any) => {
          const itemRef = admin.firestore().collection('closed_elearnings').doc(closedElearningRef.id).collection('items').doc(item.id);
          batch.set(itemRef, item);
      });
      await batch.commit();
      // Delete the elearning document
      const elearningDocRef = admin.firestore().collection('elearnings').doc(elearningDoc.id);
      await elearningDocRef.delete();
      // Delete all items in the elearning
      const elearningItemsRefDel = admin.firestore().collection('elearnings').doc(elearningDoc.id).collection('items');
      const elearningItemsSnapshotDel = await elearningItemsRefDel.get();
      const batchDel = admin.firestore().batch();
      elearningItemsSnapshotDel.forEach(doc => {
          batchDel.delete(doc.ref);
      });
      await batchDel.commit();

      const elearningCodesRefDel = admin.firestore().collection('elearnings').doc(elearningDoc.id).collection('specialcode');
      const elearningCodesSnapshotDel = await elearningCodesRefDel.get();
      const batchDelCodes = admin.firestore().batch();
      elearningCodesSnapshotDel.forEach(doc => {
          batchDelCodes.delete(doc.ref);
      });
      await batchDelCodes.commit();
    }
    else{
      // Update the elearning document
      const elearningDocRef = admin.firestore().collection('elearnings').doc(elearningDoc.id);
      await elearningDocRef.update(updates);
    }

    return new responder.Message('Elearning updated successfully', 200);
  } catch (error) {
    console.error('Error updating elearning:', error);
    return new responder.Message('Error updating elearning', 500);
  }
})

exports.elearningCheckSpecialCodes = functions.region('europe-west1').runWith({memory:'1GB'}).https.onCall(async (data, context) => {
  // if (!context.auth) {
  //   return new responder.Message('Not authorized', 401);
  // }
  try {
    const specialCodes = data.specialCodes;
    const elearnings = data.elearnings; // array of elearning ids to check against
    if (!elearnings || !Array.isArray(elearnings) || elearnings.length === 0) {
      return new responder.Message('Invalid elearnings', 400);
    }
    if (!specialCodes || !Array.isArray(specialCodes)) {
      return new responder.Message('Invalid special codes', 400);
    }

    let validCodes:any[] = [];
    for (const elearningId of elearnings) {
      const elearningRef = admin.firestore().collection('elearnings').doc(elearningId);
      const elearningDoc = await elearningRef.get();
      if (!elearningDoc.exists) {
        continue; // Skip if elearning does not exist
      }
      const specialCodeRef = elearningRef.collection('specialcode');
      const specialCodeSnapshot = await specialCodeRef.where('specialCode', 'in', specialCodes).get();
      specialCodeSnapshot.forEach(doc => {
        validCodes.push({ elearningId, specialCode: doc.data().specialCode });
      });
    }
    return new responder.Message({ validCodes }, 200);
  } catch (error) {
    console.error('Error checking special codes:', error);
    return new responder.Message('Error checking special codes', 500);
  }
});

async function hasValidSpecialCode(elearningId:string, specialCode:string,userEmail:string):Promise<boolean>{
  try {

    if (!elearningId || !specialCode) {
      return false;
    }
    const elearningRef = admin.firestore().collection('elearnings').doc(elearningId);
    const elearningDoc = await elearningRef.get();
    if (!elearningDoc.exists) {
      return false; // Skip if elearning does not exist
    }

    const specialCodeRef = elearningRef.collection('specialcode');
    const specialCodeSnapshot = await specialCodeRef.where('specialCode', '==', specialCode).get();
    if(specialCodeSnapshot.empty){
      return false;
    }
    const specialCodeData = specialCodeSnapshot.docs[0].data();
    console.log('Special code data:', specialCodeData, ' with email:', userEmail);
    if(specialCodeData.allowedDomains && userEmail){
      const emailDomain = userEmail.split('@')[1];
      const allowedDomains = specialCodeData.allowedDomains.split(',').map((domain:string) => domain.trim().toLowerCase());
      if(allowedDomains.indexOf(emailDomain.toLowerCase())===-1){
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('Error checking special code:', error);
    return false;
  }
}

async function registerActivation(userId:string, trainingId:string, trainerId:string,specialCode:any,organisation_id?:string){
        const purchase = await admin.firestore().collection('elearning_purchases').add({
            purchased:moment().unix(),
            trainerId,
            userId,
            trainingId,
            status: 'complete',
            price: 0,
            specialCode:specialCode,
            organisationId:organisation_id || null,
        })

        if(organisation_id){
          const org =  await admin.firestore().collection('trainers').doc(organisation_id).get();
          const orgData = org.data()
          if(orgData){
            admin.firestore().collection('trainers').doc(trainerId).collection('purchases').doc(purchase.id).set({
                purchased:moment().unix(),
                trainerId:organisation_id,
                user:{
                    email:orgData.email,
                    displayName:orgData.name
                },
                trainingId,
                status: 'complete',
                price: 0,
                specialCode:specialCode,
                marketplace: false,
                organisation:{
                  id:organisation_id,
                  name:orgData.name
                }
            })
          }
        }
        else{
          const user =  await admin.firestore().collection('users').doc(userId).get();
          const userData = user.data()
          admin.firestore().collection('trainers').doc(trainerId).collection('purchases').doc(purchase.id).set({
              purchased:moment().unix(),
              trainerId,
              user:{
                  email:userData.email,
                  displayName:userData.displayName
              },
              trainingId,
              status: 'complete',
              price: 0,
              specialCode:specialCode,
              marketplace: false,
          })
        }
}

async function maxCustomersReached(elearningId:string):Promise<boolean>{
  try {
    const elearningRef = admin.firestore().collection('elearnings').doc(elearningId);
    const elearningDoc = await elearningRef.get();
    if (!elearningDoc.exists) {
      return false; // Skip if elearning does not exist
    }
    const elearningData = elearningDoc.data();
    if(!elearningData){
      return false;
    }
    const specialCodeRef = elearningRef.collection('specialcode');
    const specialCodeSnapshot = await specialCodeRef.limit(1).get();
    if(specialCodeSnapshot.empty){
      return false;
    }
    const specialCodeData = specialCodeSnapshot.docs[0].data();
    if(specialCodeData.maxCustomers && specialCodeData.maxCustomers>0){
      const customersSnapshot = await admin.firestore().collection('elearning_purchases').where('trainingId', '==', elearningData.originalTrainingId).get();
      if(customersSnapshot.size >= specialCodeData.maxCustomers){
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking max customers:', error);
    return false;
  }
}



exports.activateElearningWithCode = functions.region('europe-west1').runWith({memory:'1GB'}).https.onCall(async (data, context) => {
    if (!context.auth) {
      return new responder.Message('Not authorized', 500);
    }
    if (!data.specialCode || !data.elearningId) {
      return new responder.Message('Special code and elearning ID are required', 404);
    }
    const isValidCode = await hasValidSpecialCode(data.elearningId, data.specialCode,context.auth.token.email);
    if (!isValidCode) {
      return new responder.Message('Invalid special code', 400);
    }

    const reachedMax = await maxCustomersReached(data.elearningId);
    if (reachedMax) {
      return new responder.Message('Maximum number of customers reached for this elearning', 402);
    }

    let connectToOrg = false;

    if(data.organisationId){
      // check if user is part of organisation
      const orgRef = await admin.firestore().collection('trainers').doc(data.organisationId).get();
      if(!orgRef.exists){
        return new responder.Message('Organisation not found', 500);
      }
      const orgData = orgRef.data();
      if(!orgData || !orgData.organisation){
        return new responder.Message('Organisation is not active', 500);
      }
      if(!orgData.admins || orgData.admins.indexOf(context.auth.uid)===-1){
        return new responder.Message('User is not part of the admins', 500);
      }

      const orgSettings = await admin.firestore().collection('trainers').doc(data.organisationId).collection('settings').doc('organisation').get();
      if(!orgSettings.exists){
        return new responder.Message('Organisation settings not found', 500);
      }
      const orgSettingsData = orgSettings.data();
      if(!orgSettingsData || !orgSettingsData.active){
        return new responder.Message('Organisation is not active', 500);
      }
      connectToOrg = true;
    }
    

    try {
        const elearningId = data.elearningId;
        const elearningRef = admin.firestore().collection('elearnings').doc(elearningId);
        const elearningDoc = await elearningRef.get();
        const elearningData = elearningDoc.data();
        if(!elearningData){
            return new responder.Message('Elearning not found', 404);
        }

        if(!elearningData.private){
          return new responder.Message('Elearning is not private, specialCode not possible', 406);
        }

        const isActivated = await isAlreadyActivated(context.auth.uid, elearningData.originalTrainingId);
        if (isActivated) {
          return new responder.Message('Elearning already activated', 405);
        }


        const elearningItemsRef = elearningRef.collection('items');
        const elearningItemsSnapshot = await elearningItemsRef.get();
        const elearningItems = elearningItemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        let newTrainingData:any = JSON.parse(JSON.stringify(elearningData));
        delete newTrainingData['private'];
        delete newTrainingData['marketplace'];
        delete newTrainingData['amount_participants'];
        delete newTrainingData['expected_conversations'];
        delete newTrainingData['specialCode'];
        delete newTrainingData['allowed_domains'];
        delete newTrainingData['max_customers'];
        delete newTrainingData['open_to_public'];
        delete newTrainingData['stripePriceId'];
        delete newTrainingData['stripeProductId'];
        delete newTrainingData['type_credits'];
        delete newTrainingData['startDate'];
        delete newTrainingData['endDate'];

        if(connectToOrg){

          const newTraining = await admin.firestore().collection('trainers').doc(data.organisationId).collection('my_elearnings').add({
              elearningId: elearningId,
              startDate: moment().unix(),
              status: 'active',
              expires: moment().add(1, 'year').unix(),
              ...newTrainingData
          });

          const batch = admin.firestore().batch();
          elearningItems.forEach((item:any) => {
              item.publishType = 'elearning';
              const itemRef = admin.firestore().collection('trainers').doc(data.organisationId).collection('my_elearnings').doc(newTraining.id).collection('items').doc(item.id);
              batch.set(itemRef, item);
          });
          await batch.commit();
        }

        else{
          const newTraining = await admin.firestore().collection('users').doc(context.auth.uid).collection('my_elearnings').add({
              user: context.auth.uid,
              elearningId: elearningId,
              startDate: moment().unix(),
              status: 'active',
              expires: moment().add(1, 'year').unix(),
              ...newTrainingData
          });
  
          const batch = admin.firestore().batch();
          elearningItems.forEach((item:any) => {
              item.publishType = 'elearning';
              const itemRef = admin.firestore().collection('users').doc(context.auth.uid).collection('my_elearnings').doc(newTraining.id).collection('items').doc(item.id);
              batch.set(itemRef, item);
          });
          await batch.commit();

          await addCreditsToUser(context.auth.uid, elearningData.amount_credits || 1000000);
          await sendInvoiceToTrainer(elearningData.trainerId, elearningData.originalTrainingId, context.auth.uid, 25, true);
        }


        await registerActivation(context.auth.uid, elearningData.originalTrainingId, elearningData.trainerId,data.specialCode);

        return new responder.Message('Elearning purchased successfully', 200);
    } catch (error) {
        console.error('Error fetching customer data:', error);
        return new responder.Message('Error fetching customer data', 500);
    }     
});

async function isAlreadyActivated(userId:string, trainingId:string):Promise<boolean>{
  const purchaseSnapshot = await admin.firestore().collection('elearning_purchases').where('userId', '==', userId).where('trainingId', '==', trainingId).limit(1).get();
  return !purchaseSnapshot.empty;
}

async function addCreditsToUser(userId:string,amount:number){
  let obj:any = {
      total: amount,
      amount: amount,  
      added:moment().unix(),
      created: moment().unix(),
      expires: moment().add(365, 'days').unix(),
      source: 'training',
      type: amount == 1000000 ? 'unlimited-chat' : '',
  }
  if(amount === 1000000){
    await admin.firestore().collection('users').doc(userId).collection('credits').doc('0').set(obj);
  }
  else{
    await admin.firestore().collection('users').doc(userId).collection('credits').add(obj);
  }
}

async function sendInvoiceToTrainer(trainerId:string, elearningId:string, userId:string, price:number, specialCodeApplied:boolean){
  admin.firestore().collection('invoices_to_send').add({
    trainerId,
    elearningId,
    userId,
    price,
    specialCodeApplied,
    created: moment().unix(),
    type: 'elearning_sale',
    status: 'pending',
  });
}
  