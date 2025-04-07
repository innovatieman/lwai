const { onRequest } = require("firebase-functions/v2/https");
import { config } from '../configs/config-basics';
const axios = require("axios");

const API_KEY = config.ipapi_api_key;

exports.getIpLocation = onRequest( 
    { cors: config.allowed_cors, region: "europe-west1"},
  async (req: any, res: any) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    // Haal het IP-adres van de gebruiker op
    const userIp = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    
    if (!userIp) {
        return res.status(400).json({ error: "Geen IP-adres gevonden" });
    }

    // Roep ipapi aan met het IP-adres van de gebruiker
    const url = `https://api.ipapi.com/${userIp}?access_key=${API_KEY}`;

    try {
        const response = await axios.get(url);
        res.json(response.data);
        // res.end();
    } catch (error) {
        console.error("Fout bij het ophalen van de locatie:", error);
        res.status(500).json({ error: "Kon locatie niet ophalen" });
    }
});