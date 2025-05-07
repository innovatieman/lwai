import * as functions from 'firebase-functions/v1';
import admin, { db } from '../firebase'
// import moment from 'moment'
import * as responder from '../utils/responder'
import * as jwt from 'jsonwebtoken'
import moment from 'moment';

exports.getMyActiveTrainings = functions
  .region('europe-west1')
  .runWith({ memory: '1GB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      return { error: 'Not authorized', code: 401 };
    }

    const email = context.auth.token.email;
    const trainingsRef = admin
      .firestore()
      .collection('participant_trainings')
      .doc(email)
      .collection('trainings');

    const trainingsSnap = await trainingsRef.get();

    if (trainingsSnap.empty) {
      return new responder.Message([], 200);
    }

    const trainingsList = trainingsSnap.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    }));

    // haal info van de door user verwerkte items per training op via subcollectie items per training
    const itemsPromises = trainingsList.map(async (training: any) => {
      const itemsRef = admin
        .firestore()
        .collection('participant_trainings')
        .doc(email)
        .collection('trainings')
        .doc(training.id)
        .collection('items');
      const itemsSnap = await itemsRef.get();
      if (itemsSnap.empty) {
        training.used_items = [];
        return training;
      }
      const itemsList = itemsSnap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      }));
      training.used_items = itemsList;
      // klaar
      return training;
    });
    // Wacht tot alle items zijn opgehaald
    await Promise.all(itemsPromises);

    // Haal alle trainings + trainers parallel op
    const trainingsData = await Promise.all(
      trainingsList.map(async (training: any) => {
        try {
          const trainingRef = admin
            .firestore()
            .collection('trainers')
            .doc(training.trainer_id)
            .collection('trainings')
            .doc(training.id); // <-- correcte ID

          const trainingDoc = await trainingRef.get();

          if (!trainingDoc.exists) return null;

          const trainingData:any = {
            id: trainingDoc.id,
            ...trainingDoc.data(),
            basics: training, // <-- alles uit participant_training
            trainer_id: training.trainer_id,
          };

          const trainerDoc = await admin
            .firestore()
            .collection('trainers')
            .doc(training.trainer_id)
            .get();

          trainingData.trainer = trainerDoc.exists
            ? { id: trainerDoc.id, ...trainerDoc.data() }
            : {};

          return trainingData;
        } catch (err) {
          console.error(`Fout bij ophalen training ${training.id}:`, err);
          return null;
        }
      })
    );

    const validTrainings = trainingsData.filter(t => t !== null);

    if (validTrainings.length === 0) {
      return new responder.Message([], 200);
    }

    const enrichedTrainings = await loadTrainingsWithItems(validTrainings);

    return new responder.Message(enrichedTrainings, 200);
  });

exports.createTrainingCode = functions
  .region('europe-west1')
  .runWith({ memory: '1GB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      return { error: 'Not authorized', code: 401 };
    }

    if(!data?.trainingId){
      return { error: 'No Input', code: 400 };
    }

    const trainerId = context.auth.uid;

    let codeObj = {
      trainingId: data.trainingId,
      trainerId: trainerId,
      created: admin.firestore.FieldValue.serverTimestamp(),
    }
    let token = jwt.sign(codeObj,'oiu234ews7a**&AG$%#',{ expiresIn: 60 * 60 * 24 * 120 });

    await admin.firestore()
      .collection('trainers')
      .doc(trainerId)
      .collection('trainings')
      .doc(data.trainingId).update({
        code: token,    
        code_created: admin.firestore.FieldValue.serverTimestamp(),
      })

    return new responder.Message('created', 200);

  })

exports.registerWithCode = functions
.region('europe-west1')
.runWith({ memory: '1GB' })
.https.onCall(async (data, context) => {
  if (!context.auth) {
    return { error: 'Not authorized', code: 401 };
  }
  if(!data?.code){
    return { error: 'No Input', code: 400 };
  }
  const code:any = readJWT(data.code);
  if(!code){
    return { error: 'Invalid Code', code: 400 };
  }
  const trainerId = code.trainerId;
  const trainingId = code.trainingId;
  const email = context.auth.token.email;
  const created = code.created;
  if(!trainerId||!trainingId||!email||!created){
    return { error: 'Invalid Code', code: 400 };
  }
  const trainingRef = admin
    .firestore()
    .collection('trainers')
    .doc(trainerId)
    .collection('trainings')
    .doc(trainingId);
  const trainingDoc = await trainingRef.get();
  if (!trainingDoc.exists) {
    return { error: 'Training not found', code: 404 };
  }
  await db.collection('participant_trainings')
    .doc(email)
    .collection('trainings')
    .doc(trainingId)
    .set({
      trainer_id: trainerId,
      entered:moment().unix(),
    })

    return new responder.Message('registered', 200);
})


  async function loadTrainingsWithItems(trainingsData: any[]) {
    // Haal alle trainingitems vanuit subcollectie items
    return Promise.all(
      trainingsData.map(async (training) => {
        const itemsRef =
             admin.firestore()
              .collection('trainers')
              .doc(training.trainer_id)
              .collection('trainings')
              .doc(training.id)
              .collection('items');
        const itemsSnap = await itemsRef.get();
        if (itemsSnap.empty) {
          training.allItems = [];
          return training;
        }
        const itemsList = itemsSnap.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        }));
        training.allItems = itemsList;
        // klaar
        return training;
      })
    );
          
  }



