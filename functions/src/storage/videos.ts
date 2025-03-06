import * as functions from 'firebase-functions/v1';
import admin from '../firebase'
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const path = require("path");
const os = require("os");
const fs = require("fs");

const storage = admin.storage();

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

exports.compressVideo = functions.region('europe-west1').runWith({memory:'8GB'}).storage.object().onFinalize(async (object: any): Promise<null> => {
  const filePath = object.name; // Pad van het bestand in Firebase Storage
  const contentType = object.contentType;

  // 📌 1. Filter: Start alleen als de video in de juiste map staat
  if (!filePath.startsWith("raw-videos/")) {
    console.log(`Bestand ${filePath} zit niet in 'raw-videos/', overslaan.`);
    return null;
  }

  // 📌 2. Extra controle: Alleen video's verwerken
  if (!contentType.startsWith("video/")) {
    console.log(`Bestand ${filePath} is geen video, overslaan.`);
    return null;
  }

  const bucket = storage.bucket(object.bucket);
  const fileName = path.basename(filePath);
  const fileNameWithoutExt = path.parse(fileName).name;
  const tempFilePath = path.join(os.tmpdir(), fileName);
  const compressedFilePath = path.join(os.tmpdir(), `compressed-${fileName}`);

  // 📌 3. Download de originele video naar de server
  await bucket.file(filePath).download({ destination: tempFilePath });
  console.log(`Video ${fileName} gedownload naar ${tempFilePath}, starten met comprimeren...`);

  // 📌 4. Verklein de videoresolutie met FFmpeg (max. 720p)
  await new Promise((resolve, reject) => {
    ffmpeg(tempFilePath)
      .output(compressedFilePath)
      .videoCodec("libx264")
      .size("1280x720") // Verklein naar max 720p
      .on("end", resolve)
      .on("error", reject)
      .run();
  });

  console.log(`Video gecomprimeerd: ${compressedFilePath}, uploaden...`);

  // 📌 5. Upload de gecomprimeerde video naar Firebase Storage in 'compressed_videos/' folder
  const newFileName = `compressed_videos/${fileNameWithoutExt}.mp4`;
  await bucket.upload(compressedFilePath, {
    destination: newFileName,
    metadata: { contentType: "video/mp4" },
  });

  // 📌 6. Opruimen van tijdelijke bestanden
  fs.unlinkSync(tempFilePath);
  fs.unlinkSync(compressedFilePath);

  console.log(`Verkleinde video opgeslagen als ${newFileName}`);
  return null;
});

exports.cleanupRawVideos = functions.region('europe-west1').pubsub.schedule('0 3 * * *').onRun(async (context) => {
    const bucket = storage.bucket('lwai-3bac8.firebasestorage.app');
    const prefix = "raw-videos/"; // 🔹 Alleen bestanden in deze map
    const [files] = await bucket.getFiles({ prefix });

    const now = Date.now();

    for (const file of files) {
        const [metadata] = await file.getMetadata();
        const createdTime = new Date(metadata.timeCreated).getTime();
        const ageInHours = (now - createdTime) / (1000 * 60 * 60);

        if (ageInHours > 24) {
        console.log(`Verwijderen: ${file.name}, ouder dan 24 uur`);
        await file.delete();
        }
    }

    console.log("Oude video's verwijderd!");
    return null;
});