import * as functions from 'firebase-functions/v1';
import admin from '../firebase'
import moment from 'moment'
import * as responder from '../utils/responder'

exports.userRegister = functions.region('europe-west1').runWith({memory:'1GB'}).auth.user().onCreate(
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
      if(user.email.startsWith('stream_') && user.email.endsWith('@alicialabs.com')){
        return null
      }
      return admin.firestore().collection('users').doc(user.uid).set(userObj)
        .then(async ()=>{
          const basicSubscription = {
              type: "basic",
              period: "unlimited",
              startDate: admin.firestore.Timestamp.now(),
              endDate: admin.firestore.Timestamp.fromDate(
                  new Date(admin.firestore.Timestamp.now().toDate().getTime() + 7 * 24 * 60 * 60 * 1000 * 52 * 100)
                ),
              status: "active",
          };
          let credits = {
            total: 300,
            amount: 300,
            lastUpdated: admin.firestore.Timestamp.now(),
            added:moment().unix(),
            created:moment().unix(),
            expires:moment().add(1,'year').unix(),
          };
          const deletedUsersRef = admin.firestore().collection('deletedUsers').doc(user.email)
          const deletedUsers = await deletedUsersRef.get()
          if (deletedUsers.exists) {
            credits.total = 0;
            deletedUsersRef.delete()
          }

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

// exports.sendVerificationEmail = functions.region('europe-west1').auth.user().onCreate(async (user) => {
//   console.log('not anymore')
//   return
//   const email = user.email;
//   const displayName = user.displayName || 'User';

//   if (user.emailVerified) {
//     console.log(`Skipping verification email for verified user: ${email}`);
//     return; // Geen verificatiemail sturen als al geverifieerd
//   }
  
//   const actionCodeSettings = {
//     url: 'https://conversation.alicialabs.com/verify', // Gebruik je eigen domein of localhost
//   };

//   // Genereer de verificatielink
//   const link = await admin.auth().generateEmailVerificationLink(email,actionCodeSettings);

//   // Haal de oobCode uit de gegenereerde link
//   const urlParams = new URLSearchParams(link.split('?')[1]);
//   const oobCode = urlParams.get('oobCode');

//   // Bouw de aangepaste verificatielink
//   const customLink = `https://conversation.alicialabs.com/verify?oobCode=${oobCode}`;

//   // Dynamische gegevens voor de template
//   const emailData = {
//     to: email,
//     template: 'verify_email',
//     language: 'nl',
//     data: {
//       name: displayName,
//       verificationLink: customLink
//     }
//   };

//   // Voeg de e-mail toe aan de Firestore collectie
//   await admin.firestore().collection('emailsToProcess').add(emailData);
// });


exports.sendVerificationEmailLanguage = functions.region('europe-west1').runWith({memory:'1GB'}).firestore.document('user_languages/{userId}')
.onCreate(async (change, context) => {
  const data = change.data();
  const email = data.email;
  let language = data.language || 'en';
  let displayName = '';

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

  displayName = user.displayName || '';
  if(!displayName && data.displayName){
    userRef.update({
      displayName: data.displayName
    });
  }

  if(data.buy && data.buy==true){
    await admin.auth().updateUser(user.uid,{emailVerified:true})
    console.log(`Skipping verification email for user who bought: ${email}`);
    return
  }

  const participantsRef = admin.firestore().collectionGroup('participants')
  const employeesRef = admin.firestore().collectionGroup('employees')
  
  const participantsSnapshot = await participantsRef.where('email', '==', email).get();
  const employeesSnapshot = await employeesRef.where('email', '==', email).get();
  if (!participantsSnapshot.empty || !employeesSnapshot.empty) {
      await admin.auth().updateUser(user.uid,{emailVerified:true})
      console.log(`Skipping verification email for verified user: ${email}`);
      return
  }


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
    bcc: 'logging@alicialabs.com',
    template: 'verify_email',
    language: language,
    data: {
      name: displayName,
      verificationLink: customLink,
      code: code,
      userId: user.uid,
      emailId: 'verification'
    }
  };

  // Voeg de e-mail toe aan de Firestore collectie
  await admin.firestore().collection('emailsToProcess').add(emailData);

  await admin.firestore().collection('user_languages').doc(change.id).delete();
});

exports.reSendVerificationEmail = functions.region('europe-west1').runWith({memory:'512MB'}).https.onCall(async (data, context) => {
  const email = data.email;
  const displayName = data.displayName || 'User';

  const user:any = await admin.firestore().collection('users').where('email', '==', email).get();
  if (user.empty) {
    return new responder.Message('User not found', 404);
  }
  const userData = user.docs[0].data();
  let language = userData.language || 'en';

  // console.log(`Resending verification email to ${email} in language ${language}`);

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

  // console.log(`Generated link: ${link}`);

  // Haal de oobCode uit de gegenereerde link
  const urlParams = new URLSearchParams(link.split('?')[1]);
  console.log(`URL params: ${urlParams}`);
  const oobCode = urlParams.get('oobCode');

  console.log(`oobCode: ${oobCode}`);
  // Bouw de aangepaste verificatielink
  const customLink = `https://conversation.alicialabs.com/verify?oobCode=${oobCode}`;

  // Dynamische gegevens voor de template
  let template = 'verify_email';
  if(data.template){
    template = data.template
  }
  const emailData = {
    to: email,
    bcc: 'logging@alicialabs.com',
    template: template,
    language: language,
    data: {
      name: displayName,
      verificationLink: customLink,
      code: code,
      userId: context.auth?.uid || '',
      emailId: 're-verification'
    }
  };

  console.log(`Sending email to ${email} with link ${customLink}`);
  // Voeg de e-mail toe aan de Firestore collectie
  await admin.firestore().collection('emailsToProcess').add(emailData);
  
  console.log(`Email sent to ${email}`);
  
  return new responder.Message('Success', 200);
});

exports.confirmMyEmail = functions.region('europe-west1').runWith({ memory: '1GB' }).https.onCall(async (data,context)=>{
  if(!context.auth){
    return new responder.Message('Not authorized', 500);
  }
  const uid = context.auth.uid
  if(!uid){
    return new responder.Message('Not authorized', 500);
  }
  await admin.auth().updateUser(uid,{emailVerified:true})
  
  return new responder.Message('Success', 200);
})

exports.editUserName = functions.region('europe-west1').runWith({ memory: '512MB' }).https.onCall(async (data,context)=>{
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

exports.editUserLang = functions.region('europe-west1').runWith({ memory: '512MB' }).https.onCall(async (data,context)=>{
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

exports.editUserCountry = functions.region('europe-west1').runWith({ memory: '512MB' }).https.onCall(async (data,context)=>{
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

exports.editUserCurrency = functions.region('europe-west1').runWith({ memory: '512MB' }).https.onCall(async (data,context)=>{
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

exports.editUserFilter = functions.region('europe-west1').runWith({ memory: '512MB' }).https.onCall(async (data,context)=>{
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

exports.passwordChangeCustom = functions.region('europe-west1').runWith({ memory: '1GB' }).https.onCall((data,context)=>{
  return admin.auth().getUser(context.auth.uid)
  .then(user=>{
      return admin.auth().updateUser(user.uid,{
          password:data.password
      })
  })
  .then(()=>{
      return new responder.Message('Wachtwoord gewijzigd')
  })
  .catch((err:any)=>{
      return new responder.Message(err,err.code)
  })
})


exports.verifyEmailInitCode = functions.region('europe-west1').runWith({ memory: '1GB' }).https.onCall(async (data, context) => {
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

  const oobCodePassword = await admin.auth().createCustomToken(userRecord.uid)

  // Zet emailVerified op true
  await admin.auth().updateUser(userRecord.uid, { emailVerified: true });

  // Verwijder de code
  await docRef.delete();
  return new responder.Message({message:"email verified",oobCode:oobCodePassword}, 200);
});

exports.deleteSelf = functions.region('europe-west1').runWith({ memory: '1GB' }).https.onCall(async (data, context) => {
  if(!context.auth){
    return new responder.Message('Not authorized', 500);
  }
  const uid = context.auth.uid
  const email = context.auth.token.email
  const user = await admin.auth().getUser(uid)
  if(!user){
    return new responder.Message('User not found', 404);
  }
  await admin.firestore().collection('deletedUsers').doc(email).set({
    deletedAt:Date.now(),
  })
  await admin.auth().deleteUser(uid)
  return new responder.Message('User deleted', 200);
})

exports.checkOffer = functions.region('europe-west1').runWith({ memory: '512MB' }).https.onCall(async (data, context)=>{
  const code = data.code
  const uid = context.auth?.uid

  if(!uid){
    return new responder.Message('Not authorized', 500);
  }

  const offer = await admin.firestore().collection('specialCodes').doc(code).get()
  if(!offer.exists){
    await admin.firestore().collection('users').doc(uid).collection('offers').doc(code).set({
      code:code,
      createdAt:Date.now(),
      status:'not found',
    })
    return new responder.Message('Offer not found', 404);
  }

  const offerData = offer.data()

  if(offerData?.expires && offerData?.expires < (Date.now()/1000)){
    await admin.firestore().collection('users').doc(uid).collection('offers').doc(code).set({
      code:code,
      createdAt:Date.now(),
      status:'expired'
    })
    return new responder.Message('Offer expired', 500);
  }

  const usedOfferRef = await admin.firestore().collection('users').doc(uid).collection('offers').doc(code).get()
  if(usedOfferRef.exists){
    return new responder.Message('Offer already used', 500);
  }

  await admin.firestore().collection('users').doc(uid).collection('offers').doc(code).set({
    code:code,
    createdAt:Date.now(),
    credits:offerData?.credits || 0,
  })

  if(offerData?.credits){
    await admin.firestore().collection('users').doc(uid).collection('credits').add({
      type:'offer',
      offerCode:code,
      total:offerData?.credits,
      amount:offerData?.credits,
      added:moment().unix(),
      created:moment().unix(),
      expires:moment().add(1,'year').unix(),
    })

  }

  return new responder.Message('Offer added', 200);
})

exports.clearDeletedUsers = functions.region('europe-west1').runWith({ memory: '1GB' })
  .pubsub.schedule('1 1 1 * *') // Elke zaterdag om 04:00 uur
  .timeZone('Europe/Amsterdam')
  .onRun(async (context) => {
    // get deletedUsers die langer dan 90 dagen geleden zijn aangemaakt
    const deletedUsersRef = admin.firestore().collection('deletedUsers').where('deletedAt', '<=', Date.now() - 90 * 24 * 60 * 60 * 1000)
    const deletedUsers = await deletedUsersRef.get()
    const batch = admin.firestore().batch()
    deletedUsers.forEach((doc) => {
      batch.delete(doc.ref)
    })
    await batch.commit()
    return null
  }); 