exports.addParticipantTraining = functions
  .region('europe-west1')
  .runWith({ memory: '1GB' }).firestore
  .document("trainers/{trainerId}/trainings/{trainingId}/participants/{participantId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if(data?.status!='active') return;
    if(!data?.email) return;
    if(!data?.created) return;
    const participantId = context.params.participantId;
    const trainingId = context.params.trainingId;
    const trainerId = context.params.trainerId;

    admin.firestore().collection("participant_trainings")
      .doc(data.email)
      .collection("trainings")
      .doc(trainingId)
      .set({
        id: trainingId,
        trainer_id: trainerId,
        participant_id: participantId,
        status: data.status,
        created: data.created,
      })
  })

exports.deleteParticipantTraining = functions
  .region('europe-west1')
  .runWith({ memory: '1GB' }).firestore
  .document("trainers/{trainerId}/trainings/{trainingId}/participants/{participantId}")
  .onDelete(async (snap, context) => {
    const data = snap.data();
    const trainingId = context.params.trainingId;
    const email = data.email;
    let ref = admin.firestore()
    .collection("participant_trainings")
    .doc(email)
    .collection("trainings")
    .doc(trainingId)
    const doc = await ref.get();
    if(!doc.exists) return;
    admin.firestore()
      .collection("participant_trainings")
      .doc(email)
      .collection("trainings")
      .doc(trainingId).delete()
  })
    
  exports.updateStatusParticipantTraining = functions
  .region('europe-west1')
  .runWith({ memory: '1GB' }).firestore
  .document("trainers/{trainerId}/trainings/{trainingId}/participants/{participantId}")
  .onUpdate(async (snap, context) => {
    if(!snap.after.exists) return;
    if(!snap.before.exists) return;
    const data = snap.after.data();
    const trainingId = context.params.trainingId;
    const trainerId = context.params.trainerId;
    const participantId = context.params.participantId;
    const email = data.email;
    const status = data.status;
    if(data?.status=='active'){
      admin.firestore()
        .collection("participant_trainings")
        .doc(email)
        .collection("trainings")
        .doc(trainingId)
        .set({
          id: trainingId,
          participant_id: participantId,
          trainer_id: trainerId,
          status: status,
          created: data.created,
        })
    }
    else{
      admin.firestore()
        .collection("participant_trainings")
        .doc(email)
        .collection("trainings")
        .doc(trainingId)
        .delete()
    }
  })

function readJWT(token: string) {
  try {
    const decoded = jwt.verify(token, 'oiu234ews7a**&AG$%#');
    return decoded;
  } catch (err) {
    console.error('Fout bij decoderen JWT:', err);
    return null;
  }
}
  // Snellere en betere loadModulesWithItems
  // async function loadModulesWithItems(modulesData: any[]) {
  //   return Promise.all(
  //     modulesData.map(async (module) => {
  //       if (!module.items || module.items.length === 0) {
  //         module.items = [];
  //         return module;
  //       }
  
  //       // Maak Firestore refs lijst voor batch
  //       const refs = module.items.map((item:any) => {
  //         if (item.type === 'case') {
  //           return admin.firestore()
  //             .collection('trainers')
  //             .doc(module.trainer_id)
  //             .collection('cases')
  //             .doc(item.id);
  //         } else if (item.type === 'infoItem') {
  //           return admin.firestore()
  //             .collection('trainers')
  //             .doc(module.trainer_id)
  //             .collection('infoItems')
  //             .doc(item.id);
  //         } else {
  //           return null; // onherkenbaar type
  //         }
  //       }).filter((ref:any) => ref !== null);
  
  //       // Batch ophalen van alle refs
  //       const itemDocs = await Promise.all(refs.map((ref:any) => ref.get()));
  
  //       module.items = itemDocs.map((docSnap, index) => {
  //         if (!docSnap.exists) return null;
  
  //         return {
  //           id: docSnap.id,
  //           ...docSnap.data(),
  //           originalType: module.items[index].type // Behoud type info
  //         };
  //       }).filter(item => item !== null); // Filter lege
  
  //       return module;
  //     })
  //   );
  // }