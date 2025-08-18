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

exports.buyElearning = functions.region('europe-west1').runWith({memory:'1GB'}).https.onCall(async (data, context) => {
    if (!context.auth) {
      return new responder.Message('Not authorized', 401);
    }
    try {
        const elearningId = data.elearningId;
        const elearningRef = admin.firestore().collection('elearnings').doc(elearningId);
        const elearningDoc = await elearningRef.get();
        const elearningData = elearningDoc.data();
        if(!elearningData){
            return new responder.Message('Elearning not found', 404);
        }
        const elearningItemsRef = elearningRef.collection('items');
        const elearningItemsSnapshot = await elearningItemsRef.get();
        const elearningItems = elearningItemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Process the elearning items as needed
        // ...
        const newTraining = await admin.firestore().collection('users').doc(context.auth.uid).collection('my_elearnings').add({
            user: context.auth.uid,
            elearningId: elearningId,
            startDate: moment().unix(),
            status: 'active',
            expires: moment().add(1, 'year').unix(),
            ...elearningData
        });
        // Optionally, you can add the items to the user's elearning
        const batch = admin.firestore().batch();
        elearningItems.forEach((item:any) => {
            item.publishType = 'elearning';
            const itemRef = admin.firestore().collection('users').doc(context.auth.uid).collection('my_elearnings').doc(newTraining.id).collection('items').doc(item.id);
            batch.set(itemRef, item);
        });
        await batch.commit();

        return new responder.Message('Elearning purchased successfully', 200);
    } catch (error) {
        console.error('Error fetching customer data:', error);
        return new responder.Message('Error fetching customer data', 500);
    }     
});


exports.adjustElearning = functions.region('europe-west1').runWith({memory:'1GB'}).https.onCall(async (data, context) => {
  if (!context.auth) {
    return new responder.Message('Not authorized', 401);
  }
  try {
    const elearningId = data.elearningId;
    const updates = data.updates;
    const items = data.items;
    const deleteItems = data.deleteItems;

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
    if ((!updates || typeof updates !== 'object') && (!data.items || !Array.isArray(data.items)) && (!data.deleteItems || !Array.isArray(data.deleteItems))) {
      return new responder.Message('Invalid updates data', 400);
    }
    if(items && Array.isArray(items)) {
      const elearningDocRef = admin.firestore().collection('elearnings').doc(elearningDoc.id).collection('items');
      const batch = admin.firestore().batch();
      items.forEach((item:any) => {
        if(item.id) {
          // Update existing item
          console.log('Updating item:', item.id);
          const itemRef = elearningDocRef.doc(item.id);
          batch.set(itemRef, item);
        } else {
          // Add new item
          console.log('Adding new item:', 'new item');
          const newItemRef = elearningDocRef.doc();
          batch.set(newItemRef, item);
        }
      });
      await batch.commit();
    }
    else if(deleteItems && Array.isArray(deleteItems)) {
      const elearningItemsRef = admin.firestore().collection('elearnings').doc(elearningDoc.id).collection('items');
      const batch = admin.firestore().batch();
      deleteItems.forEach((item:any) => {
          // Delete existing item
          const itemRef = elearningItemsRef.doc(item);
          batch.delete(itemRef);
      });
      await batch.commit();
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