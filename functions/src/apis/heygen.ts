const { onRequest } = require("firebase-functions/v2/https");
const axios = require('axios');
import { config } from '../configs/config-basics';

// Voeg hier je HeyGen API-sleutel toe
const HEYGEN_API_KEY = config.heygen_api_key;
const heygen_url_token = 'https://api.heygen.com/v1/streaming.create_token'

exports.getHeyGenToken = onRequest(
    { cors: ["http://localhost:8100"], region: "europe-west1"  },
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
