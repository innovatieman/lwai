const { onRequest } = require("firebase-functions/v2/https");
import admin from '../firebase'
const { createCanvas, loadImage } = require("canvas");
import sharp from "sharp";
const path = require("path");
const fs = require("fs");
const storage = admin.storage();
const db = admin.firestore();

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
  