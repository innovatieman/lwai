import * as functions from 'firebase-functions/v1';
import admin, { db } from '../firebase'
// import moment from 'moment'
import * as responder from '../utils/responder'
import * as jwt from 'jsonwebtoken'
import moment from 'moment';
// import * as crypto from 'crypto';

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
            status_access: training.status || 'pending', // <-- status uit participant_training
            id: trainingDoc.id,
            ...trainingDoc.data(),
            basics: training, // <-- alles uit participant_training
            trainer_id: training.trainer_id,
          };

          if(trainingData.available_date && trainingData.available_date > moment().format('YYYY-MM-DD')){
            return null; // Training is nog niet beschikbaar
          }
          if(trainingData.available_till && trainingData.available_till < moment().format('YYYY-MM-DD')){
            return null; // Training is verlopen
          }

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

    let allTrainings: any[] = [];
    for (let i = 0; i < enrichedTrainings.length; i++) {
      let training:any = {}
      if( enrichedTrainings[i].status_access!='pending'){
        training = {...enrichedTrainings[i] };
      }
      else{
        training = {
          id: enrichedTrainings[i].id,
          title: enrichedTrainings[i].title,
          user_info: enrichedTrainings[i].user_info,
          trainer_id: enrichedTrainings[i].trainer_id,
          trainer: enrichedTrainings[i].trainer,
          status_access: enrichedTrainings[i].status_access,
          available_date: enrichedTrainings[i].available_date,
          available_till: enrichedTrainings[i].available_till,
          photo: enrichedTrainings[i].photo,
        };
      }
      allTrainings.push(training);
    }

    return new responder.Message(allTrainings, 200);
  });

exports.createTrainingCode = functions
  .region('europe-west1')
  .runWith({ memory: '1GB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      return { error: 'Not authorized', code: 401 };
    }

    if(!data?.trainingId || !data?.trainerId){
      return { error: 'No Input', code: 400 };
    }

    const trainerId = data?.trainerId || context.auth.uid;

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
  const displayName = data.displayName || '';
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
  const trainingData = trainingDoc.data();
  let status = 'pending'
  const participantsRef = await trainingRef.collection('participants')
  const participantDocs = await participantsRef.get();
  if(trainingData.allow_automatic_approval && trainingData.status=='published' && (participantDocs.empty || participantDocs.docs.length < trainingData.amount_participants)){
    status = 'active';
  }
  await db.collection('participant_trainings')
    .doc(email)
    .collection('trainings')
    .doc(trainingId)
    .set({
      trainer_id: trainerId,
      entered:moment().unix(),
      status: status,
    })
  await trainingRef.collection('participants')
    .add({
      email: email,
      status: status,
      displayName: displayName || '',
      created: Date.now(),
    });

    // db.collection('emailsToSend').add({
    //     to: 'trainer@innovatieman.nl',
    //     template: 'welcome',
    //     data:{
    //       name: 'Marky',
    //     },
    //     language: 'nl'
    //   })

    const trainerRef = admin
    .firestore()
    .collection('trainers')
    .doc(trainerId);
    const trainerDoc = await trainerRef.get();
    if (trainerDoc.exists) {
      const trainerData = trainerDoc.data();
  
      db.collection('emailsToProcess').add({
        template: 'free',
        to:trainerData.email,
        data: {
          content:`${trainerData.name || ''},<br><br>
          Er is een nieuwe deelnemer geregistreerd voor je training "${trainingDoc.data().title}".<br><br>
          <table>
          <tr><td>Deelnemer:</td><td>${displayName || email}</td></tr>
          <tr><td>Email:</td><td>${email}</td></tr>
          <tr><td>Geregistreerd:</td><td>${moment(created).format('DD-MM-YYYY HH:mm')}</td></tr>
          <tr><td>Status:</td><td>${trainingData.allow_automatic_approval ? 'Actief' : 'In afwachting van goedkeuring'}</td></tr>
          </table><br>
          Je kunt de deelnemer vinden in je dashboard.<br><br>
          <a style="background:#2b6cf5;color:white;padding:10px 20px;border-radius:24px;font-size:18px;font-weight:600;text-decoration:none" href="https://conversation.alicialabs.com/trainer/trainings">Naar je trainingen</a><br>
          `,
          subject: 'Nieuwe deelnemer voor training '+ trainingDoc.data().title,
        },
        subject: 'Nieuwe deelnemer voor training',
        language:'nl'
      })
    }

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

    // if(data?.embedded){

    //    await admin.firestore().collection("users").doc(hashEmailForUid(data.email)).set({
    //     email: data.email,
    //     displayName: data.displayName || '',
    //     created: data.created,
    //   })

    //   await admin.auth().createUser({
    //     displayName: data.displayName || '',
    //     uid: hashEmailForUid(data.email),
    //   })
    // }

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

exports.addEmployeesOrganisation = functions
  .region('europe-west1')
  .runWith({ memory: '1GB' }).firestore
  .document("trainers/{trainerId}/employees/{employeeId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if(data?.status!='active') return;
    if(!data?.email) return;
    if(!data?.created) return;
    const employeeId = context.params.employeeId;
    const trainerId = context.params.trainerId;

    admin.firestore().collection("participant_organisations")
      .doc(data.email)
      .collection("organisations")
      .doc(trainerId)
      .set({
        id: trainerId,
        organisation_id: trainerId,
        employee_id: employeeId,
        status: data.status,
        created: data.created,
      })
})

