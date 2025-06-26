import admin from '../firebase'
import * as functions from 'firebase-functions/v1';
import * as responder from '../utils/responder'
import moment from 'moment';
// import moment from 'moment';

exports.myAffiliates = functions
  .region('europe-west1')
  .runWith({ memory: '1GB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      return new responder.Message('Unauthorized', 401);
    }

    const userId = context.auth.uid;
    const userRef = admin.firestore().collection('trainers').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return new responder.Message('User not found', 404);
    }

    const userData = userDoc.data();
    if (!userData || !userData.affiliate) {
      return new responder.Message('User is not an affiliate', 403);
    }
    console.log('Affiliate code:', userData.affiliate);
    let affiliateSnapshot;
    try {
      affiliateSnapshot = await admin
        .firestore()
        .collectionGroup('offers')
        .where('code', '==', userData.affiliate).where('createdAt', '>', moment().subtract(1, 'year').unix())
        .get();
    } catch (err) {console.log()
      console.error('Fout bij ophalen van offers:', err);
      return new responder.Message('Failed to retrieve offers', 500);
    }

    const affiliates = await Promise.all(
      affiliateSnapshot.docs.map(async (doc) => {
        try {
          const offerData = doc.data();
          const parentDocRef = doc.ref.parent.parent;

          if (!parentDocRef) {
            console.warn(`Geen parent gevonden voor offer-doc ${doc.id}`);
            return null;
          }

          const affiliateUserDoc = await parentDocRef.get();
          const affiliateUserData = affiliateUserDoc.exists ? affiliateUserDoc.data() : null;

          const subscriptionsSnapshot = await parentDocRef.collection('subscriptions').get();
          const subscriptions = subscriptionsSnapshot.docs.map((sub) => ({
            id: sub.id,
            ...sub.data(),
          }));

          const creditsSnapshot = await parentDocRef.collection('credits').get();
          const credits = creditsSnapshot.docs.map((credit) => ({
            id: credit.id,
            ...credit.data(),
          }));

          return {
            affiliateUserId: parentDocRef.id,
            affiliateUser: affiliateUserData,
            id: doc.id,
            ...offerData,
            subscriptions,
            credits,
          };
        } catch (err) {
          console.error(`Fout bij verwerken offer-doc ${doc.id}:`, err);
          return null;
        }
      })
    );

    const filteredAffiliates = affiliates.filter((a) => a !== null);

    return new responder.Message(filteredAffiliates, 200);
  });