const speech = require('@google-cloud/speech');
import * as functions from 'firebase-functions/v1';
import admin from '../firebase'
const db = admin.firestore();
import { config } from '../configs/config-basics';

// Initialize Speech client with service account
const client = new speech.SpeechClient({
    credentials: {
      client_email: config.google_speech.client_email,
      private_key: config.google_speech.private_key,
    }
});

// Opslag voor actieve streams en timers
const activeStreams:any = {};
const inactivityTimers:any = {};
const flushTimers: any = {}; // Timer voor periodiek wegschrijven
const latestTranscripts: any = {}; // Opslag voor laatste transcript per sessie

// Functie om de stream netjes te sluiten
function endStream(sessionId: string, reason: any) {
    if (activeStreams[sessionId]) {
      console.log(`Beëindig stream voor sessie ${sessionId}: ${reason}`);
      activeStreams[sessionId].end(); // Sluit de actieve stream
      delete activeStreams[sessionId]; // Verwijder de stream uit het geheugen
    }
  
    if (inactivityTimers[sessionId]) {
      clearTimeout(inactivityTimers[sessionId]); // Stop de timer
      delete inactivityTimers[sessionId]; // Verwijder timer uit het geheugen
    }
  
    if (flushTimers[sessionId]) {
      clearTimeout(flushTimers[sessionId]); // Stop de periodieke flush timer
      delete flushTimers[sessionId];
    }
  
    if (latestTranscripts[sessionId]) {
      delete latestTranscripts[sessionId]; // Verwijder de opgeslagen transcript
    }
  }
  
  // Firebase Function voor transcriptie
  exports.voiceToText = functions.region('europe-west1').firestore
    .document('transcriptions/{sessionId}')
    .onUpdate(async (change, context) => {
      const sessionId = context.params.sessionId;
      const newValue = change.after.data();
      const audioChunk = newValue.audioChunk;
  
      if (audioChunk) {
        const audioBuffer = Buffer.from(audioChunk, 'base64');
  
        if (!activeStreams[sessionId]) {
          const request = {
            config: {
              encoding: 'WEBM_OPUS',
              sampleRateHertz: 48000,
              languageCode: 'nl-NL',
              enableAutomaticPunctuation: true,
            },
            interimResults: true,
          };
  
          const recognizeStream = client.streamingRecognize(request)
            .on('data', async (data: any) => {
              const transcript = data.results[0]?.alternatives[0]?.transcript || '';
              const isFinal = data.results[0]?.isFinal || false;
  
              if (isFinal) {
                console.log(`Final transcript ontvangen voor sessie ${sessionId}:`, transcript);
                await db.collection('transcriptions').doc(sessionId).update({
                  transcript: admin.firestore.FieldValue.arrayUnion(transcript),
                  isFinal: true,
                });
                delete latestTranscripts[sessionId];
              } else {
                console.log(`Interim transcript opgeslagen (voor periodiek flushen):`, transcript);
                latestTranscripts[sessionId] = transcript;
              }
            })
            .on('error', (err: any) => {
              console.error(`Fout bij transcriptie voor sessie ${sessionId}:`, err.message);
              endStream(sessionId, `Fout: ${err.message}`);
            })
            .on('end', () => {
              console.log(`Stream beëindigd voor sessie ${sessionId}`);
              endStream(sessionId, 'Stream handmatig beëindigd');
            });
  
          activeStreams[sessionId] = recognizeStream;
  
          // Zet een flush-timer op voor elke 5 seconden
          flushTimers[sessionId] = setInterval(async () => {
            if (latestTranscripts[sessionId]) {
              console.log(`Periodieke flush voor sessie ${sessionId}:`, latestTranscripts[sessionId]);
              await db.collection('transcriptions').doc(sessionId).update({
                transcript: admin.firestore.FieldValue.arrayUnion(latestTranscripts[sessionId]),
                isFinal: false,
              });
              delete latestTranscripts[sessionId]; // Clear na wegschrijven
            }
          }, 5000);
        }
  
        // Reset de inactiviteitstimer
        if (inactivityTimers[sessionId]) {
          clearTimeout(inactivityTimers[sessionId]);
        }
  
        inactivityTimers[sessionId] = setTimeout(() => {
          console.log(`Inactiviteitstimer verlopen voor sessie ${sessionId}`);
          endStream(sessionId, 'Inactiviteitstimer verlopen');
        }, 10000); // Sluit stream na 10 seconden inactiviteit
  
        // Voeg nieuwe audio toe aan de stream
        activeStreams[sessionId].write(audioBuffer);
      }
    });