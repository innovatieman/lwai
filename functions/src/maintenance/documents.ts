import * as functions from 'firebase-functions/v1';
import admin from '../firebase'
import * as responder from '../utils/responder'

exports.deleteConversationSubCollections = functions.firestore
  .document('users/{userId}/conversations/{conversationId}')
  .onDelete(async (snap:any, context:any) => {
    const docPath = snap.ref.path;

    // console.log(`Begin recursive deletion of ${docPath}`);

    await deleteSubcollections(docPath);

    // console.log(`Recursive deletion of ${docPath} completed`);
  });


  exports.activeCoursesCreatItems = functions.firestore
  .document('active_courses/{courseId}')
  .onCreate(async (change:any, context:any) => {
    let course = change.data()
    if(course?.itemIds?.length > 0){
      course.itemIds.forEach((item:any) => {
        if(item.type=='case'){
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

async function deleteSubcollections(docPath:any) {
  const subcollections = await admin.firestore().doc(docPath).listCollections();

  for (const subcollection of subcollections) {
    const snapshot = await subcollection.get();
    const batch = admin.firestore().batch();

    snapshot.docs.forEach((doc:any) => batch.delete(doc.ref));

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

exports.moveCancelledCourses = functions.pubsub.schedule('0 4 * * 6') // Elke zaterdag om 04:00 uur
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