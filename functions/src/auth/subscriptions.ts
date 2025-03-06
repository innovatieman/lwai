const { onSchedule } = require("firebase-functions/v2/scheduler");
import * as functions from 'firebase-functions/v1';

import admin from '../firebase'

exports.checkValidSubscriptions = onSchedule(
  {
    schedule: "1 0 * * *",
    timeZone: "Europe/Amsterdam", // Optioneel: voeg tijdzone toe
    region: "europe-west1",
  },
  async (context: any): Promise<null> => {
    try {
      const subscriptions = await admin.firestore().collectionGroup("subscriptions").get();
      const now = admin.firestore.Timestamp.now();

      subscriptions.forEach((subscription) => {
        const data = subscription.data();

        if (data.endDate && data.endDate < now) {
          const userId = subscription.ref.parent.parent?.id; 
          const subscriptionId = subscription.id;

          if (userId && subscriptionId) {
            
            admin.firestore()
              .collection("users")
              .doc(userId)
              .collection("subscriptions")
              .doc(subscriptionId)
              .update({ status: "expired" })
              .catch((error) => {
                console.error(`Fout bij updaten van subscription ${subscriptionId} voor user ${userId}:`, error);
              });
          }
        }
      });

      console.log("Subscription status gecontroleerd en bijgewerkt.");
      return null;
    } catch (error) {
      console.error("Fout bij het uitvoeren van checkValidSubscription:", error);
      return null;
    }
  }
);

exports.addSubscription = functions.region('europe-west1').https.onCall(async (data,context)=>{
    if(!context.auth){
        return {error:'Not authorized',code:401}
    }
    let subsObj = {
        type: data.type,
        status: 'active',
        startDate: admin.firestore.Timestamp.now(),
        period:'monthly',
        endDate: admin.firestore.Timestamp.fromDate(new Date(admin.firestore.Timestamp.now().toDate().getTime() + (data.days*24*60*60*1000))),
        paymentMethod:{
          type: data.paymentMethod,
        },
        price: 30,
    }
    try{
        const userRef = admin.firestore().collection('users').doc(context.auth.uid)
        await userRef.collection('subscriptions').add(subsObj)
        return {message:'Subscription added',code:200}
    }   
    catch(error){
        console.error('Error in addSubscription:', error);
        return {error:error,code:500}
    }

})

exports.updateActiveSubscription = functions.region('europe-west1')
  .firestore
  .document('users/{userId}/subscriptions/{subscriptionId}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const db = admin.firestore();

    try {
      // Haal alle actieve subscriptions van de gebruiker op
      const subscriptionsSnapshot = await db
        .collection(`users/${userId}/subscriptions`)
        .where('status', '==', 'active')
        .get();

      if (subscriptionsSnapshot.empty) {
        // Geen actieve subscriptions, verwijder velden uit de user-doc
        await db.doc(`users/${userId}`).update({
          activeSubscriptionTypes: admin.firestore.FieldValue.delete(),
          activeCourseIds: admin.firestore.FieldValue.delete(),
        });
        return null;
      }

      // Verzamel unieke subscription types en courseIds
      const activeSubscriptionTypes = new Set();
      const activeCourseIds = new Set();

      subscriptionsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type) {
          activeSubscriptionTypes.add(data.type);
        }
        if (Array.isArray(data.courseIds)) {
          data.courseIds.forEach((courseId) => activeCourseIds.add(courseId));
        }
      });

      // Zet de unieke types en courseIds om in arrays
      const subscriptionTypesArray = Array.from(activeSubscriptionTypes);
      const courseIdsArray = Array.from(activeCourseIds);

      // Update het gebruikersdocument met de unieke arrays
      await db.doc(`users/${userId}`).update({
        activeSubscriptionTypes: subscriptionTypesArray,
        activeCourseIds: courseIdsArray,
      });

      console.log(`Updated user ${userId} with active subscriptions and courseIds.`);
    } catch (error) {
      console.error(`Error updating active subscriptions for user ${userId}:`, error);
    }

    return null;
  });