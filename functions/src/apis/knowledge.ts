import { onRequest } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebase";
// import * as dotenv from "dotenv";

import {createVertex } from '@ai-sdk/google-vertex';
const vertexEmbedding = createVertex({ project: "lwai-3bac8", location: "europe-west1" });
const embeddingModel = vertexEmbedding.textEmbeddingModel('text-embedding-005'); // of 'text-embedding-005'
import { config } from '../configs/config-basics';


// import { Configuration, OpenAIApi } from "openai";
import Busboy from "busboy";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// @ts-ignore
import * as pdfParse from "pdf-parse";

// dotenv.config();

// const openai = new OpenAIApi(
//   new Configuration({ apiKey: process.env.OPENAI_API_KEY })
// );

exports.embedBookKnowledge = onRequest(
    { cors: config.allowed_cors, region: "europe-west1" , memory: '4GiB', timeoutSeconds: 540},
    async (req, res) => {

    if (req.method !== "POST") {
        res.status(405).send("Only POST allowed.");
        return;
    }

    const busboy = Busboy({ headers: req.headers });
    let filePath = "";
    let mimeType = "";
    let bookTitle = "Onbekend Boek";

    busboy.on("file", (_:any, file:any, info:any) => {
        mimeType = info.mimeType;
        const tempPath = path.join(os.tmpdir(), info.filename);
        filePath = tempPath;
        const writeStream = fs.createWriteStream(tempPath);
        file.pipe(writeStream);
    });

    busboy.on("field", (fieldname:any, val:any) => {
        if (fieldname === "title") {
            bookTitle = val;
        }
    });

    busboy.on("finish", async () => {
        try {
        const text = mimeType === "application/pdf"
            ? await extractTextFromPDF(filePath)
            : fs.readFileSync(filePath, "utf-8");

        const chunks = splitIntoChunks(text);
        console.log(`📦 ${chunks.length} chunks gevonden.`);

        const timestamp = new Date().getTime();
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embedding = await createEmbedding(chunk);
            const metadata = {
            book: bookTitle,
            index: i,
            tokens: chunk.split(/\s+/).length,
            chapter: detectHoofdstuk(chunk),
            preview: chunk.slice(0, 100) + "...",
            };

            await db.collection("segments").add({
                text: chunk,
                embedding: FieldValue.vector(embedding),
                metadata,
                type:'knowledge',
                timestamp,
            });

            console.log(`✅ Chunk ${i + 1}/${chunks.length} opgeslagen.`);
        }

        res.status(200).send("✅ Boek succesvol verwerkt.");
        } catch (err) {
        console.error("❌ Fout:", err);
        res.status(500).send("Fout bij verwerken van bestand.");
        }
    });

    req.pipe(busboy);
});

// 🔧 Helpers

async function extractTextFromPDF(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

function splitIntoChunks(text: string, maxTokens = 500, overlap = 100): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';
  let tokenCount = 0;

  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    if (tokenCount + words.length > maxTokens) {
      chunks.push(currentChunk.trim());

      const overlapWords = currentChunk.split(/\s+/).slice(-overlap).join(' ');
      currentChunk = overlapWords + ' ' + para;
      tokenCount = overlap + words.length;
    } else {
      currentChunk += ' ' + para;
      tokenCount += words.length;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

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
    const result = await embeddingModel.doEmbed({
        values: [text]
    });

    return result.embeddings[0];
}

// exports.testEmbeddings = onRequest({
//   cors: true,
//   region: "europe-west1",
//   timeoutSeconds: 540,
//   memory: '1GiB',
// },
// async (req:any, res:any) => {
//   try {
//     const { text } = req.body;

//     if (!text) {
//       return res.status(400).json({ error: 'Missing text parameter.' });
//     }

//     console.log(`Received text: ${text}`);

//     const result = await embeddingModel.doEmbed({
//       values: [text]
//     });

//     await db.collection('test_embeddings').add({
//       text: text,
//       embeddings: FieldValue.vector(result.embeddings[0]),
//       timestamp: new Date().getTime(),
//     });

//     res.status(200).json({ embeddings: result.embeddings[0] });


//   } catch (error) {
//     console.error('Error generating vector embedding:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });