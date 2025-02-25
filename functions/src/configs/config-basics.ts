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

  }
};