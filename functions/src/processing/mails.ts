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
      from: from,
      message: {
        subject: finalSubject,
        html: finalHtml,
        text: textBody
      },
      attachments:[]
    };

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

    console.log(`Unsubscribing user ${userId} from email flow: ${emailFlow}`);

    try {
      await admin.firestore().collection('users').doc(userId).collection('mailflow').doc(emailFlow).set({
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
