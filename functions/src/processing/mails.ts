import * as functions from 'firebase-functions/v1';
import { onRequest } from "firebase-functions/v2/https";
import admin from '../firebase'
const htmlToText = require('html-to-text');
const Handlebars = require('handlebars');
const { onCall, CallableRequest } = require("firebase-functions/v2/https");
import type { CallableRequest } from 'firebase-functions/lib/common/providers/https';
import moment from 'moment';
import { config } from '../configs/config-basics';

    
exports.emailsToSend = functions.region('europe-west1').runWith({ memory: '1GB' }).firestore
  .document('emailsToProcess/{emailId}')
  .onCreate(async (snap: any, context: any) => {
    const emailData = snap.data();
    const templateId = emailData.template;
    const language = emailData.language || 'en'; // Fallback naar Engels als geen taal is opgegeven

    // 1. Haal de main template op uit Firestore
    const mainTemplateDoc = await admin.firestore().collection('email_templates').doc('main').get();
    if (!mainTemplateDoc.exists) {
      throw new Error(`Main template not found`);
    }

    const mainTemplate = mainTemplateDoc.data();
    const compiledMainTemplate = Handlebars.compile(mainTemplate[language]);

    // 2. Haal de specifieke template op
    let subject = ''
    let body = ''
    let from = ''
    if(templateId){
      const templateDoc = await admin.firestore().collection('email_templates').doc(templateId).get();
      if (!templateDoc.exists) {
        throw new Error(`Template ${templateId} not found`);
      }

      const template = templateDoc.data();
      subject = template.subject[language] || template.subject['en']; // Fallback naar Engels
      body = template.body[language] || template.body['en']; // Fallback naar Engels
      from = template.from
    }
    else if(emailData.content){
      subject = emailData.content.subject,
      body = emailData.content.body
      from = emailData.content.from
    }

    if(emailData.from){
      from = emailData.from;
    }
    // 3. Vervang placeholders uit de specifieke template
    const compiledTemplate = Handlebars.compile(body);
    const filledTemplateContent = compiledTemplate(emailData.data);
    
    // 5. Vervang placeholders in het subject met de data
    const compiledSubject = Handlebars.compile(subject);
    const finalSubject = compiledSubject(emailData.data);

    // 4. Verwerk de main template met de inhoud van de specifieke template
    const finalHtml = compiledMainTemplate({
      content: filledTemplateContent,
      title: finalSubject,
      subject: finalSubject,
      year: new Date().getFullYear(),
      emailId: emailData.data.emailId || '', // Voeg emailId toe voor tracking
      userId: emailData.data.userId || '', // Voeg userId toe voor tracking
      unsubscribe: emailData.data.unsubscribe || '',
    });


    // 6. Genereer de tekstversie uit de HTML
    const textBody = htmlToText.convert(finalHtml, {
      wordwrap: 130,  // Breek lange regels netjes af
      selectors: [
        { selector: 'a', options: { ignoreHref: true } }  // Links zonder URL weergeven
      ]
    });

    // 7. Bereid de e-mail voor verzending voor
    let emailContent: any = {
      to: emailData.to,
      bcc: 'logging@alicialabs.com',
      from: from,
      message: {
        subject: finalSubject,
        html: finalHtml,
        text: textBody
      },
      attachments:[]
    };
    if(emailData.replyTo){
      emailContent.replyTo = emailData.replyTo;
    }

    // 8. Voeg de e-mail toe aan de queue voor verzending
    await admin.firestore().collection('emailsToSend').add(emailContent);

    await snap.ref.delete();
    return;
  });


