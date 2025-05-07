import * as functions from 'firebase-functions/v1';
const { PredictionServiceClient } = require('@google-cloud/aiplatform');

import { db } from "../firebase";

const vertexClient = new PredictionServiceClient({
  apiEndpoint: 'europe-west1-aiplatform.googleapis.com',
});

// Gemini embedding helper
async function generateGeminiEmbedding(text:string) {

    const [response] = await vertexClient.predict({
        endpoint: 'projects/lwai-3bac8/locations/europe-west1/publishers/google/models/text-embedding-004',
        instances: [{ content: text }],
        parameters: {}
      });
    
      return response.predictions[0].embeddings.values;
}

// Opslaan in segments
async function saveSegment(segmentData:any) {
  await db.collection('segments').add(segmentData);
}

// Helper: Controleer of beide documenten bestaan
async function documentsExist(userId:string, conversationId:string) {
  const closeSnap = await db.collection('users').doc(userId).collection('conversations').doc(conversationId).collection('close').limit(1).get();
  const skillsSnap = await db.collection('users').doc(userId).collection('conversations').doc(conversationId).collection('skills').limit(1).get();

  return closeSnap.size > 0 && skillsSnap.size > 0;
}

// Hoofdverwerkingsfunctie
async function processConversation(userId:string, conversationId:string) {
  console.log(`Start verwerking voor conversation: ${conversationId}`);

  const closeSnap = await db.collection('users').doc(userId).collection('conversations').doc(conversationId).collection('close').limit(1).get();
  const skillsSnap = await db.collection('users').doc(userId).collection('conversations').doc(conversationId).collection('skills').limit(1).get();
  const feedbackSnap = await db.collection('users').doc(userId).collection('conversations').doc(conversationId).collection('feedback').orderBy('timestamp').get()


  const closeDoc = closeSnap.docs[0];
  const skillsDoc = skillsSnap.docs[0];

  // --------- Verwerk CLOSE ----------
  const closeContent = closeDoc.data().content.replace(/<[^>]+>/g, ''); // HTML tags strippen
  console.log('Lengte closeContent:', closeContent.length);
  const closeEmbedding = await generateGeminiEmbedding(closeContent);

  await saveSegment({
    type: 'close',
    userId,
    conversationId,
    timestamp: closeDoc.data().timestamp || Date.now(),
    content: closeContent,
    role: closeDoc.data().role || 'assistant',
    embedding: closeEmbedding,
  });

  console.log('Close segment opgeslagen');

  // --------- Verwerk SKILLS ----------
  const skillsContent = JSON.parse(skillsDoc.data().content).summary;
  console.log('Lengte skillsContent:', skillsContent.length);
  const skillsEvaluation = JSON.parse(skillsDoc.data().content).evaluation;
  const goalBonus = JSON.parse(skillsDoc.data().content).goal_bonus;

  const skillsEmbedding = await generateGeminiEmbedding(skillsContent);

  await saveSegment({
    type: 'skills',
    userId,
    conversationId,
    timestamp: skillsDoc.data().timestamp || Date.now(),
    content: skillsContent,
    evaluation: skillsEvaluation,
    goal_bonus: goalBonus,
    role: skillsDoc.data().role || 'assistant',
    embedding: skillsEmbedding,
  });

  console.log('Skills segment opgeslagen');

  // --------- Verwerk FEEDBACKS ----------
  let feedbackOrder:number = 0
  for (const fbDoc of feedbackSnap.docs) {
    const feedbackData = JSON.parse(fbDoc.data().content);
    const feedbackText = feedbackData.feedback;
    console.log('Lengte feedbackText:', feedbackText.length);

    const feedbackEmbedding = await generateGeminiEmbedding(feedbackText);
    
    await saveSegment({
      type: 'feedback',
      userId,
      messageRef: ((feedbackOrder * 2)+1)+'',
      conversationId,
      timestamp: fbDoc.data().timestamp || Date.now(),
      content: feedbackText,
      role: fbDoc.data().role || 'modal',
      cipher: feedbackData.cipher,
      embedding: feedbackEmbedding,
    });

    feedbackOrder = feedbackOrder + 1
    console.log(`Feedback segment opgeslagen: ${fbDoc.id}`);
  }

  console.log('Alle segmenten verwerkt en opgeslagen.');
}

// --- Firestore Triggers ---

exports.onCloseCreated = functions.region('europe-west1').runWith({memory:'1GB'}).firestore
  .document('users/{userId}/conversations/{conversationId}/close/{closeId}')
  .onCreate(async (snap:any, context:any) => {
    const { userId, conversationId } = context.params;

    const ready = await documentsExist(userId, conversationId);
    if (!ready) {
      console.log('Wacht op skills document...');
      return;
    }

    await processConversation(userId, conversationId);
  });

exports.onSkillsCreated = functions.region('europe-west1').runWith({memory:'1GB'}).firestore
  .document('users/{userId}/conversations/{conversationId}/skills/{skillsId}')
  .onCreate(async (snap:any, context:any) => {
    const { userId, conversationId } = context.params;

    const ready = await documentsExist(userId, conversationId);
    if (!ready) {
      console.log('Wacht op close document...');
      return;
    }

    await processConversation(userId, conversationId);
  });