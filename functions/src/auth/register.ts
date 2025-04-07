import * as functions from 'firebase-functions/v1';
import admin from '../firebase'
import * as moment from 'moment'
import * as responder from '../utils/responder'

exports.userRegister = functions.region('europe-west1').auth.user().onCreate(
    (user:any,context:any)=>{
      let firstName = ''
      if(user.displayName){
        firstName = user.displayName.split(' ')[0]
      }
      else{
        firstName = user.email.split('@')[0].split('.')[0]
      }
      let userObj:any = {
        email:user.email,
        displayName:firstName,
        registeredAt:moment().unix(),
        isAdmin:false,
        isConfirmed:true,
        filter:{
          subjects:[],
          subjectTypes:[],
          types:[],
        }
      }
      
      return admin.firestore().collection('users').doc(user.uid).set(userObj)
        .then(()=>{
          const basicSubscription = {
              type: "basic",
              period: "unlimited",
              startDate: admin.firestore.Timestamp.now(),
              endDate: admin.firestore.Timestamp.fromDate(
                  new Date(admin.firestore.Timestamp.now().toDate().getTime() + 7 * 24 * 60 * 60 * 1000 * 52 * 100)
                ),
              status: "active",
          };


          const credits = {
            total: 300,
            lastUpdated: admin.firestore.Timestamp.now(),
          };

          const skills = {
            impact: {
              score: 40,
              prevScore:40
            },
            flow: {
              score: 40,
              prevScore:40
            },
            logic: {
              score: 40,
              prevScore:40
            }
          };

          try {
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
  console.log('not anymore')
  return
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
    language: 'nl',
    data: {
      name: displayName,
      verificationLink: customLink
    }
  };

  // Voeg de e-mail toe aan de Firestore collectie
  await admin.firestore().collection('emailsToProcess').add(emailData);
});


exports.sendVerificationEmailLanguage = functions.region('europe-west1').firestore.document('user_languages/{userId}')
.onCreate(async (change, context) => {
  const data = change.data();
  const email = data.email;
  let language = data.language || 'en';
  const displayName = '';

  const existingLangRef = admin.firestore().collection('languages').doc(language);
  const existingLang = await existingLangRef.get();
  if(!existingLang.exists){
    language = 'en';
  }

  const user = await admin.auth().getUserByEmail(email);
  console.log(`Updating user ${user.uid} with language ${language}`);

  const userRef = admin.firestore().collection('users').doc(user.uid);
  await userRef.update({
    language: language
  });


  if (user.emailVerified) {
    console.log(`Skipping verification email for verified user: ${email}`);
    return; // Geen verificatiemail sturen als al geverifieerd
  }
  
  const actionCodeSettings = {
    url: 'https://conversation.alicialabs.com/verify', // Gebruik je eigen domein of localhost
  };

  // Genereer de verificatielink
  const link = await admin.auth().generateEmailVerificationLink(email,actionCodeSettings);

  //create 6 digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  //expires in 30 moment.min
  await admin.firestore().collection('email_verification_codes').doc(email).set({
    code:code,
    createdAt:Date.now(),
    expiresAt:Date.now() + 30 * 60 * 1000
  })
  // Haal de oobCode uit de gegenereerde link
  const urlParams = new URLSearchParams(link.split('?')[1]);
  const oobCode = urlParams.get('oobCode');

  // Bouw de aangepaste verificatielink
  const customLink = `https://conversation.alicialabs.com/verify?oobCode=${oobCode}`;

  // Dynamische gegevens voor de template
  const emailData = {
    to: email,
    template: 'verify_email',
    language: language,
    data: {
      name: displayName,
      verificationLink: customLink
    }
  };

  // Voeg de e-mail toe aan de Firestore collectie
  await admin.firestore().collection('emailsToProcess').add(emailData);

  await admin.firestore().collection('user_languages').doc(change.id).delete();
});

exports.reSendVerificationEmail = functions.region('europe-west1').https.onCall(async (data, context) => {
  const email = data.email;
  const displayName = data.displayName || 'User';

  const user = await admin.firestore().collection('users').where('email', '==', email).get();
  if (user.empty) {
    return new responder.Message('User not found', 404);
  }
  const userData = user.docs[0].data();
  let language = userData.language || 'en';

  console.log(`Resending verification email to ${email} in language ${language}`);

  //create 6 digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  //expires in 30 moment.min
  await admin.firestore().collection('email_verification_codes').doc(email).set({
    code:code,
    createdAt:Date.now(),
    expiresAt:Date.now() + 30 * 60 * 1000
  })
  
  const actionCodeSettings = {
    url: 'https://conversation.alicialabs.com/verify', // Gebruik je eigen domein of localhost
  };

  // Genereer de verificatielink
  const link = await admin.auth().generateEmailVerificationLink(email,actionCodeSettings);

  console.log(`Generated link: ${link}`);

  // Haal de oobCode uit de gegenereerde link
  const urlParams = new URLSearchParams(link.split('?')[1]);
  console.log(`URL params: ${urlParams}`);
  const oobCode = urlParams.get('oobCode');

  console.log(`oobCode: ${oobCode}`);
  // Bouw de aangepaste verificatielink
  const customLink = `https://conversation.alicialabs.com/verify?oobCode=${oobCode}`;

  // Dynamische gegevens voor de template
  const emailData = {
    to: email,
    template: 'verify_email',
    language: language,
    data: {
      name: displayName,
      verificationLink: customLink
    }
  };

  console.log(`Sending email to ${email} with link ${customLink}`);
  // Voeg de e-mail toe aan de Firestore collectie
  await admin.firestore().collection('emailsToProcess').add(emailData);
  
  console.log(`Email sent to ${email}`);
  
  return new responder.Message('Success', 200);
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

exports.editUserLang = functions.region('europe-west1').https.onCall(async (data,context)=>{
  const language = data.language
  const uid = context.auth?.uid

  if(!uid){
    return new responder.Message('Not authorized', 500);
  }

  await admin.firestore().collection('users').doc(uid).update({
    language:language
  })
  
  return new responder.Message('Success', 200);
})

exports.editUserCountry = functions.region('europe-west1').https.onCall(async (data,context)=>{
  const country = data.country
  const uid = context.auth?.uid

  if(!uid){
    return new responder.Message('Not authorized', 500);
  }

  await admin.firestore().collection('users').doc(uid).update({
    country:country
  })
  
  return new responder.Message('Success', 200);
})

exports.editUserCurrency = functions.region('europe-west1').https.onCall(async (data,context)=>{
  const currency = data.currency
  const uid = context.auth?.uid

  if(!uid){
    return new responder.Message('Not authorized', 500);
  }

  await admin.firestore().collection('users').doc(uid).update({
    currency:currency
  })
  
  return new responder.Message('Success', 200);
})

exports.editUserFilter = functions.region('europe-west1').https.onCall(async (data,context)=>{
  const filter = data.filter
  const uid = context.auth?.uid

  if(!uid){
    return new responder.Message('Not authorized', 500);
  }

  await admin.firestore().collection('users').doc(uid).update({
    filter:filter
  })
  
  return new responder.Message('Success', 200);
})

exports.verifyEmailInitCode = functions.region('europe-west1').https.onCall(async (data, context) => {
  const { email, code } = data;

  if (!email || !code) {
    throw new functions.https.HttpsError("invalid-argument", "Email en code zijn verplicht.");
  }

  const docRef = admin.firestore().collection("email_verification_codes").doc(email);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Geen verificatieverzoek gevonden.");
  }

  const { code: storedCode, expiresAt } = docSnap.data() as {
    code: string;
    expiresAt: number;
  };

  const now = Date.now();

  if (now > expiresAt) {
    await docRef.delete();
    return new responder.Message("code expired", 500);
  }

  if (code !== storedCode) {
    return new responder.Message("code not valid", 500);
  }

  // Zoek de gebruiker op basis van e-mailadres
  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
  } catch (err) {
    return new responder.Message("user not found", 500);
  }

  // Zet emailVerified op true
  await admin.auth().updateUser(userRecord.uid, { emailVerified: true });

  // Verwijder de code
  await docRef.delete();
  return new responder.Message("email verified", 200);
});