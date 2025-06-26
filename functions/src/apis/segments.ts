import * as functions from 'firebase-functions/v1';
import { db } from "../firebase";
import {createVertex } from '@ai-sdk/google-vertex';
import { FieldValue } from 'firebase-admin/firestore';

const vertexEmbedding = createVertex({ project: "lwai-3bac8", location: "europe-west1" });
const embeddingModel = vertexEmbedding.textEmbeddingModel('text-embedding-005'); // of 'text-embedding-005'

// const { PredictionServiceClient } = require('@google-cloud/aiplatform');


// const vertexClient = new PredictionServiceClient({
//   apiEndpoint: 'europe-west1-aiplatform.googleapis.com',
// });


async function generateGeminiEmbedding(text:string) {

  const result = await embeddingModel.doEmbed({
      values: [text]
    });
  return result.embeddings[0];
}

// Opslaan in segments
async function saveSegment(segmentData:any) {
  for( const key of Object.keys(segmentData)) {
    if (segmentData[key] === undefined) {
      segmentData[key] = null; // Zet undefined velden op null
    }
  }
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
  // console.log(`Start verwerking voor conversation: ${conversationId}`);

  const closeSnap = await db.collection('users').doc(userId).collection('conversations').doc(conversationId).collection('close').limit(1).get();
  const skillsSnap = await db.collection('users').doc(userId).collection('conversations').doc(conversationId).collection('skills').limit(1).get();
  const feedbackSnap = await db.collection('users').doc(userId).collection('conversations').doc(conversationId).collection('feedback').orderBy('timestamp').get()
  const caseSnap = await db.collection('users').doc(userId).collection('conversations').doc(conversationId).get();

  const closeDoc = closeSnap.docs[0];
  const skillsDoc = skillsSnap.docs[0];
  const caseDoc = caseSnap.data();

  // --------- Verwerk CLOSE ----------
  const closeContent = closeDoc.data().content.replace(/<[^>]+>/g, ''); // HTML tags strippen
  // console.log('Lengte closeContent:', closeContent.length);
  const closeEmbedding = await generateGeminiEmbedding(closeContent);

  await saveSegment({
    type: 'close',
    userId,
    conversationId,
    timestamp: closeDoc.data().timestamp || Date.now(),
    content: closeContent,
    role: closeDoc.data().role || 'assistant',
    embedding: FieldValue.vector(closeEmbedding),
    caseId: caseDoc.caseId || null,
    caseTitle: caseDoc.title || null,
    trainerId: caseDoc.trainerId || null,
    trainingId: caseDoc.trainingId || null,
  });

  console.log('Close segment opgeslagen');

  // --------- Verwerk SKILLS ----------
  const skillsContent = JSON.parse(skillsDoc.data().content).summary;
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
    embedding: FieldValue.vector(skillsEmbedding),
    caseId: caseDoc.caseId || null,
    caseTitle: caseDoc.title || null,
    trainerId: caseDoc.trainerId || null,
    trainingId: caseDoc.trainingId || null,
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
      cipher: feedbackData.feedbackCipher || null,
      embedding: FieldValue.vector(feedbackEmbedding),
      caseId: caseDoc.caseId || null,
      caseTitle: caseDoc.title || null,
      trainerId: caseDoc.trainerId || null,
      trainingId: caseDoc.trainingId || null,
    });

    feedbackOrder = feedbackOrder + 1
    console.log(`Feedback segment opgeslagen: ${fbDoc.id}`);
  }

  console.log('Alle segmenten verwerkt en opgeslagen.');
}

// --- Firestore Triggers ---

exports.onCloseCreated = functions.region('europe-west1').runWith({memory:'2GB'}).firestore
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

exports.onSkillsCreated = functions.region('europe-west1').runWith({memory:'2GB'}).firestore
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