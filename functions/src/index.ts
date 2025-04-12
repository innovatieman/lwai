// import * as admin from 'firebase-admin'
// // import * as functions from 'firebase-functions';

// // const serviceAccount = functions.config().serviceaccount.key;
// const serviceAccount = require('../keys/serviceAccountKey.json')

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// })

// process.env.GOOGLE_APPLICATION_CREDENTIALS = './configs/keys/speech-to-text.json';
// export const db = admin.firestore(); // Exporteer de Firestore database
// export default admin; // Exporteer de hele `admin`-module als standaard

// export files from submodules
export * from './auth/control'
export * from './auth/register'
export * from './configs/config-basics'
export * from './configs/config-openai'
export * from './logging/events'
export * from './utils/responder'
export * from './apis/gpt'
export * from './apis/openai'
export * from './apis/heygen'
export * from './auth/subscriptions'
export * from './maintenance/documents'
export * from './querys/information'
export * from './auth/courses'
export * from './maintenance/ratings'
export * from './payment/credits'
export * from './processing/mails'
export * from './apis/assemblyai'
export * from './apis/voice2text'
export * from './payment/courses'
export * from './storage/images'
export * from './storage/videos'
export * from './payment/subscriptions'
export * from './apis/gemini'
export * from './apis/ip'
export * from './apis/stripe'
export * from './processing/learnings'
export * from './apis/social'
export * from './processing/rendering'

