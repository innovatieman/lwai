import { onRequest, onCall, CallableRequest } from "firebase-functions/v2/https";
import admin from '../firebase'
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebase";
// @ts-ignore
const pdf = require('pdf-parse');
import * as mammoth from "mammoth";
// const pptx2json =  require('pptx2json');

const unzipper = require('unzipper');
const xml2js = require('xml2js');

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
  console.log("📚 Boek kennis verwerking gestart...");
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
    const isDocx = path.extname(filePath).toLowerCase() === '.docx';
    const isPptx = path.extname(filePath).toLowerCase() === '.pptx';

    console.log(`extensions: isPdf=${isPdf}, isDocx=${isDocx}, isPptx=${isPptx}`);
    let text = "";

    if (isPdf) {
      text = await extractTextFromPDF(tempFile);
    } else if (isDocx) {
      text = await extractTextFromDOCX(tempFile);
    } else if (isPptx) {
      text = await extractTextFromPPTX(tempFile);
    } else if (filePath.endsWith(".txt")) {
      text = fs.readFileSync(tempFile, "utf-8");
    } else {
      throw new Error("Bestandstype niet ondersteund");
    }

    console.log(`📄 Tekst uit bestand (${path.basename(filePath)}) succesvol geëxtraheerd. Lengte: ${text.length} tekens`);

    // const text = isPdf
    //   ? await extractTextFromPDF(tempFile)
    //   : fs.readFileSync(tempFile, 'utf-8');

    // console.log("📄 PDF text extracted:", text.substring(0,200));

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
        filePath: filePath,
      });

      // console.log(`✅ Chunk ${i + 1}/${chunks.length} opgeslagen.`);
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


async function extractTextFromDOCX(filePath: string): Promise<string> {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}


// async function extractTextFromPPTX(filePath: string): Promise<string> {
//   const parser = new pptx2json(filePath);
//   const json = await parser.parse();
//   return json.slides.map((slide:any) =>
//     slide.texts.map((t:any) => t.text).join('\n')
//   ).join('\n\n');
// }

export async function extractTextFromPPTX(filePath: string): Promise<string> {
  const zip = fs.createReadStream(filePath).pipe(unzipper.Parse({ forceStream: true }));
  const slideTexts: Record<string, string[]> = {};
  const notesTexts: Record<string, string[]> = {};

  for await (const entry of zip) {
    if (entry.path.match(/^ppt\/slides\/slide(\d+)\.xml$/)) {
      const slideNumber = entry.path.match(/slide(\d+)\.xml$/)?.[1];
      console.log(`▶️ Entry gevonden: ${entry.path}`);
      const buffer = await entry.buffer(); // <— hier hangt hij mogelijk
      console.log(`✅ Buffer geladen: ${entry.path}`);
      const parsed = await xml2js.parseStringPromise(buffer);
      slideTexts[slideNumber!] = extractTextFromSlide(parsed);
    }
    

    else if (entry.path.match(/^ppt\/notesSlides\/notesSlide(\d+)\.xml$/)) {
      const slideNumber = entry.path.match(/notesSlide(\d+)\.xml$/)?.[1];
      console.log(`▶️ Entry gevonden: ${entry.path}`);
      const buffer = await entry.buffer(); // <— hier hangt hij mogelijk
      console.log(`✅ Buffer geladen: ${entry.path}`);
      const parsed = await xml2js.parseStringPromise(buffer);
      notesTexts[slideNumber!] = extractTextFromSlide(parsed);
    }

    else{
      entry.autodrain(); // Skip other entries
    }
  }

  // Combine slide text + notes per slide
  const combinedText = Object.keys(slideTexts)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map(slideNum => {
      const slide = slideTexts[slideNum] || [];
      const notes = notesTexts[slideNum] || [];
      return [...slide, ...notes].join('\n');
    })
    .join('\n\n');

  return combinedText.trim();
}

function extractTextFromSlide(parsed: any): string[] {
  const texts: string[] = [];

  const shapes = parsed['p:sld']?.['p:cSld']?.[0]?.['p:spTree']?.[0];
  if (!shapes) return texts;

  // Voeg tekst uit <p:sp> (normale tekstvakken)
  if (Array.isArray(shapes['p:sp'])) {
    for (const shape of shapes['p:sp']) {
      texts.push(...extractFromShape(shape));
    }
  }

  // Voeg tekst uit <p:grpSp> (groepen van vormen)
  if (Array.isArray(shapes['p:grpSp'])) {
    for (const group of shapes['p:grpSp']) {
      if (Array.isArray(group['p:sp'])) {
        for (const shape of group['p:sp']) {
          texts.push(...extractFromShape(shape));
        }
      }
    }
  }

  // Voeg tekst uit tabellen (p:graphicFrame > a:tbl)
  if (Array.isArray(shapes['p:graphicFrame'])) {
    for (const frame of shapes['p:graphicFrame']) {
      const table = frame['a:graphic']?.[0]?.['a:graphicData']?.[0]?.['a:tbl']?.[0];
      if (table?.['a:tr']) {
        for (const row of table['a:tr']) {
          const cells = row['a:tc'] || [];
          for (const cell of cells) {
            const cellText = extractTextFromParagraphs(cell['a:txBody']?.[0]?.['a:p'] || []);
            texts.push(...cellText);
          }
        }
      }
    }
  }

  // Voeg tekst uit SmartArt diagrammen toe
  if (Array.isArray(shapes['p:graphicFrame'])) {
    for (const frame of shapes['p:graphicFrame']) {
      const diagramData = frame?.['a:graphic']?.[0]?.['a:graphicData']?.[0];

      const smartText: string[] = [];

      function traverse(node: any) {
        if (typeof node !== 'object') return;
        for (const key of Object.keys(node)) {
          if (key === 'dgm:t' || key === 'dgm:tx') {
            const values = node[key].flat().filter((t: any) => typeof t === 'string');
            smartText.push(...values);
          } else {
            const children = node[key];
            if (Array.isArray(children)) {
              children.forEach(traverse);
            } else if (typeof children === 'object') {
              traverse(children);
            }
          }
        }
      }

      if (diagramData) {
        traverse(diagramData);
        texts.push(...smartText);
      }
    }
  }

  return texts;
}

function extractFromShape(shape: any): string[] {
  const paras = shape?.['p:txBody']?.[0]?.['a:p'] || [];
  return extractTextFromParagraphs(paras);
}

function extractTextFromParagraphs(paras: any[]): string[] {
  const lines: string[] = [];

  for (const para of paras) {
    let line = "";

    const runs = para['a:r'] || [];
    for (const run of runs) {
      const text = run['a:t']?.[0];
      if (text) line += text;
    }

    // Ook plain text zonder run
    const fallback = para['a:t']?.[0];
    if (!line && fallback) line = fallback;

    if (line.trim()) lines.push(line.trim());
  }

  return lines;
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