exports.testMailFlow = onCall(
{
  region: 'europe-west1',
  memory: '1GiB',
},
async (request: CallableRequest<any>,) => {
  const { auth,data } = request;
  // let tempList:any = []; 

  if (!auth || !auth.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  if (!data) {
    throw new functions.https.HttpsError('invalid-argument', 'Data must be provided');
  }


  //////////////////////////////////////////////
  /// get mailflows
  //////////////////////////////////////////////

  const mailflowsSnapshot = await admin.firestore().collection('mailflow')
  .where('active', '==', true)
  .where('flow', '==', 'registration')
  .get();

  if (mailflowsSnapshot.empty) {
    throw new functions.https.HttpsError('not-found', 'No active mail flows found');
  }

  const mailflows = mailflowsSnapshot.docs.map((doc:any) => ({id: doc.id, ...doc.data()}));
  if (mailflows.length === 0) {
    throw new functions.https.HttpsError('not-found', 'No mail flows found');
  }

  //////////////////////////////////////////////
  /// get email templates
  //////////////////////////////////////////////
  const mainTemplateDoc = await admin.firestore().collection('email_templates').doc('main').get();
  if (!mainTemplateDoc.exists) {
    throw new Error(`Main template not found`);
  }
  const templateId = 'free';
  const mainTemplate = mainTemplateDoc.data();
  const templateDoc = await admin.firestore().collection('email_templates').doc(templateId).get();
  if (!templateDoc.exists) {
    throw new Error(`Template ${templateId} not found`);
  }
  // const template = templateDoc.data();


  //////////////////////////////////////////////
  /// start mailflow loop
  //////////////////////////////////////////////
  await Promise.all(mailflows.map(async (mailflow:any) => {
    try{

      //////////////////////////////////////////////
      /// get users registered in the last X days
      //////////////////////////////////////////////
      let startDate = moment().subtract(mailflow.days, 'days').unix();
      let endDate =  moment().subtract(mailflow.days - 1, 'days').unix();

      const query = admin.firestore().collection('users')
        .where('registeredAt', '>=', startDate)
        .where('registeredAt', '<=', endDate)
        .orderBy('registeredAt', 'desc')
        .limit(100);

      const snapshot = await query.get();
      const users = snapshot.docs.map((doc:any) => ({ uid: doc.id, ...doc.data() }));

      if (users.length === 0) {
        console.log(`No users found for mail flow: ${mailflow.flow} for days: ${mailflow.days}`);
        return;
      }
      
      //////////////////////////////////////////////
      /// Prepare email content for each user
      //////////////////////////////////////////////
      for(const user of users) {
        await handleUser(user, mailflow, mainTemplate);
      };
    } catch (error) {
      console.error(`Error processing mail flow ${mailflow.flow} for days ${mailflow.days}:`, error);
      // throw new functions.https.HttpsError('internal', `Error processing mail flow: ${error.message}`);
    }
  }))

  return 'success';
})

exports.userMessages = functions.region('europe-west1').runWith({ memory: '1GB' }).firestore
  .document('user_messages/{emailId}')
  .onCreate(async (snap: any, context: any) => {
    const emailData = snap.data();

    let message = emailData.message || '';
    message = 'Er is een nieuw bericht van ' + emailData.displayName + ' (' + emailData.email + ')<br><br>' + message;
    if(emailData.url){
      message += `<br><br>Verzonden vanaf pagina: ${emailData.url}`;
    }
    if(emailData.attachment){
      message += `<br><br><a href="${emailData.attachment}" target="_blank">Download Attachment</a>`;
    }

    let subject = emailData.subject || 'Nieuw bericht van ' + emailData.displayName;
    subject = emailData.type + ': ' + subject;

    const emailToSend = {
      to: 'customerservice@alicialabs.com',
      bcc: 'logging@alicialabs.com',
      template: 'free',
      language: 'nl',
      data: {
        content: message,
        subject: subject,
      },
      subject: subject,
      replyTo: emailData.email,
    }

    // 8. Voeg de e-mail toe aan de queue voor verzending
    await admin.firestore().collection('emailsToProcess').add(emailToSend);

    return;
  });

async function userIsRecipient(user: any, mailflow: any): Promise<boolean> {
  
  
  //////////////////////////////////////////////////////
  /// Check if user has already received the email
  //////////////////////////////////////////////////////
  const receivedEmailsRef = admin.firestore().collection('users').doc(user.uid).collection('mailflow')
    .where('id', '==', mailflow.id);

  const receivedEmailsSnapshot = await receivedEmailsRef.get();
  if(!receivedEmailsSnapshot.empty){
    return false; // User has already received the email
  }


    //////////////////////////////////////////////////////
  /// Check if user has an account
  //////////////////////////////////////////////////////
  if(!user.email){
    console.error(`User ${user.uid} does not have an email address`);
    return false; // User does not have an email address
  }
  const userAccount:any = await admin.auth().getUserByEmail(user.email)
  .catch((error: any): null => {
    console.error(`Error fetching user by email ${user.email}:`, error);
    return null; // User not found or error occurred
  });
  if(!userAccount){
    console.error(`User ${user.email} not found in auth`);
    return false; // User not found in auth
  }



  //////////////////////////////////////////////////////
  /// Check if user is a recipient based on training criteria
  //////////////////////////////////////////////////////
  if(mailflow.exclude?.has_training || mailflow.exclude?.has_no_training){
    const participantsRef = admin.firestore().collectionGroup('participants')
      .where('email', '==', user.email);

    const participantsSnapshot = await participantsRef.get();
    if(!participantsSnapshot.empty && mailflow.exclude?.has_training){
      return false; // User is a recipient
    }
    if(participantsSnapshot.empty && mailflow.exclude?.has_no_training){
      return false; // User is a recipient
    }
  }

  //////////////////////////////////////////////////////
  /// Check if user is a recipient based on organisation date
  //////////////////////////////////////////////////////
  if(mailflow.exclude?.has_organisation || mailflow.exclude?.has_no_organisation){
    const organisationsRef = admin.firestore().collectionGroup('employees')
      .where('email', '==', user.email);

    const organisationsSnapshot = await organisationsRef.get();
    if(!organisationsSnapshot.empty && mailflow.exclude?.has_organisation){
      return false; // User is a recipient
    }
    if(organisationsSnapshot.empty && mailflow.exclude?.has_no_organisation){
      return false; // User is a recipient
    }
  }

  //////////////////////////////////////////////////////
  /// Check if user is a recipient based on conversation criteria
  //////////////////////////////////////////////////////
  if(mailflow.exclude?.has_conversation || mailflow.exclude?.has_no_conversation){
    const conversationsRef = admin.firestore().collection('users').doc(user.uid).collection('conversations');

    const conversationsSnapshot = await conversationsRef.get();
    if(!conversationsSnapshot.empty && mailflow.exclude?.has_conversation){
      return false; // User is a recipient
    }
    if(conversationsSnapshot.empty && mailflow.exclude?.has_no_conversation){
      return false; // User is a recipient
    }
  }

    //////////////////////////////////////////////////////
  /// Check if user is a recipient based on customer criteria
  //////////////////////////////////////////////////////
  if(mailflow.exclude?.is_customer || mailflow.exclude?.is_no_customer){
    const customersRef = admin.firestore().collection('customers').doc(userAccount.uid).collection('payments')

    const customersSnapshot = await customersRef.get();
    if(!customersSnapshot.empty && mailflow.exclude?.is_customer){
      return false; // User is a recipient
    }
    if(customersSnapshot.empty && mailflow.exclude?.is_no_customer){
      return false; // User is a recipient
    }
  }

  return true; // User is a recipient

}

async function handleUser(user: any, mailflow: any, mainTemplate: any): Promise<void> {
  const userData = {
    displayName: user.displayName || 'User',
    email: user.email || '<Email>',
  };

  const isRecipient = await userIsRecipient(user, mailflow);
  if (!isRecipient) {
    console.log(`User ${user.uid} is not a recipient for mail flow: ${mailflow.flow}`);
    return;
  }

  const compiledSubject = Handlebars.compile(mailflow.subject);
  const compiledBody = Handlebars.compile(mailflow.body);

  const finalSubject = compiledSubject(userData);
  const finalBody = compiledBody(userData);

  const finalHtml = Handlebars.compile(mainTemplate[user.language || 'en'])({
    content: finalBody,
    title: finalSubject,
    subject: finalSubject,
    year: new Date().getFullYear(),
    unsubscribe: "<a href='https://conversation.alicialabs.com/unsubscribe?userId=" + user.uid + "&emailFlow=" + mailflow.flow + "'>Unsubscribe</a>"
  });

  const textBody = htmlToText.convert(finalHtml, {
    wordwrap: 130,
    selectors: [{ selector: 'a', options: { ignoreHref: true } }],
  });

  const emailContent = {
    to: user.email,
    from: mailflow.from,
    bcc: 'logging@alicialabs.com',
    message: {
      subject: finalSubject,
      html: finalHtml,
      text: textBody,
    },
  };

  try {
    await Promise.all([
      admin.firestore().collection('emailsToSend').add(emailContent),
      admin.firestore().collection('users').doc(user.uid).collection('mailflow').add({
        id: mailflow.id,
        flow: mailflow.flow,
        days: mailflow.days,
      }),
    ]);
    console.log(`Email prepared for user ${user.uid} - ${user.email}`);
  } catch (err) {
    console.error(`Failed to write email or log for user ${user.uid}:`, err);
  }
}

exports.emailOpenTracker = onRequest(
  { cors: config.allowed_cors, region: "europe-west1" , memory: '4GiB', timeoutSeconds: 540},
  async (req: any, res: any) => {
    const { userId, emailId } = req.query;

    if (!userId || !emailId) {
      console.error('Missing userId or mailId in query parameters');
      const img = Buffer.from(
        'R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
        'base64'
      );
      res.set('Content-Type', 'image/gif');
      res.send(img);
      return; //res.status(400).send('Missing parameters');
    }

    const db = admin.firestore();
    const docId = `open_${userId}_${emailId}`;

    const docRef = db.collection('emailEvents').doc(docId);
    const doc = await docRef.get();

    if (!doc.exists) {
      await docRef.set({
        type: 'open',
        userId,
        emailId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userAgent: req.get('User-Agent') || '',
        ip: req.ip || '',
      });
  }


    // return a 1x1 transparent GIF
    const img = Buffer.from(
      'R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
      'base64'
    );
    res.set('Content-Type', 'image/gif');
    res.send(img);
});

exports.emailUnsubscribe = onRequest(
  { cors: config.allowed_cors, region: "europe-west1" , memory: '4GiB', timeoutSeconds: 540},
  async (req: any, res: any) => {
    const { userId, emailFlow } = req.body;

    if (!userId || !emailFlow) {
      console.error('Missing userId or emailFlow in query parameters');
      return res.status(400).send('Missing parameters');
    }

    try {
      const userRef = admin.firestore().collection('users').doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        console.error(`User ${userId} not found`);
        return res.status(404).send('User not found');
      }
      await userRef.collection('mailflow').doc(emailFlow).set({
        unsubscribed: true,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      console.log(`User ${userId} unsubscribed from email flow: ${emailFlow}`);
      return res.status(200).send('Unsubscribed successfully');
    } catch (error) {
      console.error(`Failed to unsubscribe user ${userId} from email flow ${emailFlow}:`, error);
      return res.status(500).send('Internal Server Error');
    }
  }
);

exports.sendEmailToTrainer = functions.region('europe-west1').runWith({ memory: '1GB' }).https.onCall(async (data, context) => {
  const { trainerId, subject, content } = data;

  
  // Validatie
  if (!context.auth || !context.auth.token.email) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }
  const userRef = admin.firestore().collection('users').doc(context.auth.uid);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found.');
  }
  const userData = userDoc.data();
  const displayNameUser = userData?.displayName || 'Unknown User';

  if (!trainerId || !subject || !content) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing data fields.');
  }

  const trainerDoc = await admin.firestore().collection('trainers').doc(trainerId).get();

  if (!trainerDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Trainer not found');
  }

  const trainerData = trainerDoc.data();
  let trainerEmail = trainerData?.email || null;

  // Indien trainer geen e-mail heeft, pak de eerste admin
  if (!trainerEmail && Array.isArray(trainerData?.admins) && trainerData.admins.length > 0) {
    const firstAdminId = trainerData.admins[0];

    const adminUserDoc = await admin.firestore().collection('users').doc(firstAdminId).get();
    const adminUserData = adminUserDoc.data();

    if (adminUserData?.email) {
      trainerEmail = adminUserData.email;
    }
  }

  if (!trainerEmail) {
    throw new functions.https.HttpsError('not-found', 'No valid email found for trainer or first admin');
  }

  // Bouw emaildocument
  const emailDoc = {
    to: trainerEmail,
    bcc: 'logging@alicialabs.com',
    template: 'free',
    language: 'en',
    data: {
      content,
      subject:'You have a message from ' + displayNameUser + ': ' + subject,
    },
    subject,
    replyTo: context.auth.token.email,
  };

  await admin.firestore().collection('emailsToProcess').add(emailDoc);

  return { success: true };
});

