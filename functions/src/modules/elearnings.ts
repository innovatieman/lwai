import * as functions from 'firebase-functions/v1';
import { db } from '../firebase'
// import moment from 'moment'
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