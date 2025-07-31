import * as functions from 'firebase-functions/v1';
const { onDocumentDeleted } = require("firebase-functions/v2/firestore");
import { FirestoreEvent } from "firebase-functions/v2/firestore";
import admin from '../firebase'
import * as responder from '../utils/responder'

exports.deleteConversationSubCollection = functions.region('europe-west1')
.firestore
.document('users/{userId}/conversations/{conversationId}')
.onDelete(async (snap:any, context:any) => {
  const docPath = snap.ref.path;
  await deleteSubcollections(docPath);
});

exports.deleteTrainingsSubCollections = onDocumentDeleted(
  {
    region: "europe-west1",
    memory: "1GiB",
    document: "trainers/{trainerId}/trainings/{trainingId}", // pas dit pad aan indien nodig
  },
  async (event: FirestoreEvent<admin.firestore.DocumentData>) => {
    const docPath = event.data?.ref.path;

    if (!docPath) {
      return;
    }
    await deleteSubcollections(docPath);
  }
);

exports.activeCoursesCreateItem = functions.region('europe-west1')
.firestore
.document('active_courses/{courseId}')
.onCreate(async (change:any, context:any) => {
  let course = change.data()
  if(course?.itemIds?.length > 0){
    course.itemIds.forEach((item:any) => {
      if(item.type=='practice'){
        if(course.trainerId){
          let trainerRef = admin.firestore().collection('cases_trainer').doc(item.id)
          trainerRef.get().then(doc => {
            if(doc.exists){
              let caseData = doc.data()
              caseData.id = doc.id
              admin.firestore().collection('active_courses').doc(context.params.courseId).collection('items').doc(item.id).set(caseData)
            }
          })
        }
        else{
          let userRef = admin.firestore().collection('cases').doc(item.id)
          userRef.get().then(doc => {
            if(doc.exists){
              let caseData = doc.data()
              caseData.id = doc.id
              admin.firestore().collection('active_courses').doc(context.params.courseId).collection('items').doc(item.id).set(caseData)
            }
          })
        }
        if(item.caseIds){
          item.caseIds.forEach((caseId:any) => {
            if(course.trainerId){
              let trainerRef = admin.firestore().collection('cases_trainer').doc(caseId.id)
              trainerRef.get().then(doc => {
                if(doc.exists){
                  let caseData = doc.data()
                  caseData.id = doc.id
                  admin.firestore().collection('active_courses').doc(context.params.courseId).collection('items').doc(caseId.id).set(caseData)
                }
              })
            }
            else{
              let userRef = admin.firestore().collection('cases').doc(caseId.id)
              userRef.get().then(doc => {
                if(doc.exists){
                  let caseData = doc.data()
                  caseData.id = doc.id
                  admin.firestore().collection('active_courses').doc(context.params.courseId).collection('items').doc(caseId.id).set(caseData)
                }
              })
            }
          })
        }
      }

      else if(item.type=='case'){
        if(course.trainerId){
          let trainerRef = admin.firestore().collection('cases_trainer').doc(item.id)
          trainerRef.get().then(doc => {
            if(doc.exists){
              let caseData = doc.data()
              caseData.id = doc.id
              admin.firestore().collection('active_courses').doc(context.params.courseId).collection('items').doc(item.id).set(caseData)
            }
          })
        }
        else{
          let userRef = admin.firestore().collection('cases').doc(item.id)
          userRef.get().then(doc => {
            if(doc.exists){
              let caseData = doc.data()
              caseData.id = doc.id
              admin.firestore().collection('active_courses').doc(context.params.courseId).collection('items').doc(item.id).set(caseData)
            }
          })
        }
      }
      else if(item.type=='infoItem'){
        if(course.trainerId){
          let trainerRef = admin.firestore().collection('infoItems_trainer').doc(item.id)
          trainerRef.get().then(doc => {
            if(doc.exists){
              let caseData = doc.data()
              caseData.id = doc.id
              admin.firestore().collection('active_courses').doc(context.params.courseId).collection('items').doc(item.id).set(caseData)
            }
          })
        }
        else{
          let userRef = admin.firestore().collection('infoItems').doc(item.id)
          userRef.get().then(doc => {
            if(doc.exists){
              let caseData = doc.data()
              caseData.id = doc.id
              admin.firestore().collection('active_courses').doc(context.params.courseId).collection('items').doc(item.id).set(caseData)
            }
          })
        }
      }
    })
  }
});

async function deleteSubcollections(docPath: string): Promise<void> {
  const docRef = admin.firestore().doc(docPath);
  const subcollections = await docRef.listCollections();

  for (const subcollection of subcollections) {
    const snapshot = await subcollection.get();

    const batch = admin.firestore().batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    for (const doc of snapshot.docs) {
      await deleteSubcollections(doc.ref.path);
    }
  }
}


