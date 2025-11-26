import { onSchedule } from 'firebase-functions/v2/scheduler';
const { onCall, CallableRequest } = require("firebase-functions/v2/https");
import type { CallableRequest } from 'firebase-functions/lib/common/providers/https';
import { Storage } from '@google-cloud/storage';
import * as Firestore from '@google-cloud/firestore';
import * as logger from 'firebase-functions/logger';
// import { config } from '../configs/config-basics';
import { db } from "../firebase";
// import * as responder from '../utils/responder'
import { HttpsError } from 'firebase-functions/v2/https';

const PROJECT_ID = 'lwai-3bac8'; // Vervang dit door je project ID
const BUCKET_NAME = 'firestore-backups-eu-lwai' //`${PROJECT_ID}.appspot.com`;
const BACKUP_FOLDER = 'backups';
const BACKUP_FOLDER_MONTHLY = 'backups-monthly';

const firestoreAdmin = new Firestore.v1.FirestoreAdminClient();
const storage = new Storage();

exports.scheduledFirestoreBackup = onSchedule(
  {
    schedule: 'every day 03:00',
    timeZone: 'Europe/Amsterdam',
    memory: '4GiB',
    region: 'europe-west1',
  },
  async () => {
    
    const databaseName = firestoreAdmin.databasePath(PROJECT_ID, '(default)');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputUriPrefix = `gs://${BUCKET_NAME}/${BACKUP_FOLDER}/${timestamp}`;

    logger.info(`Start Firestore backup to: ${outputUriPrefix}`);

    await firestoreAdmin.exportDocuments({
      name: databaseName,
      outputUriPrefix,
    });

    logger.info(`Backup completed. Cleaning old backups...`);

    // Opschonen van oude back-ups (> 14 dagen)
    const [files] = await storage.bucket(BUCKET_NAME).getFiles({ prefix: `${BACKUP_FOLDER}/` });
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

    const deletions = files.map(async (file) => {
      const [metadata] = await file.getMetadata();
      const updatedTime = new Date(metadata.updated).getTime();
      if (updatedTime < twoWeeksAgo) {
        logger.info(`Deleting old backup file: ${file.name}`);
        await file.delete();
      }
    });

    await Promise.all(deletions);
    logger.info(`Old backups cleanup complete.`);
  }
);

exports.scheduledFirestoreBackupMonthly = onSchedule(
  {
    schedule: '0 2 1 * *',
    timeZone: 'Europe/Amsterdam',
    memory: '4GiB',
    region: 'europe-west1',
  },
  async () => {
    
    const databaseName = firestoreAdmin.databasePath(PROJECT_ID, '(default)');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputUriPrefix = `gs://${BUCKET_NAME}/${BACKUP_FOLDER_MONTHLY}/${timestamp}`;

    logger.info(`Start Firestore backup to: ${outputUriPrefix}`);

    await firestoreAdmin.exportDocuments({
      name: databaseName,
      outputUriPrefix,
    });

    logger.info(`Backup completed. Cleaning old backups...`);

    // Opschonen van oude back-ups (> 14 dagen)
    const [files] = await storage.bucket(BUCKET_NAME).getFiles({ prefix: `${BACKUP_FOLDER_MONTHLY}/` });
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000; // 1 jaar geleden

    const deletions = files.map(async (file) => {
      const [metadata] = await file.getMetadata();
      const updatedTime = new Date(metadata.updated).getTime();
      if (updatedTime < oneYearAgo) {
        logger.info(`Deleting old backup file: ${file.name}`);
        await file.delete();
      }
    });

    await Promise.all(deletions);
    logger.info(`Old backups cleanup complete.`);
  }
);

exports.manualFirestoreBackups = onCall(
  {
    region: 'europe-west1',
    memory: '1GiB',
    serviceAccount: 'lwai-3bac8@appspot.gserviceaccount.com',
  },
  async (request: CallableRequest<any>) => {
    const { auth } = request; //const { auth,data } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'Alleen ingelogde gebruikers mogen deze functie aanroepen.');
    }

    const userRef = db.collection('users').doc(auth.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists || !userDoc.data()?.isAdmin) {
      throw new HttpsError('permission-denied', 'Alleen beheerders mogen deze functie aanroepen.');
    }

    const databaseName = firestoreAdmin.databasePath(PROJECT_ID, '(default)');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputUriPrefix = `gs://${BUCKET_NAME}/${BACKUP_FOLDER}/${timestamp}`;

    logger.info(`Start Firestore backup to: ${outputUriPrefix}`);

    await firestoreAdmin.exportDocuments({
      name: databaseName,
      outputUriPrefix,
    });

    logger.info(`Backup completed. Cleaning old backups...`);

    // Verwijder bestanden ouder dan 14 dagen
    const [files] = await storage.bucket(BUCKET_NAME).getFiles({ prefix: `${BACKUP_FOLDER}/` });
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

    const deletions = files.map(async (file) => {
      const [metadata] = await file.getMetadata();
      const updatedTime = new Date(metadata.updated).getTime();
      if (updatedTime < twoWeeksAgo) {
        logger.info(`Deleting old backup file: ${file.name}`);
        await file.delete();
      }
    });

    await Promise.all(deletions);

    logger.info(`Old backups cleanup complete.`);

    return {
      success: true,
      message: 'Backup succesvol uitgevoerd en oude backups opgeschoond.',
    };
  }
);