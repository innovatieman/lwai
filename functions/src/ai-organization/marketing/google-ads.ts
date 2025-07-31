// const { onRequest } = require("firebase-functions/v2/https");
const { onCall, CallableRequest } = require("firebase-functions/v2/https");

// import {onDocumentWritten} from "firebase-functions/v2/firestore";
import type { CallableRequest } from 'firebase-functions/lib/common/providers/https';

// const fs = require("fs");
// const path = require("path");
// const fileType = require("file-type");
// const { VertexAI } = require("@google-cloud/vertexai");
// import {createVertex } from '@ai-sdk/google-vertex';
import * as responder from '../../utils/responder'

// const vertexAI = new VertexAI({ project: "lwai-3bac8", location: "europe-west1" });
// const modelVertex = vertexAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// const vertexEmbedding = createVertex({ project: "lwai-3bac8", location: "europe-west1" });
// const embeddingModel = vertexEmbedding.textEmbeddingModel('text-embedding-005'); 

// import { db } from "../../firebase";
import { config } from '../../configs/config-basics';

// import { GoogleGenerativeAI } from "@google/generative-ai";

// import { Firestore } from "@google-cloud/firestore";
// const clientDb = new Firestore();

// const genAI = new GoogleGenerativeAI(config.gemini_api_key);
// const modelGemini = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });


// index.js
import { GoogleAdsApi, resources, enums} from 'google-ads-api';

const client = new GoogleAdsApi({
  client_id: '760085742751-qc0msem7g3v1a6tar86du5pb5ccmfj1j.apps.googleusercontent.com',
  client_secret: config.google_ads_client_secret,
  developer_token: config.google_ads_api_key,
});

// Initializeer de customer context
const customer = client.Customer({
  customer_id: '4655780811',         // jouw Google Ads klant-ID (zonder streepjes)
  refresh_token: '',
});




exports.createCampaignGoogleAds = onCall(
  {
    region: 'europe-west1',
    memory: '1GiB',
  },
  async (request: CallableRequest<any>,) => {
    const { auth, data } = request;
    if (!auth.uid) {
      return new responder.Message('Unauthorized', 401);
    }

    if (!data || !data.name || !data.budget) {
      return new responder.Message('Missing required parameters', 400);
    }

    // 1. Create the CampaignBudget resource
    const budget = new resources.CampaignBudget({
      name: `API Budget ${new Date().toISOString()}`, // Unique name for explicitly shared budget
      amount_micros: 10_000_000,
      delivery_method: enums.BudgetDeliveryMethod.STANDARD,
      explicitly_shared: false, // This is crucial for shared budgets
    });

    console.log('Verstuur Budget naar Google Ads API:', JSON.stringify([budget], null, 2));

    // For services with direct 'create' methods, you pass an array of the resources.
    // The 'create' method implicitly wraps each resource in a 'create' operation.
    const budgetResult = await customer.campaignBudgets.create([budget]);

    console.log('Budget response:', JSON.stringify(budgetResult, null, 2));

    if (!budgetResult.results?.[0]?.resource_name) {
      console.error('Budget response ongeldig:', JSON.stringify(budgetResult, null, 2));
      return new responder.Message('Budget response was invalid', 500);
    }

    const budgetResourceName = budgetResult.results[0].resource_name;

    // 2. Create the Campaign resource
    const campaign = new resources.Campaign({
      name: `Campagne ${new Date().toISOString()}`,
      status: enums.CampaignStatus.PAUSED, // Or ENABLED, depending on your needs
      advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
      campaign_budget: budgetResourceName, // Link to the created budget
    //   advertising_channel_sub_type: enums.AdvertisingChannelSubType.UNSPECIFIED, // Meestal geschikt voor standaard zoekcampagnes
      maximize_conversions: {},
    //   manual_cpc: {
    //     enhanced_cpc_enabled: true, // Optioneel: Verbeterde CPC inschakelen
    //   },
    //   target_cpa: {
    //     target_cpa_micros: 500_000, // Bijvoorbeeld €0,50 per conversie
    //   },
      // OF Voorbeeld: Maximize Conversions (Conversies maximaliseren)
      // maximize_conversions: {}, // Geen extra parameters nodig voor de simpelste vorm
      // OF Voorbeeld: Manual CPC (Handmatige CPC)
      // manual_cpc: {
      //   enhanced_cpc_enabled: true, // Optioneel: Verbeterde CPC inschakelen
      // },
      // OF Voorbeeld: Maximum Conversion Value
      // maximize_conversion_value: {},
      // Je kunt hier ook andere biedstrategieën instellen afhankelijk van je behoeften.
      // Raadpleeg de Google Ads API documentatie voor de volledige lijst en hun parameters.

    });

    console.log('Verstuur Campagne naar Google Ads API:', JSON.stringify([campaign], null, 2));

    // Similarly for campaigns, pass an array of the campaign resources directly.
    const campaignResult = await customer.campaigns.create([campaign]);


    return new responder.Message(campaignResult, 200);
  }
);

// Functie om een tekstadvertentie toe te voegen
// async function createAd() {
//   try {
//     // Eerst: een campagne & budget
//     const [campaignResult] = await customer.campaigns.create({
//       name: 'Mijn API Campagne ' + Date.now(),
//       status: enums.CampaignStatus.PAUSED,
//       advertising_channel_type: 'SEARCH',
//       campaign_budget: {
//         amount_micros: 10000000, // = €10,00
//       },
//     });

//     const campaignResource = campaignResult.resource_name;

//     // Maak een advertentiegroep
//     const [adGroupResult] = await customer.adGroups.create({
//       campaign: campaignResource,
//       name: 'API AdGroup',
//       status: enums.AdGroupStatus.ENABLED,
//     });
//     const adGroupResource = adGroupResult.resource_name;

//     // Maak de advertentie
//     const ad = new resources.Ad({
//       final_urls: ['https://voorbeeld.nl'],
//       headline_part1: 'Koop nu',
//       headline_part2: 'Beste Aanbieding',
//       description: 'Bestel vandaag nog.',
//     });

//     const [adResult] = await customer.ads.create({
//       ad_group: adGroupResource,
//       ad,
//       status: enums.AdGroupAdStatus.PAUSED,
//     });

//     console.log('Gemaakt advertentie:', adResult.resource_name);
//   } catch (err) {
//     console.error('Error:', err);
//   }
// }
