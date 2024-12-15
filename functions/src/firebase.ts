import * as admin from 'firebase-admin';

// Laad je serviceaccount-credentials
const serviceAccount = require('../keys/serviceAccountKey.json');

// Initialiseer de Firebase Admin SDK als het nog niet is gebeurd
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Exporteer admin en db
export const db = admin.firestore();
export default admin;