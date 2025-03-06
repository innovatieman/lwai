import admin from '../firebase'
import * as sharp from "sharp";
import * as functions from 'firebase-functions/v1';
import * as responder from '../utils/responder'

const storage = admin.storage();


exports.uploadImage = functions.region("europe-west1").runWith({memory:'4GB'}).https.onCall(async (data, context) => {
    // Check of gebruiker is ingelogd
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }
  
    const { fileData } = data;
  
    if (!fileData) {
      throw new functions.https.HttpsError("invalid-argument", "Bestand of bestandsformaat ontbreekt");
    }
  
    try {
        const bucket = storage.bucket('lwai-3bac8.firebasestorage.app');
        const uniqueFileName = `user_uploads/${context.auth.uid}_${Date.now()}.webp`;
        const file = bucket.file(uniqueFileName);
    
        // Buffer omzetten naar een bestand
        const buffer = Buffer.from(fileData, "base64");

        const webpBuffer = await sharp(buffer).webp().toBuffer();

        await file.save(webpBuffer, {
            metadata: {
              contentType: "image/webp",
            },
          });
        
        await file.makePublic();

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${uniqueFileName}`;
    
        return new responder.Message({ url: publicUrl });
    } catch (error) {
      console.error("Upload error:", error);
      return new responder.Message('Upload mislukt',500)
    }
});

exports.uploadPhoto = functions.region("europe-west1").https.onCall(async (data, context) => {
    // Check of gebruiker is ingelogd
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }
  
    const { fileData } = data;
  
    if (!fileData) {
      throw new functions.https.HttpsError("invalid-argument", "Bestand of bestandsformaat ontbreekt");
    }
  
    try {
        const bucket = storage.bucket('lwai-3bac8.firebasestorage.app');
        const uniqueFileName = `user_uploads/${context.auth.uid}_${Date.now()}.webp`;
        const file = bucket.file(uniqueFileName);
    
        // Buffer omzetten naar een bestand
        const buffer = Buffer.from(fileData, "base64");

        const webpBuffer = await sharp(buffer).webp().toBuffer();

        await file.save(webpBuffer, {
            metadata: {
              contentType: "image/webp",
            },
          });
        
        await file.makePublic();

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${uniqueFileName}`;
    
        return new responder.Message({ url: publicUrl });
    } catch (error) {
      console.error("Upload error:", error);
      return new responder.Message('Upload mislukt',500)
    }
});