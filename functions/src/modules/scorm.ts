import admin from '../firebase'
const BUCKET_NAME = 'lwai-3bac8.firebasestorage.app'
const bucket = admin.storage().bucket(BUCKET_NAME);
const unzipper = require("unzipper");
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

const { onCall, CallableRequest } = require("firebase-functions/v2/https");
import type { CallableRequest } from 'firebase-functions/lib/common/providers/https';
import { HttpsError } from 'firebase-functions/v2/https';

exports.uploadAndUnpackScorm = onCall(
  {
    region: 'europe-west1',
    memory: '1GiB',
  },
  async (request: CallableRequest<any>) => {
    const { auth,data } = request;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const { fileData, contentType } = data;

  if (!fileData || !contentType) {
    throw new HttpsError("invalid-argument", "Bestand of contentType ontbreekt");
  }

  try {

    const scormId = `${auth.uid}_${Date.now()}`;
    const tempZipPath = path.join(os.tmpdir(), `${scormId}.zip`);
    const buffer = Buffer.from(fileData, "base64");

    // Sla het zipbestand tijdelijk op
    fs.writeFileSync(tempZipPath, buffer);

    // Unzip en upload elk bestand naar Cloud Storage
    const directory = await unzipper.Open.file(tempZipPath);

    await Promise.all(
      directory.files.map(async (entry:any) => {
        if (entry.type === "File") {
            // const destPath = `scorm/${scormId}/${entry.path}`;
            // strip eerste maplaag als die er is
            const relativePath = entry.path.split("/").slice(1).join("/") || entry.path;
            const destPath = `scorm/${scormId}/${relativePath}`;
            const tempFilePath = path.join(os.tmpdir(), entry.path);

            fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });

            await new Promise((resolve, reject) => {
            entry.stream()
                .pipe(fs.createWriteStream(tempFilePath))
                .on("finish", resolve)
                .on("error", reject);
            });

            await bucket.upload(tempFilePath, {
                destination: destPath,
                metadata: { contentType: "auto" }
            });

            fs.unlinkSync(tempFilePath);
        }
      })
    );

    fs.unlinkSync(tempZipPath);

    return { message: "SCORM uploaded and unpacked", scormId };
  } catch (error) {
    console.error("SCORM upload error:", error);
    throw new HttpsError("internal", "SCORM upload mislukt");
  }
});

exports.getScormLaunchUrl = onCall(
  {
    region: 'europe-west1',
    memory: '1GiB',
  },
  async (request: CallableRequest<any>) => {
    const { auth,data } = request;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const { scormId } = data;

  if (!scormId) {
    throw new HttpsError("invalid-argument", "scormId ontbreekt");
  }

  try {
    const file = bucket.file(`scorm/${scormId}/index.html`);
    const [exists] = await file.exists();

    if (!exists) {
      throw new HttpsError("not-found", "index.html niet gevonden voor deze SCORM");
    }

    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000 * 24, // 24 uur
    });

    return { launchUrl: signedUrl };
  } catch (err) {
    console.error("Fout bij ophalen launch URL:", err);
    throw new HttpsError("internal", "Kon SCORM launch URL niet ophalen");
  }
});