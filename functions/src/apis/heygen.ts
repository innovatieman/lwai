const { onRequest } = require("firebase-functions/v2/https");
const { onCall, CallableRequest } = require("firebase-functions/v2/https");
import type { CallableRequest } from 'firebase-functions/lib/common/providers/https';
const axios = require('axios');
import { config } from '../configs/config-basics';
// const BUCKET_NAME = 'lwai-3bac8.firebasestorage.app'
// import { db } from "../firebase";
import admin from '../firebase'

// const storage = admin.storage();

// Voeg hier je HeyGen API-sleutel toe
const HEYGEN_API_KEY = config.heygen_api_key;
const heygen_url_token = 'https://api.heygen.com/v1/streaming.create_token'

exports.getHeyGenToken = onRequest(
    { cors: config.allowed_cors, region: "europe-west1"  },
    async (req:any, res:any) => {
  try {
    // Token aanvragen bij HeyGen API
    console.log('heygen_url_token: '+heygen_url_token)
    const response = await axios.post(
      heygen_url_token,
      {},
      {
        headers: {
          'x-api-key': HEYGEN_API_KEY,
        },
      }
    );
    const token = response.data.data.token;
    res.status(200).json({ token });
  } catch (error) {
    console.error('Error fetching token:', error);
    res.status(500).json({ error: 'Failed to fetch HeyGen token' });
  }
});


// import * as tmp from 'tmp';
// import * as fs from 'fs';


const HEYGEN_BASE_URL = 'https://api.heygen.com/v2';

