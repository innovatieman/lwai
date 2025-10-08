import admin from '../firebase'
const { onRequest } = require("firebase-functions/v2/https");
import { config } from '../configs/config-basics';
const { onCall, CallableRequest } = require("firebase-functions/v2/https");
import type { CallableRequest } from 'firebase-functions/lib/common/providers/https';

import * as responder from '../utils/responder'

const db = admin.firestore()

exports.loadCasesPublic = onRequest(
{ cors: config.allowed_cors, region: "europe-west1" , memory: '1GiB', timeoutSeconds: 540},
    async (req:any, res:any) => {
    const currentLang = req.query.lang || req.body?.lang || 'en';
    const casesRef = db.collection('cases')
        .where('open_to_user', '==', true);
    
    try {
        const snapshot = await casesRef.get();
        if (snapshot.empty) {
            return res.status(200).json([]);
        }

        const casesPromises = snapshot.docs.map(async doc => {
            const caseData = doc.data();
            const translationDoc = await db.collection(`cases/${doc.id}/translations`)
                .doc(currentLang)
                .get();
            const translation = translationDoc.exists ? translationDoc.data() : null;
            return {
                id: doc.id,
                title: translation?.title || caseData.title,
                user_info: translation?.user_info || caseData.user_info,
                level: caseData.level,
                photo: caseData.photo,
                conversation: caseData.conversation,
                create_self: caseData.create_self,
            };
        });

        const cases = await Promise.all(casesPromises);
        return res.status(200).json(cases);
    } catch (error) {
        console.error('Error loading public cases:', error);
        return res.status(500).json({ error: 'Failed to load public cases' });
    }
});

exports.getVoices = onCall(
  {
    region: 'europe-west1',
    memory: '1GiB',
  },
  async (request: CallableRequest<any>,) => {
    const { auth, data } = request;
    if (!auth.uid) {
      return new responder.Message('Unauthorized', 401);
    }

    if (!data) {
      return new responder.Message('Missing required parameters', 400);
    }

    // const trainerRef = db.collection('trainers').doc(data.trainerId);
    // const trainerDoc = await trainerRef.get();
    // if (!trainerDoc.exists) {
    //   return new responder.Message('Trainer not found', 404);
    // }
    const language = data.language || 'en';
    const voicesRef = db.collection('voices');
    const voicesSnapshot = await voicesRef.get();
    if (voicesSnapshot.empty) {
      return new responder.Message([], 200);
    }

    // get all voices and data from language subcollection
    const voices = voicesSnapshot.docs.map(doc => {
      const voiceData = doc.data();
      const translationDoc = voicesRef.doc(doc.id).collection('languages').doc(language);
      return translationDoc.get().then(translationSnap => {
        const translation = translationSnap.exists ? translationSnap.data() : null;
        return {
          id: doc.id,
          name: translation?.name || voiceData.name,
          short: translation?.short || voiceData.short,
          type: translation?.type || voiceData.type,
          description: translation?.description || voiceData.description,
          sex: voiceData.sex
        };
      });
    });

    const voicesData = await Promise.all(voices);
    return new responder.Message(voicesData, 200);
  }

);