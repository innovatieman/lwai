import * as functions from 'firebase-functions/v1';
import admin from '../firebase'
const htmlToText = require('html-to-text');
const Handlebars = require('handlebars');

// exports.emailsToSend = functions.region('europe-west1').firestore
//   .document('emailsToProcess/{emailId}')
//   .onCreate(async (snap:any, context:any) => {
//     const emailData = snap.data();
//     const templateId = emailData.template;
//     const language = emailData.language || 'en'; // Fallback naar Engels als geen taal is opgegeven

//     // Haal de juiste template op uit Firestore
//     const templateDoc = await admin.firestore().collection('email_templates').doc(templateId).get();
//     if (!templateDoc.exists) {
//       throw new Error(`Template ${templateId} not found`);
//     }

//     const template = templateDoc.data();
//     const subject = template.subject[language] || template.subject['en']; // Fallback naar Engels
//     const body = template.body[language] || template.body['en']; // Fallback naar Engels

//     // Vervang de placeholders in de body en subject met de opgegeven data
//     const compiledSubject = Handlebars.compile(subject);
//     const compiledBody = Handlebars.compile(body);

//     let emailContent:any = {
//       to: emailData.to,
//       from: template.from,
//       message:{
//         subject: compiledSubject(emailData.data),
//         html: compiledBody(emailData.data),
//       }
//     };

//     const textBody = htmlToText.convert(emailContent.html, {
//         wordwrap: 130,  // Breek lange regels netjes af
//         selectors: [
//           { selector: 'a', options: { ignoreHref: true } }  // Links zonder URL weergeven
//         ]
//       });

//       emailContent.message.text = textBody;

//     admin.firestore().collection('emailsToSend').add(emailContent);
//     return;

// });
    
exports.emailsToSend = functions.region('europe-west1').firestore
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
    const templateDoc = await admin.firestore().collection('email_templates').doc(templateId).get();
    if (!templateDoc.exists) {
      throw new Error(`Template ${templateId} not found`);
    }

    const template = templateDoc.data();
    const subject = template.subject[language] || template.subject['en']; // Fallback naar Engels
    const body = template.body[language] || template.body['en']; // Fallback naar Engels

    // 3. Vervang placeholders uit de specifieke template
    const compiledTemplate = Handlebars.compile(body);
    const filledTemplateContent = compiledTemplate(emailData.data);

    // 4. Verwerk de main template met de inhoud van de specifieke template
    const finalHtml = compiledMainTemplate({
      content: filledTemplateContent,
      title: subject,
      year: new Date().getFullYear()
    });

    // 5. Vervang placeholders in het subject met de data
    const compiledSubject = Handlebars.compile(subject);
    const finalSubject = compiledSubject(emailData.data);

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
      from: template.from,
      message: {
        subject: finalSubject,
        html: finalHtml,
        text: textBody
      }
    };

    // 8. Voeg de e-mail toe aan de queue voor verzending
    await admin.firestore().collection('emailsToSend').add(emailContent);
    return;
  });