
import * as functions from 'firebase-functions/v1';
import * as responder from '../utils/responder';
import { config } from '../configs/config-basics';

import axios from 'axios';


async function callGPT(data:string){
    try {
        const apiKey = config.GPT_bearer;
        let url = 'https://api.openai.com/v1/chat/completions';
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
        
        const response = await axios.post(url, data, { headers: headers });
        return response.data
    }
    catch (error) {
        console.error('Error calling GPT API:', error);
        throw error;
    }
}

exports.callAI = functions.region('europe-west1').runWith({memory:'8GB'}).https.onCall(async (data,context)=>{
    if(!context.auth){
        return new responder.Message('Not authorized',401)
    }
    try{
            const result = await callGPT(data)
            return new responder.Message(result,200)
    }   
    catch(error){
        console.error('Error in callGPT:', error);
        return new responder.Message(error,500)
    }

}) 
