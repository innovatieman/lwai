const { onRequest } = require("firebase-functions/v2/https");
import admin from '../firebase'
const { createCanvas, loadImage } = require("canvas");
import sharp from "sharp";
const path = require("path");
const fs = require("fs");
const storage = admin.storage();
const db = admin.firestore();
// import { config } from '../configs/config-basics';

exports.directToCase = onRequest({region: "europe-west1"},
    async (req: any, res: any) => {
    console.log("Request URL:", req.url);
    const pathOptions = req.path.split("/").filter(Boolean);
    const language = pathOptions[0]; // bijv. "nl"
    const caseId = pathOptions[1]; // bijv. "1234567890"
    
    if (!caseId || !language) {
        res.status(400).send("Missing caseId or language");
        return;
    }
    
    try {
        const caseDoc = await db
        .collection("cases")
        .doc(caseId)
        .collection("translations")
        .doc(language)
        .get();
    
        if (!caseDoc.exists) {
        res.status(404).send("Case not found");
        return;
        }
    
        const caseData = caseDoc.data();
        const redirectUrl = `start/cases?searchTerm=${caseId}`;
        const encodedRedirectUrl = encodeURIComponent(redirectUrl);
        const imageUrl = await getOrCreateOgImage(caseId, caseData);
        const html = `
        <!DOCTYPE html>
        <html lang="${language}">
            <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>AliciaLabs AI: ${escapeHtml(caseData?.title)}</title>
            <meta property="og:title" content="AliciaLabs AI Case: ${escapeHtml(caseData?.title)}" />
            <meta property="og:description" content="${escapeHtml(caseData?.user_info)} Oefen je gesprekstechnieken met AliciaLabs" />
            <meta property="og:image" content="${escapeHtml(imageUrl)}" />
            <meta property="og:url" content="https://preview.alicialabs.com/${language}/${caseId}" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="image" content="${escapeHtml(imageUrl)}" />
            <meta property="article:author" content="AliciaLabs" />
            <meta name="author" content="AliciaLabs" />
            <meta property="og:type" content="article" />
            <meta property="fb:app_id" content="656588300263932" />
            </head>
            <body>
            <p>Je wordt doorgestuurd naar AliciaLabs...</p>
            <script>
                window.location.href = "https://conversation.alicialabs.com/login?redirect=${encodedRedirectUrl}";
            </script>
            </body>
        </html>
        `;
    
        res.set("Cache-Control", "public, max-age=600");
        res.status(200).send(html);
    } catch (err) {
        console.error("Fout bij ophalen case:", err);
        res.status(500).send("Interne serverfout");
    }
});


