import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  GPT_bearer: process.env.GPT_BEARER || '',
  d_id_token: process.env.D_ID_TOKEN || '',
  openai_secret_key: process.env.OPEN,
  heygen_api_key: process.env.HEYGEN_API_KEY,
  allowed_cors:['*'],
  assembly_api_key: process.env.ASSEMBLY_API_KEY,
  google_speech: {
    client_email: process.env.GOOGLE_SPEECH_CLIENT_EMAIL || '',
    private_key: process.env.GOOGLE_SPEECH_PRIVATE_KEY || '',

  },
  stripe:{
    test_secret_key: process.env.STRIPE_TEST_SECRET_KEY || '',
    test_secret_webhook: process.env.STRIPE_TEST_SECRET_WEBHOOK || '',
    test_secret_webhook_subscriptions: process.env.STRIPE_TEST_SECRET_WEBHOOK_SUBSCRIPTIONS || '',
    live_secret_key: process.env.STRIPE_LIVE_SECRET_KEY || '',
  },
  runware_api_key: process.env.RUNWARE_API_KEY || '',
  gemini_api_key: process.env.GEMINI_API_KEY || '',
  ipapi_api_key: process.env.IPAPI_API_KEY || '',
  elevenlabs_api_key: process.env.ELEVENLABS_API_KEY || '',
  hume_api_key:process.env.HUME_API_KEY || '',
};