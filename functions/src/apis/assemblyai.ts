const { onRequest } = require("firebase-functions/v2/https");
import admin from '../firebase'
import { AssemblyAI, RealtimeTranscript } from "assemblyai";
import { config } from '../configs/config-basics';
// import { db } from "../firebase";
const bucket = admin.storage().bucket('lwai-3bac8.firebasestorage.app');

const fs = require("fs");
const path = require("path");

const API_KEY = config.assembly_api_key


exports.speechToTextAssemblyAI = onRequest(
    { cors: true, region: "europe-west1", maxRequestSize: '40mb' },
    async (req: any, res: any) => {
      try {
        ////////////////////////////////////////////////////////////////////
        // Check required parameters
        ////////////////////////////////////////////////////////////////////
        const body = req.body;
        if (!body.userId || !body.conversationId || !body.file) {
          res.status(400).send("Missing required parameters in request body");
          return;
        }
  
        ////////////////////////////////////////////////////////////////////
        // Decode base64 file
        ////////////////////////////////////////////////////////////////////
        const buffer: any = Buffer.from(body.file, "base64");
        const filePath = path.join("/tmp", `realtime-audio-${Date.now()}.webm`);
        fs.writeFileSync(filePath, buffer);
  
        ////////////////////////////////////////////////////////////////////
        // Save audio to Firebase Storage
        ////////////////////////////////////////////////////////////////////
        const destination = `realtime-audio/${path.basename(filePath)}`;
        await bucket.upload(filePath, {
          destination: destination,
          metadata: {
            contentType: "audio/webm",
          },
        });
  
        console.log(`✅ Audio opgeslagen in Firebase Storage: ${destination}`);
  
        ////////////////////////////////////////////////////////////////////
        // AssemblyAI Realtime Transcriptie
        ////////////////////////////////////////////////////////////////////
        const client = new AssemblyAI({ apiKey: API_KEY });
        const SAMPLE_RATE = 16000;
  
        const transcriber = client.realtime.transcriber({
          sampleRate: SAMPLE_RATE
        });
  
        let transcription = "";
  
        transcriber.on("open", ({ sessionId }) => {
          console.log(`✅ Realtime sessie gestart: ${sessionId}`);
        });
  
        transcriber.on("transcript", (transcript: RealtimeTranscript) => {
            console.log("⬆️ Ontvangen transcript:", JSON.stringify(transcript));
          if (transcript.text) {
            transcription += transcript.text + " ";
            console.log("⬆️ Ontvangen transcript:", transcript.text);
          }
        });
  
        transcriber.on("error", (error: Error) => {
          console.error("⚠️ Fout tijdens transcriptie:", error);
        });
  
        transcriber.on("close", () => {
          console.log("🛑 Realtime sessie gesloten.");
        });
  
        await transcriber.connect();
  
        ////////////////////////////////////////////////////////////////////
        // Stuur audio naar AssemblyAI
        ////////////////////////////////////////////////////////////////////
        const audioData = fs.readFileSync(filePath);
        const writer = transcriber.stream().getWriter();
        await writer.write(audioData);
        await writer.close();
        await transcriber.close();
  
        ////////////////////////////////////////////////////////////////////
        // Verwijder lokaal bestand
        ////////////////////////////////////////////////////////////////////
        fs.unlinkSync(filePath);
  
        ////////////////////////////////////////////////////////////////////
        // Verstuur transcript naar client
        ////////////////////////////////////////////////////////////////////
        res.status(200).json({ transcription });
  
      } catch (error) {
        console.error("❌ Fout tijdens verwerking:", error);
        res.status(500).send("Internal Server Error");
      }
    }
  );