exports.directToTrainings = onRequest(
  {region: "europe-west1" , memory: '1GiB', timeoutSeconds: 540},
    async (req: any, res: any) => {
    console.log("Request URL:", req.url);
    const pathOptions = req.path.split("/").filter(Boolean);
    const elearningId = pathOptions[2]; // bijv. "1234567890"
    const specialcode = pathOptions[3]; // bijv. "abc123"
    // const privateFlag = pathOptions[4];

    if (!elearningId) {
        res.status(400).send("Missing elearningId");
        return;
    }
    
    try {
        const elearningDoc = await db
        .collection("elearnings")
        .where("originalTrainingId", "==", elearningId)
        .limit(1)
        .get();

        if (elearningDoc.empty) {
        res.status(404).send("Elearning not found");
        return;
        }

        const elearningData = elearningDoc.docs[0].data();
        let redirectUrl = `marketplace/elearnings/${elearningId}`;
        if(specialcode){
          redirectUrl += `?specialCode=${specialcode}`;
        }
        // if(privateFlag){
        //   redirectUrl += `&private=1`;
        // }
        const encodedRedirectUrl = encodeURIComponent(redirectUrl);
        const imageUrl = await getOrCreateOgImageTraining(elearningId, elearningData);
        let contentUrl = `https://marketplace.alicialabs.com/etraining/direct/${elearningId}`;
        if(specialcode){
          contentUrl += `/${specialcode}`;
        }
        // if(privateFlag){
        //   contentUrl += `/private`;
        // }
        console.log('redirecting to', `https://conversation.alicialabs.com/${encodedRedirectUrl}`);
        const html = `
        <!DOCTYPE html>
        <html lang="en">
            <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>AliciaLabs AI: ${escapeHtml(elearningData?.title)}</title>
            <meta property="og:title" content="${escapeHtml(elearningData?.trainer.name)}: ${escapeHtml(elearningData?.title)}" />
            <meta property="og:description" content="${escapeHtml(elearningData?.user_info)}" />
            <meta property="og:image" content="${escapeHtml(imageUrl)}" />
            <meta property="og:url" content="${escapeHtml(contentUrl)}" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="image" content="${escapeHtml(imageUrl)}" />
            <meta property="article:author" content="AliciaLabs" />
            <meta name="author" content="AliciaLabs" />
            <meta property="og:type" content="article" />
            <meta property="fb:app_id" content="656588300263932" />
            </head>
            <body>
            <p>You are redirected to AliciaLabs...</p>
            <script>
                window.location.href = "https://conversation.alicialabs.com/${redirectUrl}";
            </script>
            </body>
        </html>
        `;
    
        res.set("Cache-Control", "public, max-age=600");
        res.status(200).send(html);
    } catch (err) {
        console.error("Fout bij ophalen case:", err);
        res.status(500).send("Interne serverfout");
    }
});

async function getOrCreateOgImageTraining(trainingId:string, trainingData:any) {
  const bucket = storage.bucket('lwai-3bac8.firebasestorage.app');

  let fileName = trainingData?.photo || "";
  if(fileName){
      let fileNameParts = fileName.split("/");
      if(fileNameParts.length > 1){
          fileName = fileNameParts[fileNameParts.length - 1];
      }
  }
  
  const filePath = `og-images/${fileName}`;
  let file = bucket.file(filePath);
  const [exists] = await file.exists();
  if (exists) {
      return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
      // const [url] = await file.getSignedUrl({
      //     action: "read",
      //     expires: Date.now() + 5 * 60 * 1000,
      // });
      // return url;
  }

  const buffer = await generateOgTrainingImage(trainingData);
  const tempFilePath = path.join("/tmp", `${trainingId}.png`);
  fs.writeFileSync(tempFilePath, buffer);
  await bucket.upload(tempFilePath, {
    destination: filePath,
    contentType: "image/png",
    metadata: {
      cacheControl: "public,max-age=31536000",
    },
  });

  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
}

