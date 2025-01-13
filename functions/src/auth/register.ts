import * as functions from 'firebase-functions/v1';
import admin from '../firebase'
import * as moment from 'moment'


exports.userRegister = functions.region('europe-west1').auth.user().onCreate(
    (user:any,context:any)=>{
        return admin.firestore().collection('users').doc(user.uid).set({
            email:user.email,
            displayName:user.displayName || 'New User',
            registeredAt:moment().unix(),
            isAdmin:false,
            isConfirmed:false,
            preferences:{
              themes:{
                basic:true,
              }
            }
        })
        .then(()=>{
            const basicSubscription = {
                type: "basic",
                period: "unlimited",
                startDate: admin.firestore.Timestamp.now(),
                // endDate over 1 week
                endDate: admin.firestore.Timestamp.fromDate(
                    new Date(admin.firestore.Timestamp.now().toDate().getTime() + 7 * 24 * 60 * 60 * 1000 * 52 * 1000)
                  ),
                status: "active",
                price: 0,
                paymentMethod:{
                    type: "free",
                }
            };
            const freeSubscription = {
              type: "trial",
              period: "week",
              startDate: admin.firestore.Timestamp.now(),
              // endDate over 1 week
              endDate: admin.firestore.Timestamp.fromDate(
                  new Date(admin.firestore.Timestamp.now().toDate().getTime() + 7 * 24 * 60 * 60 * 1000)
                ),
              status: "active",
              price: 0,
              paymentMethod:{
                  type: "free",
              }
          };

          const credits = {
            total: 5,
            used: 0,
            remaining: 5,
            source: "registration",
            lastUpdated: admin.firestore.Timestamp.now(),
          };

          try {
            admin.firestore()
              .collection("users")
              .doc(user.uid)
              .collection("subscriptions")
              .add(freeSubscription);

            admin.firestore()
              .collection("users")
              .doc(user.uid)
              .collection("subscriptions")
              .add(basicSubscription);
            
            admin.firestore()
              .collection("users")
              .doc(user.uid)
              .collection("credits")
              .add(credits);
          } catch (error) {
          //   console.error("Error creating free subscription:", error);
          }
        })
    }
)

exports.userRemove = functions.region('europe-west1').auth.user().onDelete(
    async (user:any, context:any) => {
      const userId = user.uid;
      const userDocRef = admin.firestore().collection("users").doc(userId);
  
      try {
        const subcollections = await userDocRef.listCollections();
  
        for (const subcollection of subcollections) {
          const snapshot = await subcollection.get();
          const batch = admin.firestore().batch();
  
          snapshot.forEach((doc) => {
            batch.delete(doc.ref);
          });
  
          await batch.commit();
        }
  
        await userDocRef.delete();
      } catch (error) {
        throw new functions.https.HttpsError(
          "internal",
          "Error deleting user data"
        );
      }
    }
);



