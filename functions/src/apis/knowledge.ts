import { onRequest, onCall, CallableRequest } from "firebase-functions/v2/https";
import admin from '../firebase'
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebase";
// @ts-ignore
const pdf = require('pdf-parse');
// import * as pdfParse from "pdf-parse";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as responder from '../utils/responder'

// import type { CallableRequest } from 'firebase-functions/lib/common/providers/https';

import { createVertex } from '@ai-sdk/google-vertex';
const vertexEmbedding = createVertex({ project: "lwai-3bac8", location: "europe-west1" });
const embeddingModel = vertexEmbedding.textEmbeddingModel('text-embedding-005');

exports.embedBookKnowledge = onRequest({
  cors: true,
  region: "europe-west1",
  memory: '4GiB',
  timeoutSeconds: 540,
}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Only POST allowed.");
    return;
  }

  try {
    const { filePath, title } = req.body;

    if (!filePath) {
      res.status(400).send("filePath ontbreekt");
      return;
    }

    const storage = admin.storage().bucket('lwai-3bac8.firebasestorage.app');
    const tempFile = path.join(os.tmpdir(), path.basename(filePath));

    // Download bestand uit Firebase Storage
    await storage.file(filePath).download({ destination: tempFile });

    // Detecteer MIME-type op basis van extensie
    const isPdf = path.extname(filePath).toLowerCase() === '.pdf';
    const text = isPdf
      ? await extractTextFromPDF(tempFile)
      : fs.readFileSync(tempFile, 'utf-8');

    console.log("📄 PDF text extracted:", text.substring(0,200));

    const chunks = splitIntoChunks(text);
    const timestamp = Date.now();

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await createEmbedding(chunk);

      await db.collection("segments").add({
        text: chunk,
        embedding: FieldValue.vector(embedding),
        metadata: {
          book: title || "Onbekend Boek",
          index: i,
          tokens: chunk.split(/\s+/).length,
          chapter: detectHoofdstuk(chunk),
          preview: chunk.slice(0, 100) + "...",
        },
        type: 'knowledge',
        timestamp,
        userId: req.body.userId || "unknown",
        trainerId: req.body.trainerId || "unknown",
        expertKnowledgeId: req.body.expertKnowledgeId || "unknown",
      });

      console.log(`✅ Chunk ${i + 1}/${chunks.length} opgeslagen.`);
    }

    res.status(200).send("✅ Boek succesvol verwerkt.");
  } catch (err) {
    console.error("❌ Fout:", err);
    res.status(500).send("Fout bij verwerken van bestand.");
  }
});


exports.searchSegments = onCall(
  {
    region: 'europe-west1',
    memory: '1GiB',
  },
  async (request: CallableRequest<any>,) => {
    const { auth,data } = request;

    if( !auth.uid ) {
      return new responder.Message('Unauthorized', 401);
    }

    if(!data || !data.query || !data.trainerId) {
      return new responder.Message('Missing required parameters', 400);
    }
    try {

      const search = await embeddingModel.doEmbed({
        values: [data.query]
      });

      const collection = 'segments';

      const vectorQuery = db
        .collection(collection)
        .where('type', '==', 'knowledge')
        .where('trainerId', '==', data.trainerId)
        .where('metadata.book', '==', data.book || '')
        .findNearest({vectorField:"embedding", queryVector:search.embeddings[0],limit: data.max || 2, distanceMeasure: 'COSINE', distanceResultField: 'distance'});
      const result = await vectorQuery.get();
      if (result.empty) {
        return new responder.Message('No results found', 404);
      }
      // Format the results
      const formattedResults = result.docs.map((doc:any) => ({
        id: doc.id,
        data: doc.data(),
      }));

      // console.log('Search results:', formattedResults);

      return new responder.Message(formattedResults, 200);
    } catch (error) {
      console.error('Error during vector search:', error);
      return new responder.Message('Internal Server Error', 500);
    }
    
    
  })

async function extractTextFromPDF(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const data = await pdf(buffer);
  // const data = await pdfParse(buffer);
  return data.text;
}

function splitIntoChunks(text: string, softLimit = 400, hardLimit = 500, overlap = 100): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];

  let currentChunk = '';
  let tokenCount = 0;

  for (const para of paragraphs) {
    const paraWords = para.trim().split(/\s+/);
    const paraLength = paraWords.length;

    if (paraLength > hardLimit) {
      // Grote paragraaf: splits zelf in kleinere stukken
      let start = 0;
      while (start < paraLength) {
        const end = Math.min(start + hardLimit, paraLength);
        const subChunkWords = paraWords.slice(start, end);
        const subChunk = subChunkWords.join(' ');
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = subChunk;
        tokenCount = subChunkWords.length;
        start += hardLimit - overlap;
      }
      continue;
    }

    if (tokenCount + paraLength > hardLimit) {
      // Sluit huidige chunk af
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = para;
      tokenCount = paraLength;
    } else {
      // Voeg paragraaf toe aan huidige chunk
      currentChunk += (currentChunk ? '\n\n' : '') + para;
      tokenCount += paraLength;
    }

    // Als we nu over softLimit zitten, en dit het einde was van een logische blok,
    // dan mag je de chunk alvast afsluiten
    if (tokenCount >= softLimit) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
      tokenCount = 0;
    }
  }

  // Resterende chunk toevoegen
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  console.log(`📦 ${chunks.length} chunks gegenereerd.`);
  chunks.forEach((chunk, i) => {
    const wordCount = chunk.split(/\s+/).length;
    console.log(`📦 Chunk ${i + 1}: ${wordCount} woorden`);
  });

  return chunks;
}

function detectHoofdstuk(text: string): string {
  const lines = text.split('\n').map(l => l.trim());
  for (const line of lines.slice(0, 5)) {
    const match = line.match(/(Hoofdstuk|Hfst|Chapter)\s+(\d+|[IVXLC]+)/i);
    if (match) {
      return `${match[1]} ${match[2]}`;
    }
  }

  const keywords = ['inleiding', 'introductie', 'samenvatting'];
  for (const kw of keywords) {
    if (text.toLowerCase().includes(kw)) {
      return kw.charAt(0).toUpperCase() + kw.slice(1);
    }
  }

  return 'Onbekend';
}

async function createEmbedding(text: string): Promise<number[]> {
  const result = await embeddingModel.doEmbed({ values: [text] });
  return result.embeddings[0];
}