async function generateOgTrainingImage(data:any) {
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  if (data.photo) {
      try {
          const response:any = await fetch(data.photo);
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const converted = await sharp(buffer).png().toBuffer();
          const img = await loadImage(converted);
          let width = 630;
          ctx.drawImage(img, 0, 0, width, height);
        } catch (err) {
          console.warn("Foto niet geladen:", err);
        }
  }

  const logoPath = 'https://firebasestorage.googleapis.com/v0/b/lwai-3bac8.firebasestorage.app/o/logos%2Falicialabs_logo.png?alt=media';
  if(data.trainer?.logo){
    const logo1Path = data.trainer.logo;
    try {
        // const logo1 = await loadImage(logo1Path);
        const response1: any = await fetch(logo1Path);
        const arrayBuffer1 = await response1.arrayBuffer();
        const buffer1 = Buffer.from(arrayBuffer1);
        const pngBuffer1 = await sharp(buffer1).png().toBuffer(); // 👉 converteer WebP naar PNG
        const logo1 = await loadImage(pngBuffer1);
        const logo1Height = 270 //height / 4; // 25% van de hoogte
        const logo1Width = 270 //(logo.width / logo.height) * logoHeight;
        ctx.drawImage(logo1, 780, 23, logo1Width, logo1Height);
        console.log('trainer gelukt', logo1Path);
        // const logo2 = await loadImage(logoPath);
        const logo2Height = 270 //height / 4; // 25% van de hoogte
        const logo2Width = 270 //(logo.width / logo.height) * logoHeight;
        // ctx.fillStyle = "#ffffff";
        // ctx.fillRect(width - logoWidth - 40, height - logoHeight - 40, logoWidth+40, logoHeight+40);
        const response2: any = await fetch(logoPath);
        const arrayBuffer2 = await response2.arrayBuffer();
        const buffer2 = Buffer.from(arrayBuffer2);
        const pngBuffer2 = await sharp(buffer2).png().toBuffer();
        const logo2 = await loadImage(pngBuffer2);

        ctx.drawImage(logo2, 780, 338, logo2Width, logo2Height);
        console.log('default gelukt', logoPath);

    } catch (err) {
      console.warn("Trainer logo niet geladen:", err);
    }
  }
  else{
    try {
      console.log('default logo path', logoPath);
        const logo = await loadImage(logoPath);
        const logoHeight = 570 //height / 4; // 25% van de hoogte
        const logoWidth = 570 //(logo.width / logo.height) * logoHeight;
        // ctx.fillStyle = "#ffffff";
        // ctx.fillRect(width - logoWidth - 40, height - logoHeight - 40, logoWidth+40, logoHeight+40);
        ctx.drawImage(logo, 630, 30, logoWidth, logoHeight);
    } catch (err) {
      console.warn("Logo niet geladen:", err);
    }
  }

  return canvas.toBuffer("image/png");
}

async function getOrCreateOgImage(caseId:string, caseData:any) {
  const bucket = storage.bucket('lwai-3bac8.firebasestorage.app');

  let fileName = caseData?.photo || "";
  if(fileName){
      let fileNameParts = fileName.split("/");
      if(fileNameParts.length > 1){
          fileName = fileNameParts[fileNameParts.length - 1];
      }
  }
  
  const filePath = `og-images/${fileName}`;
  let file = bucket.file(filePath);
  const [exists] = await file.exists();
  if (exists) {
      return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
      // const [url] = await file.getSignedUrl({
      //     action: "read",
      //     expires: Date.now() + 5 * 60 * 1000,
      // });
      // return url;
  }

  const buffer = await generateOgImage(caseData);
  const tempFilePath = path.join("/tmp", `${caseId}.png`);
  fs.writeFileSync(tempFilePath, buffer);
  await bucket.upload(tempFilePath, {
    destination: filePath,
    contentType: "image/png",
    metadata: {
      cacheControl: "public,max-age=31536000",
    },
  });

  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
}



  async function generateOgImage(data:any) {
    const width = 1200;
    const height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
  
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    if (data.photo) {
        try {
            const response:any = await fetch(data.photo);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const converted = await sharp(buffer).png().toBuffer();
            const img = await loadImage(converted);
            ctx.drawImage(img, 0, 0, 630, height);
          } catch (err) {
            console.warn("Foto niet geladen:", err);
          }
    }
  
    const logoPath = 'https://firebasestorage.googleapis.com/v0/b/lwai-3bac8.firebasestorage.app/o/logos%2Falicialabs_logo.png?alt=media'
    try {
        const logo = await loadImage(logoPath);
        const logoHeight = 570 //height / 4; // 25% van de hoogte
        const logoWidth = 570 //(logo.width / logo.height) * logoHeight;
        // ctx.fillStyle = "#ffffff";
        // ctx.fillRect(width - logoWidth - 40, height - logoHeight - 40, logoWidth+40, logoHeight+40);
        ctx.drawImage(logo, 630, 30, logoWidth, logoHeight);
    } catch (err) {
      console.warn("Logo niet geladen:", err);
    }
  
    return canvas.toBuffer("image/png");
  }


  
  function escapeHtml(text:string) {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  