exports.messagesToUser = functions.region('europe-west1').runWith({ memory: '1GB' }).firestore
  .document('message_to_user/{emailId}')
  .onCreate(async (snap: any, context: any) => {
    const email = snap.data();

    let messageToProcess:any = {}

    console.log('New message to user', JSON.stringify(email));

    const userRef = await admin.firestore().collection('users').doc(email.userId);
    const userRefDoc = await userRef.get();
    if (!userRefDoc.exists) {
      console.error(`User ${email.userId} not found`);
      return;
    }
    const userData = userRefDoc.data();
    if(!userData?.email){
      console.error(`User ${email.userId} does not have an email`);
      return;
    }
    messageToProcess.to = userData.email;
    messageToProcess.from = 'AliciaLabs E-Trainings <alicia@alicialabs.com>';
    messageToProcess.bcc = 'logging@alicialabs.com';
    messageToProcess.template = 'free';
    messageToProcess.language = email.language || 'en';

    console.log('Processing message to user', email.userId, email.type);
    
    if(email.type === 'elearning_activated'){
      const elearningRef = await userRef.collection('my_elearnings').where('elearningId', '==', email.data.elearningId);
      const elearningRefDoc = await elearningRef.get();

      if (elearningRefDoc.empty) {
        console.error(`Elearning ${email.data.elearningId} not found for user ${email.userId}`);
        return;
      }
      let elearnings:any = [];
      elearningRefDoc.forEach((doc:any) => {
        elearnings.push(doc.data());
      });
      elearnings = elearnings.sort((a:any,b:any) => b.created - a.created);


      const elearningData = elearnings[0];
      if(!elearningData?.elearningId){
        console.error(`Elearning ${email.data.elearningId} does not have a elearningId`);
        return;
      }

      let contentStart = ''
      if(email.language === 'nl'){
        if(email.displayName){
          contentStart = 'Beste ' + email.displayName + ',<br><br>';
        }
        contentStart += 'Je hebt toegang gekregen tot de e-training <strong>' + (elearningData.title || '') + '</strong> van ' + (elearningData.trainer.name || '') + '.<br><br>';
        messageToProcess.subject = `Welkom bij '${(elearningData.title || '')}' van ${elearningData.trainer.name || ''}`;
      }
      else if(email.language === 'en'){
        if(email.displayName){
          contentStart = 'Dear ' + email.displayName + ',<br><br>';
        }
        contentStart += 'You have been given access to the e-training <strong>' + (elearningData.title || '') + '</strong> by ' + (elearningData.trainer.name || '') + '.<br><br>';
        messageToProcess.subject = `Welcome to '${(elearningData.title || '')}' by ${elearningData.trainer.name || ''}`;
      }

      messageToProcess.data = {
        content: contentStart + (elearningData.welcome_message || ''),
        subject: messageToProcess.subject,
      }

      if(email.buttons){
        let btnHtml = '<br><br>';

        if(email.buttons.length==1){
          btnHtml += '<div style="text-align:center;padding:0px 20px;">'; 
        }
        else{
          btnHtml += '<div style="display:flex;justify-content:center;flex-wrap:wrap">';
        }

        email.buttons.forEach((btn:any) => {
          btnHtml += `<a href="${btn.url}" style="display:inline-block;width:calc(100% - 40px);padding:10px 20px;margin:5px 10px;background-color:${btn.backgroundColor};color:${btn.textColor};text-decoration:none;border-radius:16px;font-weight:bold;font-size:16px">${btn.text}</a>`;
        });

        btnHtml += '</div><br><br>';

        messageToProcess.data.content += btnHtml;
      }

    }

    console.log('Final message to user', JSON.stringify(messageToProcess));

    if(messageToProcess.subject && messageToProcess.data?.content){
      await admin.firestore().collection('emailsToProcess').add(messageToProcess);
    }

    return;
  });


// function getLastestConversationUser(userId: string): Promise<any> {
//   return new Promise(async (resolve, reject) => {
//     try {
//       const conversationsRef = admin.firestore().collection('users').doc(userId).collection('conversations')
//         .orderBy('lastMessageAt', 'desc')
//         .limit(3)
//       const snapshot = await conversationsRef.get();
//       if (snapshot.empty) {
//         resolve([]);
//         return;
//       }
//       let conversations: any[] = [];
//       snapshot.forEach(doc => {
//         conversations.push({ id: doc.id, ...doc.data() });
//       });
//       resolve(conversations);
//     } catch (error) {
//       reject(error);
//     }
//   });
// }

