import * as functions from 'firebase-functions/v1';
import admin from '../firebase'
import * as moment from 'moment'
import * as responder from '../utils/responder'

exports.userRegister = functions.region('europe-west1').auth.user().onCreate(
    (user:any,context:any)=>{
      let userObj:any = {
        email:user.email,
        displayName:user.displayName || user.email.split('@')[0],
        registeredAt:moment().unix(),
        isAdmin:false,
        isConfirmed:false,
        preferences:{
          themes:{
            basic:true,
            nature:true,
          }
        }
      }
      
      return admin.firestore().collection('users').doc(user.uid).set(userObj)
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
            lastUpdated: admin.firestore.Timestamp.now(),
          };

          const skills = {
            impact: {
              score: 0,
              prevScore:0
            },
            flow: {
              score: 0,
              prevScore:0
            },
            logic: {
              score: 0,
              prevScore:0
            }
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
              .doc('credits').set(credits);

            admin.firestore()
              .collection("users")
              .doc(user.uid)
              .collection("skills")
              .doc('skills').set(skills);

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

exports.sendVerificationEmail = functions.region('europe-west1').auth.user().onCreate(async (user) => {
  const email = user.email;
  const displayName = user.displayName || 'User';

  if (user.emailVerified) {
    console.log(`Skipping verification email for verified user: ${email}`);
    return; // Geen verificatiemail sturen als al geverifieerd
  }
  
  const actionCodeSettings = {
    url: 'https://conversation.alicialabs.com/verify', // Gebruik je eigen domein of localhost
  };

  // Genereer de verificatielink
  const link = await admin.auth().generateEmailVerificationLink(email,actionCodeSettings);

  // Haal de oobCode uit de gegenereerde link
  const urlParams = new URLSearchParams(link.split('?')[1]);
  const oobCode = urlParams.get('oobCode');

  // Bouw de aangepaste verificatielink
  const customLink = `https://conversation.alicialabs.com/verify?oobCode=${oobCode}`;

  // Dynamische gegevens voor de template
  const emailData = {
    to: email,
    template: 'verify_email',
    data: {
      name: displayName,
      verificationLink: customLink
    }
  };

  // Voeg de e-mail toe aan de Firestore collectie
  await admin.firestore().collection('emailsToProcess').add(emailData);
});

exports.reSendVerificationEmail = functions.region('europe-west1').https.onCall(async (data, context) => {
  const email = data.email;
  const displayName = data.displayName || 'User';

  const actionCodeSettings = {
    url: 'https://conversation.alicialabs.com/verify', // Gebruik je eigen domein of localhost
  };

  // Genereer de verificatielink
  const link = await admin.auth().generateEmailVerificationLink(email,actionCodeSettings);

  // Haal de oobCode uit de gegenereerde link
  const urlParams = new URLSearchParams(link.split('?')[1]);
  const oobCode = urlParams.get('oobCode');

  // Bouw de aangepaste verificatielink
  const customLink = `https://conversation.alicialabs.com/verify?oobCode=${oobCode}`;

  // Dynamische gegevens voor de template
  const emailData = {
    to: email,
    template: 'verify_email',
    data: {
      name: displayName,
      verificationLink: customLink
    }
  };

  // Voeg de e-mail toe aan de Firestore collectie
  await admin.firestore().collection('emailsToProcess').add(emailData);
});

exports.editUserName = functions.region('europe-west1').https.onCall(async (data,context)=>{
  const displayName = data.displayName
  const uid = context.auth?.uid

  if(!uid){
    return new responder.Message('Not authorized', 500);
  }

  await admin.auth().updateUser(uid,{
    displayName:displayName
  })

  await admin.firestore().collection('users').doc(uid).update({
    displayName:displayName
  })
  
  return new responder.Message('Success', 200);
})