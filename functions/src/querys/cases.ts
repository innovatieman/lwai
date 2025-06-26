import admin from '../firebase'
const { onRequest } = require("firebase-functions/v2/https");
import { config } from '../configs/config-basics';

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