exports.cancelActiveCourse = functions.region('europe-west1').https.onCall((data:any,context:any)=>{
    if(!context.auth){
        return {error:'Not authorized',code:401}
    }
    if(!data.courseId){
        return new responder.Message('No id provided',400)
    }
    if(data.trainerId!=context.auth.uid){
        return new responder.Message('Not authorized',401)
    }
    const courseRef = admin.firestore().collection('active_courses').doc(data.courseId)
    return courseRef.update({status:'cancelled',cancelledAt:admin.firestore.FieldValue.serverTimestamp(),cancelledBy:context.auth.uid})
    
})

exports.moveCancelledCourse = functions.region('europe-west1')
  .pubsub.schedule('0 4 * * 6') // Elke zaterdag om 04:00 uur
  .timeZone('Europe/Amsterdam')
  .onRun(async (context) => {
    const activeCoursesRef = admin.firestore().collection('active_courses');
    const oldCoursesRef = admin.firestore().collection('old_courses');

    try {
      // Stap 1: Haal alle geannuleerde cursussen op
      const cancelledCoursesSnapshot = await activeCoursesRef.where('status', '==', 'cancelled').get();

      if (cancelledCoursesSnapshot.empty) {
        console.log('Geen geannuleerde cursussen gevonden.');
        return null;
      }

      // Stap 2: Verplaats elk document met subcollecties en verwijder het origineel
      const promises = cancelledCoursesSnapshot.docs.map(async (doc) => {
        const courseData = doc.data();
        const oldCourseDocRef = oldCoursesRef.doc(doc.id);

        // 1. Kopieer het hoofd-document naar old_courses
        await oldCourseDocRef.set(courseData);

        // 2. Verplaats en verwijder de subcollecties
        await moveAndDeleteSubcollections(doc.ref, oldCourseDocRef);

        // 3. Verwijder het hoofddocument uit active_courses
        await doc.ref.delete();
        console.log(`Document ${doc.id} is verplaatst naar old_courses en verwijderd.`);
      });

      await Promise.all(promises);
      console.log('Verplaatsing en verwijdering voltooid.');

    } catch (error) {
      console.error('Fout bij het verplaatsen van geannuleerde cursussen:', error);
    }

    return null;
  });

/**
 * Kopieert alle subcollecties van de bronreferentie naar de doelreferentie en verwijdert de originele subcollecties.
 */
async function moveAndDeleteSubcollections(sourceDocRef:any, targetDocRef:any) {
  const subcollections = await sourceDocRef.listCollections();

  for (const subcollection of subcollections) {
    const subcollectionRef = subcollection;
    const targetSubcollectionRef = targetDocRef.collection(subcollection.id);

    const docs = await subcollectionRef.get();
    for (const doc of docs.docs) {
      // 1. Kopieer het subdocument naar de nieuwe locatie
      await targetSubcollectionRef.doc(doc.id).set(doc.data());

      // 2. Verwijder het originele subdocument
      await doc.ref.delete();
    }
    console.log(`Subcollectie ${subcollection.id} is gekopieerd en verwijderd.`);
  }
}

exports.deleteExpertSubCollections = onDocumentDeleted(
  {
    region: "europe-west1",
    memory: "1GiB",
    document: "trainers/{trainerId}/knowledge/{knowledgeId}",
  },
  async (event: FirestoreEvent<admin.firestore.DocumentData>) => {
    const docPath = event.data?.ref.path;

    if (!docPath) {
      return;
    }
    await deleteSubcollections(docPath);
  }
);

exports.deleteExpertSegments = onDocumentDeleted(
  {
    region: "europe-west1",
    memory: "1GiB",
    document: "trainers/{trainerId}/knowledge/{knowledgeId}/documents/{documentId}", 
  },
  async (event: FirestoreEvent<admin.firestore.DocumentData>) => {
    const docPath = event.data?.ref.path;

    if (!docPath) {
      return;
    }

    let data = event.data?.data();
    if (!data || !data.filePath) {
      console.warn('No filePath found in document data, skipping deletion.');
      return;
    }
    // Delete the file from Firebase Storage
    const bucket = admin.storage().bucket('lwai-3bac8.firebasestorage.app');
    const filePath = data.filePath;

    const segmentsQuery = admin.firestore().collection('segments')
      .where('filePath', '==', filePath);
    const segmentsSnapshot = await segmentsQuery.get(); 
    if (!segmentsSnapshot.empty) {
      const batch = admin.firestore().batch();
      segmentsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`Deleted ${segmentsSnapshot.size} segments related to filePath: ${filePath}`);
    } else {
      console.log(`No segments found for filePath: ${filePath}`);
    }

    const file = bucket.file(filePath);
    await file.delete().catch((error:any) => {
      console.error('Error deleting file from Firebase Storage:', error);
    });

  }
);