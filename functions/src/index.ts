// import * as admin from 'firebase-admin'
// // import * as functions from 'firebase-functions';

// // const serviceAccount = functions.config().serviceaccount.key;
// const serviceAccount = require('../keys/serviceAccountKey.json')

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// })


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

