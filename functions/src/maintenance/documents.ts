import * as functions from 'firebase-functions/v1';
import admin from '../firebase'

exports.deleteConversationSubCollections = functions.firestore
  .document('users/{userId}/conversations/{conversationId}')
  .onDelete(async (snap:any, context:any) => {
    const docPath = snap.ref.path;

    // console.log(`Begin recursive deletion of ${docPath}`);

    await deleteSubcollections(docPath);

    // console.log(`Recursive deletion of ${docPath} completed`);
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