exports.generateHeygenVideo = onCall(
  {
    region: 'europe-west1',
    memory: '1GiB',
  },
  async (request: CallableRequest<any>) => {
    const { title, storyText, lesson_number, closing_text, caption, trainerId, infoItemId, trainingId } = request.data;

    try {
      // const res = await axios.post(
      //   `${HEYGEN_BASE_URL}/video/generate`,
      //   {
      //     test: false,
      //     caption: true,
      //     title: title,
      //     video_inputs: [
      //       {
      //         "character": {
      //           "type": "avatar",
      //           "avatar_id": "Annie_Bar_Standing_Front_2_public",
      //           "avatar_style": "normal"
      //         },
      //         "voice": {
      //           "type": "text",
      //           "input_text": `Welkom bij de les: ${title}.`,
      //           "voice_id": "2f09681298ee4103ad78bc689a4dea0b",
      //         }
      //       },
      //       {
      //         "character": {
      //           "type": "avatar",
      //           "avatar_id": "Annie_Bar_Standing_Front_2_public",
      //           "avatar_style": "normal"
      //         },
      //         "voice": {
      //           "type": "text",
      //           "input_text": `Welkom bij de les: ${title}.`,
      //           "voice_id": "2f09681298ee4103ad78bc689a4dea0b",
      //         }
      //       },
      //       {
      //         "character": {
      //           "type": "avatar",
      //           "avatar_id": "Annie_Bar_Standing_Front_2_public",
      //           "avatar_style": "normal"
      //         },
      //         "voice": {
      //           "type": "text",
      //           "input_text": storyText,
      //           "voice_id": "2f09681298ee4103ad78bc689a4dea0b",
      //           // "speed": 1.1
      //         }
      //       }
      //     ],
      //     dimension: {
      //       "width": 1280,
      //       "height": 720
      //     }
      //   },
      //   {
      //     headers: {
      //       Authorization: `Bearer ${HEYGEN_API_KEY}`,
      //       'Content-Type': 'application/json',
      //     },
      //   }
      // );

      const templates:any = {
        1: '811ca7afb93d4f72be3aae38c16370bb',
        2: 'c71cd809802040479bf9bdc451e1fe61',
        3: 'e69b470391934fe1aabc86087e8d4f68',
        4: '56e58a8e74024069b112f32e22712c20',
        5: 'f6b2c7f732e44f12b21f65f322e45203',
        6: 'b00db5470ef044c2984264d893136ffd',
      };

      const partsLength = storyText.length
      let templateId = 'c71cd809802040479bf9bdc451e1fe61';    
      if (templates[partsLength]) {
        templateId = templates[partsLength];
      } 

      let variables:any = {
        subtitle: {
          properties: {
            content: `${title}`,
          },
          type: 'text',
          name: 'subtitle'
        },
        lesson_number: {
          properties: {content: `${lesson_number}`},
          type: 'text',
          name: 'lesson_number'
        },
        closing_text: {
          properties: {content: `${closing_text}`},
          type: 'text',
          name: 'closing_text'
        }
      }
          
      for(let i=0;i<partsLength;i++){
        variables[`part_${i+1}`] = {
          properties: {
            content: `${[storyText[i]]}`,
          },
          type: 'text',
          name: `part_${i+1}`
        }
      }


      const res = await axios.post(
        `${HEYGEN_BASE_URL}/template/${templateId}/generate`,
        {
          caption: caption || false,
          include_gif: false,
          variables: variables,
          title: `${title}`,
          enable_sharing: false
        }, 
        {
          headers: {
            Authorization: `Bearer ${HEYGEN_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });


      const videoId = res.data.data.video_id;

      await admin.firestore().collection('lessonVideos').doc(videoId).set({
        videoId,
        title,
        storyText,
        status: 'processing',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        trainerId : trainerId || null,
        infoItemId : infoItemId || null,
        trainingId : trainingId || null
      }); 

      return { success: true, videoId };
    } catch (error: any) {
      // ✅ 1. Log foutcode en fouttekst
      console.error('HeyGen API error:', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        message: error?.message,
        data: error?.response?.data,
      });

      // ✅ 2. Geef duidelijke fout terug aan client
      return {
        success: false,
        error: 'Video generatie mislukt.',
        details: error?.response?.data || error?.message || 'Onbekende fout',
      };
    }
  }
);




  //   export const checkHeygenVideos = functions.pubsub
  //   .schedule('every 5 minutes')
  //   .onRun(async () => {



  //   const { title, storyText } = request.data;

  //   // 1. Start video creation with scenes
  //   const res = await axios.post(`${HEYGEN_BASE_URL}/videos`, {
  //     test: false, // Zet op true voor testmodus
  //     scenes: [
  //       {
  //         avatar_id: 'avatar_id_1',
  //         voice_id: 'voice_id_1',
  //         script: `Welkom bij les: ${title}`,
  //       },
  //       {
  //         avatar_id: 'avatar_id_1',
  //         voice_id: 'voice_id_1',
  //         script: storyText,
  //       }
  //     ]
  //   }, {
  //     headers: {
  //       Authorization: `Bearer ${HEYGEN_API_KEY}`,
  //       'Content-Type': 'application/json',
  //     }
  //   });

  //   const videoId = res.data.data.video_id;

  //   // 2. Wachten tot video gereed is
  //   let downloadUrl = '';
  //   for (let i = 0; i < 30; i++) {
  //     const statusRes = await axios.get(`${HEYGEN_BASE_URL}/videos/${videoId}`, {
  //       headers: { Authorization: `Bearer ${HEYGEN_API_KEY}` }
  //     });

  //     const status = statusRes.data.data.status;
  //     if (status === 'completed') {
  //       downloadUrl = statusRes.data.data.download_url;
  //       break;
  //     } else if (status === 'failed') {
  //       throw new Error('Video generation failed.');
  //     }
  //     await new Promise(resolve => setTimeout(resolve, 10000)); // 10s pauze
  //   }

  //   if (!downloadUrl) throw new Error('Video not ready after waiting.');

  //   // 3. Download de video tijdelijk
  //   const tmpFile = tmp.fileSync({ postfix: '.mp4' });
  //   const writer = fs.createWriteStream(tmpFile.name);
  //   const videoStream = await axios.get(downloadUrl, { responseType: 'stream' });
  //   videoStream.data.pipe(writer);

  //   await new Promise((resolve, reject) => {
  //     writer.on('finish', resolve);
  //     writer.on('error', reject);
  //   });

  //   // 4. Upload naar Cloud Storage
  //   const destination = `videos/${videoId}.mp4`;

  //   await storage.bucket(BUCKET_NAME).upload(tmpFile.name, {
  //     destination,
  //     metadata: {
  //       contentType: 'video/mp4',
  //     }
  //   });

  //   tmpFile.removeCallback();
  //   console.log('Video uploaded to storage:', destination);
  //   const publicUrl = `https://storage.googleapis.com/${bucketName}/${destination}`;
  //   return { success: true, videoUrl: publicUrl };
  // });