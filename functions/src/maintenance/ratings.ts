import * as functions from 'firebase-functions/v1';
import admin from '../firebase'

exports.createRatingDocuments = functions.region('europe-west1')
  .firestore
  .document("users/{userId}/conversations/{conversationId}")
  .onUpdate(async (change, context) => {
    const { userId, conversationId } = context.params;

    // Get the before and after snapshots
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Check if 'rating2' was newly created
    if (!beforeData.rating2 && afterData.rating2) {
      try {
        // Get the user's document to retrieve uid and displayName
        const userDoc = await admin.firestore().collection("users").doc(userId).get();
        if (!userDoc.exists) {
          console.error(`User document with ID ${userId} not found.`);
          return null;
        }

        const userData = userDoc.data();
        const { displayName } = userData;

        // Prepare the rating document
        const ratingDocument = {
          ...afterData.rating2, // Include the contents of the 'rating2' object
        };

        let ratingDocRef = admin.firestore().collection("ratings").doc(conversationId);
        let ratingDoc = await ratingDocRef.get();

        if (!ratingDoc.exists) {
          await ratingDocRef.set({
            conversation_id: conversationId,
            uid: userId,
            displayName,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
          ratingDoc = await ratingDocRef.get();
        }


        // const ratings = ratingDoc.data().ratings;
        // Add the rating document to the 'ratings' collection
        await admin.firestore().collection("ratings").doc(conversationId).update(ratingDocument);

        // console.log(
        //   `Rating document successfully created for user ${uid} and conversation ${conversationId}.`
        // );
      } catch (error) {
        console.error("Error creating rating document:", error);
      }
    }

    if (!beforeData.rating && afterData.rating) {
        try {
          // Get the user's document to retrieve uid and displayName
          const userDoc = await admin.firestore().collection("users").doc(userId).get();
          if (!userDoc.exists) {
            console.error(`User document with ID ${userId} not found.`);
            return null;
          }
  
          const userData = userDoc.data();
          const { displayName } = userData;
  
          // Prepare the rating document
          const ratingDocument = {
            ...afterData.rating, // Include the contents of the 'rating2' object
          };
  
          let ratingDocRef = admin.firestore().collection("ratings").doc(conversationId);
          let ratingDoc = await ratingDocRef.get();
  
          if (!ratingDoc.exists) {
            await ratingDocRef.set({
              conversation_id: conversationId,
              uid: userId,
              displayName,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
            ratingDoc = await ratingDocRef.get();
          }
  
          // Add the rating document to the 'ratings' collection
          await admin.firestore().collection("ratings").doc(conversationId).update(ratingDocument);
  
          // console.log(
          //   `Rating document successfully created for user ${uid} and conversation ${conversationId}.`
          // );
        } catch (error) {
          console.error("Error creating rating document:", error);
        }
      }

    return null;
  });
