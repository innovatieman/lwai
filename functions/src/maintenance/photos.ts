// import { onSchedule } from 'firebase-functions/v2/scheduler';
const { onCall, CallableRequest } = require("firebase-functions/v2/https");
import type { CallableRequest } from 'firebase-functions/lib/common/providers/https';
import { db } from "../firebase";
import admin from '../firebase'
import { HttpsError } from 'firebase-functions/v2/https';

const BUCKET_NAME = 'lwai-3bac8.firebasestorage.app'

const storage = admin.storage();

exports.manualCleanPhotos = onCall(
  {
    region: 'europe-west1',
    memory: '2GiB',
    serviceAccount: 'lwai-3bac8@appspot.gserviceaccount.com',
  },
  async (request: CallableRequest<any>) => {
    const { auth } = request;

    if (!auth){
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const usedFilenames = new Set<string>();

    await collectUsedFilenames(usedFilenames);

    console.log(`✅ Collected ${usedFilenames.size} used filenames.`);

    const {unusedFilenames, allFiles} = await processStorageFiles("generated-images/", usedFilenames);

    console.log(`📦 Cleanup complete. Moved ${unusedFilenames.length} unused files to toBeDeleted/`);
    return {
        message: "Photo cleanup completed successfully.",
        usedFilenamesCount: usedFilenames.size,
        usedSample: Array.from(usedFilenames).slice(0, 7174),
        unusedCount: unusedFilenames.length,
        unusedSample: unusedFilenames, //.slice(0, 10)
        allFiles: allFiles //.slice(0, 10)
    };

    // return { message: 'Photo cleanup completed successfully.', usedFilenames:usedFilenames, unusedFilenames: unusedFilenames };
  })

  async function collectUsedFilenames(usedFilenames: Set<string>) {
    const baseCollections = [
        { name: "avatars", field: "url" },
        { name: "ai-avatars", field: "url" },
        { name: "cases", field: "url" },
    ];

    // Helper om bestandsnamen uit URL te halen
    const extractFilename = (url: string) => {
        try {
            const decoded = decodeURIComponent(url);
            const parts = decoded.split("/");
            return parts[parts.length - 1].split("?")[0]; // laatste deel van pad zonder query
        } catch {
            return null;
        }
    };

    const addFromSnapshot = (snap: FirebaseFirestore.QuerySnapshot, field: string) => {
        snap.forEach((doc) => {
        const url = doc.get(field);
        const name = extractFilename(url);
        if (name) usedFilenames.add(name);
        });
    };

    // 🔹 Simpele collecties
    await Promise.all(
        baseCollections.map(async ({ name, field }) => {
        const snap = await db.collection(name).get();
        addFromSnapshot(snap, field);
        })
    );

    // 🔹 Complexere collecties
    await Promise.all([
        scanWithSubcollections("elearnings", ["items"], ["photo", "extra_photo"], usedFilenames),
        scanWithSubcollections("closed_elearnings", ["items"], ["photo", "extra_photo"], usedFilenames),
        scanTrainerCollections(usedFilenames),
        scanUserCollections(usedFilenames),
    ]);
}


exports.manualMovePhotosBackFromDeleted = onCall(
  {
    region: 'europe-west1',
    memory: '2GiB',
    serviceAccount: 'lwai-3bac8@appspot.gserviceaccount.com',
  },
  async (request: CallableRequest<any>) => {
    const { auth } = request;

    if (!auth){
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const bucket = storage.bucket(BUCKET_NAME);
    const [files] = await bucket.getFiles({ prefix: "toBeDeleted/" });

    for (const file of files) {
      const filename = file.name.split("/").pop();
      if (!filename) continue;

      const destination = `generated-images/${filename}`;
      const [movedFile] = await file.move(destination);
      await (movedFile as any).makePublic();

      // await file.makePublic();

      console.log(`♻️ Moved back file: ${filename}`);
    }

    return {
        message: "Photo restore completed successfully.",
        restoredCount: files.length,
    };
  }
);


// ---------------------
// 2️⃣ Collecties met subcollecties
// ---------------------

async function scanWithSubcollections(
  parentCollection: string,
  subcollections: string[],
  fields: string[],
  usedFilenames: Set<string>
) {
  const parents = await db.collection(parentCollection).get();
  for (const parent of parents.docs) {
    const extract = (value: any) => {
      if (typeof value === "string") {
        const decoded = decodeURIComponent(value);
        const parts = decoded.split("/");
        return parts[parts.length - 1].split("?")[0];
      }
      return null;
    };

    const photo = extract(parent.get("photo"));
    if (photo) usedFilenames.add(photo);

    for (const sub of subcollections) {
      const subSnap = await parent.ref.collection(sub).get();
      subSnap.forEach((subDoc) => {
        fields.forEach((f) => {
          const name = extract(subDoc.get(f));
          if (name) usedFilenames.add(name);
        });
      });
    }
  }
}

async function scanTrainerCollections(usedFilenames: Set<string>) {
  const trainers = await db.collection("trainers").get();
  for (const trainer of trainers.docs) {
    const subConfigs = [
      { sub: "cases", fields: ["photo"] },
      { sub: "infoItems", fields: ["photo", "extra_photo"] },
      { sub: "modules", fields: ["photo"] },
      { sub: "my_elearnings", fields: ["photo"], subsub: { name: "items", fields: ["photo", "extra_photo"] } },
      { sub: "trainings", fields: ["photo"], subsub: { name: "items", fields: ["photo", "extra_photo"] } },
    ];

    for (const cfg of subConfigs) {
      const subSnap = await trainer.ref.collection(cfg.sub).get();
      for (const doc of subSnap.docs) {
        cfg.fields.forEach((f) => {
          const url = doc.get(f);
          if (url) {
            const filename = decodeURIComponent(url.split("/").pop()?.split("?")[0] || "");
            if (filename) usedFilenames.add(filename);
          }
        });

        if (cfg.subsub) {
          const subsubSnap = await doc.ref.collection(cfg.subsub.name).get();
          subsubSnap.forEach((subDoc) => {
            cfg.subsub!.fields.forEach((f) => {
              const url = subDoc.get(f);
              if (url) {
                const filename = decodeURIComponent(url.split("/").pop()?.split("?")[0] || "");
                if (filename) usedFilenames.add(filename);
              }
            });
          });
        }
      }
    }
  }
}

async function scanUserCollections(usedFilenames: Set<string>) {
  const users = await db.collection("users").get();
  for (const user of users.docs) {
    const subConfigs = [
      { sub: "my_elearnings", fields: ["photo"], subsub: { name: "items", fields: ["photo", "extra_photo"] } },
      { sub: "conversations", fields: ["photo"], subsub: { name: "caseItem", fields: ["photo"] } },
    ];

    for (const cfg of subConfigs) {
      const subSnap = await user.ref.collection(cfg.sub).get();
      for (const doc of subSnap.docs) {
        cfg.fields.forEach((f) => {
          const url = doc.get(f);
          if (url) {
            const filename = decodeURIComponent(url.split("/").pop()?.split("?")[0] || "");
            if (filename) usedFilenames.add(filename);
          }
        });

        if (cfg.subsub) {
          const subsubSnap = await doc.ref.collection(cfg.subsub.name).get();
          subsubSnap.forEach((subDoc) => {
            cfg.subsub!.fields.forEach((f) => {
              const url = subDoc.get(f);
              if (url) {
                const filename = decodeURIComponent(url.split("/").pop()?.split("?")[0] || "");
                if (filename) usedFilenames.add(filename);
              }
            });
          });
        }
      }
    }
  }
}


// ---------------------
// 3️⃣ Controleren en verplaatsen van ongebruikte bestanden
// ---------------------

async function processStorageFiles(prefix: string, usedFilenames: Set<string>) {
  const bucket = storage.bucket(BUCKET_NAME);
  const [files] = await bucket.getFiles({ prefix });
  let allFiles:string[] = [];
  let unusedFilenames: string[] = [];

  for (const file of files) {
    const filename = file.name.split("/").pop();
    if (!filename) continue;
    allFiles.push(filename);
    if (!usedFilenames.has(filename)) {
        unusedFilenames.push(filename); 
        const destination = `toBeDeleted/${filename}`;
        await file.move(destination);
        // console.log(`🚮 Moved unused file: ${filename}`);
    }
  }

  return {unusedFilenames, allFiles};
}


// export const deleteOldToBeDeleted = functions.pubsub
//   .schedule("every 24 hours")
//   .timeZone("Europe/Amsterdam")
//   .onRun(async () => {
//     const bucket = storage.bucket(BUCKET_NAME);
//     const [files] = await bucket.getFiles({ prefix: "toBeDeleted/" });
//     const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

//     for (const file of files) {
//       const [metadata] = await file.getMetadata();
//       const updated = new Date(metadata.updated).getTime();
//       if (updated < sevenDaysAgo) {
//         await file.delete();
//         console.log(`🗑️ Deleted old file: ${file.name}`);
//       }
//     }
//     return null;
//   });