exports.deleteEmployeesOrganisation = functions
  .region('europe-west1')
  .runWith({ memory: '1GB' }).firestore
  .document("trainers/{trainerId}/employees/{employeeId}")
  .onDelete(async (snap, context) => {
    const data = snap.data();
    const trainerId = context.params.trainerId;
    const email = data.email;
    let ref = admin.firestore()
    .collection("participant_organisations")
    .doc(email)
    .collection("organisations")
    .doc(trainerId)
    const doc = await ref.get();
    if(!doc.exists) return;
    admin.firestore()
      .collection("participant_organisations")
      .doc(email)
      .collection("organisations")
      .doc(trainerId).delete()
  })

exports.updateStatusEmployeeOrganisation = functions
  .region('europe-west1')
  .runWith({ memory: '1GB' }).firestore
  .document("trainers/{trainerId}/employees/{employeeId}")
  .onUpdate(async (snap, context) => {
    if(!snap.after.exists) return;
    if(!snap.before.exists) return;
    const data = snap.after.data();
    const trainerId = context.params.trainerId;
    const employeeId = context.params.employeeId;
    const email = data.email;
    const status = data.status;
    if(data?.status=='active'){
      admin.firestore()
        .collection("participant_organisations")
        .doc(email)
        .collection("organisations")
        .doc(trainerId)
        .set({
          id: trainerId,
          employee_id: employeeId,
          organisation_id: trainerId,
          status: status,
          created: data.created,
        })
    }
    else{
      admin.firestore()
        .collection("participant_organisations")
        .doc(email)
        .collection("organisations")
        .doc(trainerId)
        .delete()
    }
  }
);

exports.getMyActiveOrganisationsTrainings = functions
  .region('europe-west1')
  .runWith({ memory: '1GB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      return { error: 'Not authorized', code: 401 };
    }

    const email = context.auth.token.email;
    const organisationsRef = admin
      .firestore()
      .collection('participant_organisations')
      .doc(email)
      .collection('organisations');

    const organisationsSnap = await organisationsRef.get();

    if (organisationsSnap.empty) {
      return new responder.Message([], 200);
    }

    const organisationsList = organisationsSnap.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    }));

    // haal info van de door user verwerkte items per training op via subcollectie items per training
    const itemsPromises = organisationsList.map(async (organisation: any) => {
      const itemsRef = admin
        .firestore()
        .collection('participant_organisations')
        .doc(email)
        .collection('organisations')
        .doc(organisation.id)
        .collection('items');
      const itemsSnap = await itemsRef.get();
      if (itemsSnap.empty) {
        organisation.used_items = [];
        return organisation;
      }
      const itemsList = itemsSnap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      }));
      organisation.used_items = itemsList;
      // klaar
      return organisation;
    });
    // Wacht tot alle items zijn opgehaald
    await Promise.all(itemsPromises);

    // Haal alle trainings + trainers parallel op
    // console.log('Organisations List:', organisationsList);
    const organisationsData = await Promise.all(
      organisationsList.map(async (organisation: any) => {
        try {

          const trainingsRef = admin
            .firestore()
            .collection('trainers')
            .doc(organisation.id)
            .collection('trainings')
            .where('status', '==', 'published')
            .where('publishType', '==', 'organisation')

          const trainingsSnap = await trainingsRef.get();
          if (trainingsSnap.empty) return null;
          const trainingsList = trainingsSnap.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            basics: organisation,
            trainer_id: doc.ref.parent.parent.id, // Trainer ID uit de parent van de training
          }));

          const validTrainings = trainingsList.filter((training: any) => {
            if(training.available_date && training.available_date > moment().format('YYYY-MM-DD')){
              return false; // Training is nog niet beschikbaar
            }
            if(training.available_till && training.available_till < moment().format('YYYY-MM-DD')){
              return false; // Training is verlopen
            }
            return true; // Training is geldig
          });
          if (validTrainings.length === 0) return null; 
          const enrichedTrainings = await loadTrainingsWithItems(validTrainings);

          const organisationRef = admin
            .firestore()
            .collection('trainers')
            .doc(organisation.id);
          const organisationDoc = await organisationRef.get();
          if (!organisationDoc.exists) return null;
          const organisationData = organisationDoc.data();

          return {
            id: organisation.id,
            name: organisationData.name || '',
            logo: organisationData.logo || '',
            trainings: enrichedTrainings,
          };
        } catch (err) {
          console.error(`Fout bij ophalen organisatie ${organisation.id}:`, err);
          return null;
        }
      })
    );
    const validOrganisations = organisationsData.filter(o => o !== null);
    if (validOrganisations.length === 0) {
      return new responder.Message([], 200);
    }
    return new responder.Message(validOrganisations, 200);  

  });
  

// function hashEmailForUid(email: string): string {
//   const SECRET = 'asdSD234rwderfR4';
//   const hmac = crypto.createHmac('sha256', SECRET);
//   hmac.update(email.toLowerCase().trim()); // normaliseer e-mailadres
//   const digest = hmac.digest('base64url'); // base64url is veilig in URLs en Firebase UIDs
//   return digest; // bijv: '9E7kKylsE1onKd-8h7Ae8JuHQDfnP07bV9Yz9me2qOM'
// }