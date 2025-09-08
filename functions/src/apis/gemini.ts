const { onRequest } = require("firebase-functions/v2/https");
// const { encoding_for_model } = require("tiktoken");
const fs = require("fs");
const path = require("path");
// import * as mime from "mime-types";
const fileType = require("file-type");
const { VertexAI } = require("@google-cloud/vertexai");
import {createVertex } from '@ai-sdk/google-vertex';
import * as responder from '../utils/responder'
// import { TextToSpeechClient } from "@google-cloud/text-to-speech";

const vertexAI = new VertexAI({ project: "lwai-3bac8", location: "europe-west1" });
const modelVertex = vertexAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const vertexEmbedding = createVertex({ project: "lwai-3bac8", location: "europe-west1" });
const embeddingModel = vertexEmbedding.textEmbeddingModel('text-embedding-005'); // of 'text-embedding-005'

// import * as ffmpeg from "ffmpeg-static";
// import { spawn } from "child_process";
const textToSpeech = require("@google-cloud/text-to-speech");
const ttsClient = new textToSpeech.TextToSpeechClient();
import { ElevenLabsClient} from "elevenlabs";
import { db } from "../firebase";
// import openai from '../configs/config-openai';
import { config } from '../configs/config-basics';
// import admin from '../firebase'

// const { exec } = require('child_process'); // Nodig voor conversie

// const storage = admin.storage();
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buffer } from "stream/consumers";
import { Readable } from "stream";
import moment from "moment";
import { FieldValue } from 'firebase-admin/firestore';
import { Firestore } from "@google-cloud/firestore";
const clientDb = new Firestore();

const { onCall, CallableRequest } = require("firebase-functions/v2/https");
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import type { CallableRequest } from 'firebase-functions/lib/common/providers/https';

const genAI = new GoogleGenerativeAI(config.gemini_api_key);
const modelGemini = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
// const openAiModal = 'gpt-4o';
const eleven = new ElevenLabsClient({
  apiKey: config.elevenlabs_api_key,
});
const creditsCost:any = {
  reaction: 3,
  choices: 4,
  facts: 7,
  background: 4,
  phases: 7,
  feedback: 2,
  closing: 7,
  promptChecker: 2,
  case_prompt: 5,
  goal: 3,
  soundToText:2,
  skills: 5,
  close_analyst: 10
}

// firebase deploy --only functions:chatGemini,functions:choicesGemini,functions:factsGemini,functions:backgroundGemini,functions:phasesGemini,functions:feedbackGemini,functions:closingGemini,functions:case_prompt_gemini,functions:soundToTextGemini,functions:skillsGemini


exports.chatGemini = onRequest( 
  { cors: config.allowed_cors, region: "europe-west1" , memory: '1GiB', timeoutSeconds: 540},
  async (req: any, res: any) => {
    ////////////////////////////////////////////////////////////////////
    // Set headers
    ////////////////////////////////////////////////////////////////////
    res = setHeaders(res);

    try {
      ////////////////////////////////////////////////////////////////////
      // Check required parameters
      //////////////////////////////////////////////////////////////////
      const body = req.body;
      if((!body.userId) || (!body.conversationId) || (!body.categoryId) || (!body.caseId) || (!body.instructionType) || (!body.attitude) || (!body.prompt && !body.conversationId)){
        // console.log("userId:",body.userId,"conversationId:",body.conversationId,"categoryId:",body.categoryId,"caseId:",body.caseId,"instructionType:",body.instructionType,"attitude:",body.attitude,"prompt:",body.prompt);
        console.log("Missing required parameters in request body");
        res.status(400).send("Missing required parameters in request body");
        return;
      }
      
      ////////////////////////////////////////////////////////////////////
      // Check subscription
      ////////////////////////////////////////////////////////////////////
      const hasValidSubscription = await checkUserSubscription(body.userId);
      if (!hasValidSubscription) {
        res.status(403).send("User does not have a valid subscription");
        return;
      }

      ////////////////////////////////////////////////////////////////////
      // Get conversation messages
      ////////////////////////////////////////////////////////////////////
      let messages = []
      messages = await getPreviousMessages(body.userId, body.conversationId);
      if (!messages) {
        // console.log("No previous messages found");
        messages = await initializeConversation(body);
      }
      else{
        // console.log('messages found',messages.length)
        await setToConversation(body.userId,body.conversationId,'user',body.prompt,'messages',messages.length+'');
        messages.push({ role: "user", content: body.prompt });
      }
      // console.log('count messages:',messages.length)
      ////////////////////////////////////////////////////////////////////
      // Calculate prompt tokens
      ////////////////////////////////////////////////////////////////////
      // const promptTokens = calculateTokens(messages);


      ////////////////////////////////////////////////////////////////////
      // Set language
      ////////////////////////////////////////////////////////////////////
      let language = 'nl'
      if(body.language){
        language = body.language;
      }

      ////////////////////////////////////////////////////////////////////
      // Get agent instructions
      ////////////////////////////////////////////////////////////////////
      
      const [agent_instructions] = await Promise.all([
        getAgentInstructions(body.instructionType,body.categoryId,language), 
      ]);

      ////////////////////////////////////////////////////////////////////
      // Stream Gemini
      ////////////////////////////////////////////////////////////////////
      const result = await streamingGemini(messages,agent_instructions,true)
      let completeMessage = ''
      let promptTokens:any = {}
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        res.write(chunkText);
        completeMessage = completeMessage + chunkText;
        promptTokens = chunk.usageMetadata;
      }
      
    //   let complete = await streamingChunks(stream,res);

      ////////////////////////////////////////////////////////////////////
      // end response
      ////////////////////////////////////////////////////////////////////
      res.end();

      ////////////////////////////////////////////////////////////////////
      // Add to conversation in Firebase
      ////////////////////////////////////////////////////////////////////
      await setToConversation(body.userId,body.conversationId,'assistant',completeMessage.split('```json').join('').split('```').join(''),'messages',(messages.length+1)+'');

      ////////////////////////////////////////////////////////////////////
      // Stop loading
      ////////////////////////////////////////////////////////////////////
      await stopLoading(body)

      ////////////////////////////////////////////////////////////////////
      // Add token usage
      ////////////////////////////////////////////////////////////////////
      await addTokenUsages(body,promptTokens.promptTokenCount,promptTokens.candidatesTokenCount,'reaction');

      ////////////////////////////////////////////////////////////////////
      // Update credits
      ////////////////////////////////////////////////////////////////////
      if(!body.training?.trainingId || !body.training?.trainerId){
        await updateCredits(body.userId, creditsCost['reaction']);
      }
      else{
        await updateCreditsTraining(body.userEmail,creditsCost['reaction'],body.training.trainingId,body.training.trainerId);
      }

    } catch (error) {
      ////////////////////////////////////////////////////////////////////
      // Error handling
      ////////////////////////////////////////////////////////////////////
      console.error("Error tijdens streaming:", error);
      res.status(500).send("Error tijdens streaming");
    }
  }
);


exports.chatExpertGemini = onRequest( 
  { cors: config.allowed_cors, region: "europe-west1" , memory: '1GiB', timeoutSeconds: 540},
  async (req: any, res: any) => {
    ////////////////////////////////////////////////////////////////////
    // Set headers
    ////////////////////////////////////////////////////////////////////
    res = setHeaders(res);

    try {
      ////////////////////////////////////////////////////////////////////
      // Check required parameters
      //////////////////////////////////////////////////////////////////
      const body = req.body;
      if((!body.userId) || (!body.conversationId) || (!body.categoryId) || (!body.caseId) || (!body.instructionType) || (!body.attitude) || (!body.prompt && !body.conversationId)){
        // console.log("userId:",body.userId,"conversationId:",body.conversationId,"categoryId:",body.categoryId,"caseId:",body.caseId,"instructionType:",body.instructionType,"attitude:",body.attitude,"prompt:",body.prompt);
        console.log("Missing required parameters in request body");
        res.status(400).send("Missing required parameters in request body");
        return;
      }
      
      ////////////////////////////////////////////////////////////////////
      // Check subscription
      ////////////////////////////////////////////////////////////////////
      const hasValidSubscription = await checkUserSubscription(body.userId);
      if (!hasValidSubscription) {
        res.status(403).send("User does not have a valid subscription");
        return;
      }

      ////////////////////////////////////////////////////////////////////
      // Get conversation messages
      ////////////////////////////////////////////////////////////////////
      let messages = []
      // let rewrite_neccessary = false
      messages = await getPreviousMessages(body.userId, body.conversationId);
      if (!messages) {
        // console.log("No previous messages found");
        messages = await initializeConversation(body);
      }
      else{
        // rewrite_neccessary = true;
        // console.log('messages found',messages.length)
        await setToConversation(body.userId,body.conversationId,'user',body.prompt,'messages',messages.length+'');
        messages.push({ role: "user", content: body.prompt });
      }

      ////////////////////////////////////////////////////////////////////
      // Set language
      ////////////////////////////////////////////////////////////////////
      let language = 'nl'
      if(body.language){
        language = body.language;
      }

        
      const conversationRef = db.doc(`users/${body.userId}/conversations/${body.conversationId}`);
      const [conversationSnap] = await Promise.all([
        conversationRef.get()
      ]);

      let conversationData:any = {}
      if (!conversationSnap.exists) {
        conversationData = {};
      }
      else{
        conversationData = conversationSnap.data();
      }
      let relevant_expertise = ''

      ////////////////////////////////////////////////////////////////////
      // rewrite query if needed
      ////////////////////////////////////////////////////////////////////
      if(conversationData.expertise_title){
        ////////////////////////////////////////////////////////////////////
        // Set system content
        ////////////////////////////////////////////////////////////////////
        let allMessages = JSON.parse(JSON.stringify(messages));
        for(let i=0;i<allMessages.length;i++){
          allMessages[i].content = cleanReactionMessage(allMessages[i].content);
        }

        let conversation:any = {
          conversation: allMessages,
          latest_user_message: allMessages[allMessages.length - 1]
        }

        conversation = JSON.stringify(conversation);
        ////////////////////////////////////////////////////////////////////
        // Get agent instructions
        ////////////////////////////////////////////////////////////////////
        const [agent_instructions_rewrite,formats] = await Promise.all([
          getAgentInstructions('query_rewriter',body.categoryId,language), 
          getFormats('query_rewriter'),
        ]);

        ////////////////////////////////////////////////////////////////////
        // Set system content
        ////////////////////////////////////////////////////////////////////
        let systemContent = setSystemContent(agent_instructions_rewrite,formats);
        // systemContent = systemContent.split("[expertise_title]").join(conversationData.expertise_title);
        // systemContent = systemContent.split("[expertise_summary]").join(conversationData.expertise_summary);

        ////////////////////////////////////////////////////////////////////
        // Set messages
        ////////////////////////////////////////////////////////////////////
        let sendMessages:any[] = [
          {role: "system", content: systemContent},
          {role: "user", content: conversation},
        ]

        ////////////////////////////////////////////////////////////////////
        // Get rewritten query
        ////////////////////////////////////////////////////////////////////
        const result_rewrite:any = await streamGemini(sendMessages,agent_instructions_rewrite,false)
        const rewrittenMessage = result_rewrite.text();

          ////////////////////////////////////////////////////////////////////
        // Get vector search
        ////////////////////////////////////////////////////////////////////
        const resultvector = await embeddingModel.doEmbed({ values: [rewrittenMessage] });
        const vectorSearch = resultvector.embeddings[0];

        ////////////////////////////////////////////////////////////////////
        // Get vector search results
        ////////////////////////////////////////////////////////////////////
        const vectorQuery = db
          .collection('segments')
          .where('type', '==', 'knowledge')
          .where('trainerId', '==', conversationData.trainerId)
          .where('metadata.book', '==', conversationData.expertise_title || '')
          .findNearest({vectorField:"embedding", queryVector:vectorSearch,limit: 3, distanceMeasure: 'COSINE', distanceResultField: 'distance'});
        
        const result = await vectorQuery.get();
        if (result.empty) {
          relevant_expertise = '(No relevant expertise found)';
        }
        // Format the results
        const formattedResults = result.docs.map((doc:any) => ({
          data: doc.data(),
        }));
        
        for( let i=0;i<formattedResults.length;i++){
          if(formattedResults[i].data.distance < 0.5){
            relevant_expertise = relevant_expertise + formattedResults[i].data.text + '\n\n'; 
          }
        }

        for(let i=0;i<messages.length;i++){
          messages[i].content = messages[i].content.split('[expertise_title]').join(conversationData.expertise_title).split('[expertise_summary]').join(conversationData.expertise_summary);
          messages[i].content = messages[i].content.split('[relevant_vector_output]').join(relevant_expertise || ('No relevant expertise found'));
        }
      }

      // await setToConversation(body.userId,body.conversationId,'user',body.prompt,'messages',messages.length+'');
      
      ////////////////////////////////////////////////////////////////////
      // Get agent instructions
      ////////////////////////////////////////////////////////////////////
      const [agent_instructions] = await Promise.all([
        getAgentInstructions(body.instructionType,body.categoryId,language), 
      ]);

      ////////////////////////////////////////////////////////////////////
      // Stream Gemini
      ////////////////////////////////////////////////////////////////////
      const result = await streamingExpertGemini(messages,agent_instructions,conversationData,relevant_expertise)
      let completeMessage = ''
      let promptTokens:any = {}
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        res.write(chunkText);
        completeMessage = completeMessage + chunkText;
        promptTokens = chunk.usageMetadata;
      }
    //   let complete = await streamingChunks(stream,res);

      ////////////////////////////////////////////////////////////////////
      // end response
      ////////////////////////////////////////////////////////////////////
      res.end();

      ////////////////////////////////////////////////////////////////////
      // Add to conversation in Firebase
      ////////////////////////////////////////////////////////////////////
      await setToConversation(body.userId,body.conversationId,'assistant',completeMessage.split('```json').join('').split('```').join(''),'messages',(messages.length+1)+'');

      ////////////////////////////////////////////////////////////////////
      // Stop loading
      ////////////////////////////////////////////////////////////////////
      await stopLoading(body)

      ////////////////////////////////////////////////////////////////////
      // Add token usage
      ////////////////////////////////////////////////////////////////////
      await addTokenUsages(body,promptTokens.promptTokenCount,promptTokens.candidatesTokenCount,'reaction');

      ////////////////////////////////////////////////////////////////////
      // Update credits
      ////////////////////////////////////////////////////////////////////
      if(!body.training?.trainingId || !body.training?.trainerId){
        await updateCredits(body.userId, creditsCost['reaction']);
      }
      else{
        await updateCreditsTraining(body.userEmail,creditsCost['reaction'],body.training.trainingId,body.training.trainerId);
      }

    } catch (error) {
      ////////////////////////////////////////////////////////////////////
      // Error handling
      ////////////////////////////////////////////////////////////////////
      console.error("Error tijdens streaming:", error);
      res.status(500).send("Error tijdens streaming");
    }
  }
);

exports.choicesGemini = onRequest(
  { cors: config.allowed_cors, region: "europe-west1" , memory: '1GiB', timeoutSeconds: 540},
  async (req: any, res: any) => {
    ////////////////////////////////////////////////////////////////////
    // Set headers
    ////////////////////////////////////////////////////////////////////
    res = setHeaders(res);

    try {
      ////////////////////////////////////////////////////////////////////
      // Check required parameters
      ////////////////////////////////////////////////////////////////////
      const body = req.body;
      if((!body.userId) || (!body.conversationId) || (!body.instructionType) || (!body.role) || (!body.categoryId)){
        console.log("Missing required parameters in request body");
        res.status(400).send("Missing required parameters in request body");
        return;
      }

      ////////////////////////////////////////////////////////////////////
      // Check subscription
      ////////////////////////////////////////////////////////////////////
      const hasValidSubscription = await checkUserSubscription(body.userId);
      if (!hasValidSubscription) {
        res.status(403).send("User does not have a valid subscription");
        return;
      }

      ////////////////////////////////////////////////////////////////////
      // Get conversation messages
      ////////////////////////////////////////////////////////////////////
      let messages:any = []
      messages = await getPreviousMessages(body.userId, body.conversationId);
      if (!messages) {
        return res.status(400).send("No previous messages found");
      }

      ////////////////////////////////////////////////////////////////////
      // Get last phase scores
      ////////////////////////////////////////////////////////////////////
      let phaseMessages = await getPreviousMessages(body.userId, body.conversationId,'phases');
      let lastPhaseScores:any = ''
      if (!phaseMessages) {
        lastPhaseScores = [{content:'No scores currently available'}];
      }
      else{
        lastPhaseScores = phaseMessages[phaseMessages.length-1].content;
        lastPhaseScores = JSON.parse(lastPhaseScores);
        lastPhaseScores = lastPhaseScores.element_levels;
      }
      lastPhaseScores = '<pre>'+JSON.stringify(lastPhaseScores)+'</pre>';

      ////////////////////////////////////////////////////////////////////
      // Get message text
      ////////////////////////////////////////////////////////////////////
      let messageText = '<pre>' + JSON.stringify(messages) + '</pre>';
      let lastMessage =  cleanReactionMessage(messages[messages.length-1].content);

      ////////////////////////////////////////////////////////////////////
      // Get category data
      ////////////////////////////////////////////////////////////////////
      const categoryRef = db.doc(`categories/${body.categoryId}`);
      const conversationRef = db.doc(`users/${body.userId}/conversations/${body.conversationId}`);
      const caseRef = db.doc(`users/${body.userId}/conversations/${body.conversationId}/caseItem/caseItem`);
      const [agent_instructions, categorySnap,formats,conversationSnap,caseSnap] = await Promise.all([
        getAgentInstructions(body.instructionType,body.categoryId), 
        categoryRef.get(), 
        getFormats(body.instructionType),
        conversationRef.get(),
        caseRef.get()
      ]);

    if (!categorySnap.exists) {
      throw new Error("Category not found");
    }
      const categoryData = categorySnap.data();
      const conversationData = conversationSnap.data();
      const caseData = caseSnap.data();

      caseData.extra_knowledge_summary = ''
      if(caseData.extra_knowledge && caseData.trainerId){
        const knowledgeRef = db.collection(`trainers`).doc(caseData.trainerId).collection('knowledge').doc(caseData.extra_knowledge);
        const knowledgeSnap = await knowledgeRef.get();
        if(knowledgeSnap.exists){
          caseData.extra_knowledge_summary = knowledgeSnap.data().summary || '';
        }
      }

      ////////////////////////////////////////////////////////////////////
      // Set system content
      ////////////////////////////////////////////////////////////////////
      let systemContent = setSystemContent(agent_instructions,formats);
      systemContent = systemContent.split(`[phases_scores]`).join(lastPhaseScores);
      systemContent = systemContent.split(`[extra_knowledge]`).join(caseData.extra_knowledge_summary);

      ////////////////////////////////////////////////////////////////////
      // Get possible goals
      //////////////////////////////////////////////////////////////////
      let goals:string = goalsText(conversationData);

      ////////////////////////////////////////////////////////////////////
      // Set user content
      ////////////////////////////////////////////////////////////////////
      let content = agent_instructions.content.split("[role]").join(body.role)
      content = content.split("[goal]").join(goals);
      content = content.split("[category]").join(categoryData.title);
      content = content.split('[messages]').join(messageText).split('[lastMessage]').join(lastMessage);
      content = content.split('[phases]').join('<pre>'+JSON.stringify(categoryData.phaseList)+'</pre>');

      ////////////////////////////////////////////////////////////////////
      // Set messages
      ////////////////////////////////////////////////////////////////////
      let sendMessages:any[] = []
      if(body.allMessages){
        sendMessages = messages;
      }
      else{
        sendMessages.push({role: "system",content: systemContent})
        sendMessages.push({role: "user",content: content})
      }

      ////////////////////////////////////////////////////////////////////
      // Stream Gemini
      ////////////////////////////////////////////////////////////////////
      const result:any = await streamGemini(sendMessages,agent_instructions,false)
      const completeMessage = result.text();

      ////////////////////////////////////////////////////////////////////
      // Add to conversation in Firebase
      ////////////////////////////////////////////////////////////////////
      await addToConversation(body.userId,body.conversationId,'assistant',completeMessage,'choices');

      ////////////////////////////////////////////////////////////////////
      // Stop loading
      ////////////////////////////////////////////////////////////////////
      await stopLoading(body);
      
      ////////////////////////////////////////////////////////////////////
      // Add token usage
      ////////////////////////////////////////////////////////////////////
      await addTokenUsages(body,result.usageMetadata.promptTokenCount,result.usageMetadata.candidatesTokenCount,'choices');

      ////////////////////////////////////////////////////////////////////
      // Update credits
      ////////////////////////////////////////////////////////////////////
      if(!body.training?.trainingId || !body.training?.trainerId){
        await updateCredits(body.userId, creditsCost['choices']);
      }
      else{
        await updateCreditsTraining(body.userEmail,creditsCost['choices'],body.training.trainingId,body.training.trainerId);
      }

      ////////////////////////////////////////////////////////////////////
      // Return response
      ////////////////////////////////////////////////////////////////////
      res.status(200).send('ready');
        
    } catch (error) {
      ////////////////////////////////////////////////////////////////////
      // Error handling
      ////////////////////////////////////////////////////////////////////
      console.error("Error tijdens streaming:", error);
      res.status(500).send("Error tijdens streaming");
    }
  }
);

exports.factsGemini = onRequest(
  { cors: config.allowed_cors, region: "europe-west1" , memory: '1GiB', timeoutSeconds: 540},
  async (req: any, res: any) => {
    
    ////////////////////////////////////////////////////////////////////
    // Set headers
    ////////////////////////////////////////////////////////////////////
    res = setHeaders(res);

    try {

      ////////////////////////////////////////////////////////////////////
      // Check required parameters
      ////////////////////////////////////////////////////////////////////
      const body = req.body;
      if((!body.userId) || (!body.conversationId) || (!body.instructionType) || (!body.role) || (!body.categoryId)){
        console.log("Missing required parameters in request body");
        res.status(400).send("Missing required parameters in request body");
        return;
      }

      ////////////////////////////////////////////////////////////////////
      // Set language
      ////////////////////////////////////////////////////////////////////
      let language = 'nl'
      if(body.language){
        language = body.language;
      }

      ////////////////////////////////////////////////////////////////////
      // Check subscription
      ////////////////////////////////////////////////////////////////////
      const hasValidSubscription = await checkUserSubscription(body.userId);
      if (!hasValidSubscription) {res.status(403).send("User does not have a valid subscription");return;}

      ////////////////////////////////////////////////////////////////////
      // Get conversation messages
      ////////////////////////////////////////////////////////////////////
      let messages:any = []
      messages = await getPreviousMessages(body.userId, body.conversationId);
      if (!messages) {messages = [{content:'No other messages found'}];}
      messages = messages.slice(-4);
      let messageText = '<pre>' + JSON.stringify(messages) + '</pre>';

      ////////////////////////////////////////////////////////////////////
      // Get previous facts
      //////////////////////////////////////////////////////////////////
      let previousFacts:any = []
      previousFacts = await getPreviousMessages(body.userId, body.conversationId,'facts');
      if (!previousFacts) {
        previousFacts = [{content:'No other facts found'}];
      }
      previousFacts = '<pre>' + JSON.stringify(messages) + '</pre>';

      ////////////////////////////////////////////////////////////////////
      // Get category data
      ////////////////////////////////////////////////////////////////////
      const categoryRef = db.doc(`categories/${body.categoryId}/languages/${language}`);
      const [agent_instructions, categorySnap,formats] = await Promise.all([
        getAgentInstructions(body.instructionType,body.categoryId,language), 
        categoryRef.get(), 
        getFormats(body.instructionType)
      ]);
      if (!categorySnap.exists) {
        throw new Error("Category not found");
      }
      const categoryData = categorySnap.data();

      ////////////////////////////////////////////////////////////////////
      // Set system content
      ////////////////////////////////////////////////////////////////////
      let systemContent = setSystemContent(agent_instructions,formats);

      ////////////////////////////////////////////////////////////////////
      // Set user content
      ////////////////////////////////////////////////////////////////////
      let content = agent_instructions.content.split("[role]").join(body.role).split("[category]").join(categoryData.title)
      content = content.split('[facts]').join(previousFacts);
      content = content.split('[messages]').join(messageText);

      ////////////////////////////////////////////////////////////////////
      // Set messages
      ////////////////////////////////////////////////////////////////////
      let sendMessages:any[] = [
        {role: "system", content: systemContent},
        {role: "user", content: content},
      ]

      ////////////////////////////////////////////////////////////////////
      // Stream Gemini
      ////////////////////////////////////////////////////////////////////
      const result:any = await streamGemini(sendMessages,agent_instructions,false)
      const completeMessage = result.text();

      ////////////////////////////////////////////////////////////////////
      // Add to conversation in Firebase
      ////////////////////////////////////////////////////////////////////
      await addToConversation(body.userId,body.conversationId,'assistant',completeMessage,'facts');

      ////////////////////////////////////////////////////////////////////
      // Stop loading
      ////////////////////////////////////////////////////////////////////
      await stopLoading(body);

      ////////////////////////////////////////////////////////////////////
      // Add token usage
      ////////////////////////////////////////////////////////////////////
      await addTokenUsages(body,result.usageMetadata.promptTokenCount,result.usageMetadata.candidatesTokenCount,'facts');

      ////////////////////////////////////////////////////////////////////
      // Update credits
      ////////////////////////////////////////////////////////////////////
      if(!body.training?.trainingId || !body.training?.trainerId){
        await updateCredits(body.userId, creditsCost['facts']);
      }
      else{
        await updateCreditsTraining(body.userEmail,creditsCost['facts'],body.training.trainingId,body.training.trainerId);
      }

      ////////////////////////////////////////////////////////////////////
      // Return response
      ////////////////////////////////////////////////////////////////////
      res.status(200).send('ready');
        
    } catch (error) {
      ////////////////////////////////////////////////////////////////////
      // Error handling
      ////////////////////////////////////////////////////////////////////
      console.error("Error tijdens streaming:", error);
      res.status(500).send("Error tijdens streaming");
    }
  }
);

exports.backgroundGemini = onRequest(
  { cors: config.allowed_cors, region: "europe-west1" , memory: '1GiB', timeoutSeconds: 540},
  async (req: any, res: any) => {

    ////////////////////////////////////////////////////////////////////
    // Set headers
    ////////////////////////////////////////////////////////////////////
    res = setHeaders(res);

    try {
      ////////////////////////////////////////////////////////////////////
      // Check required parameters
      ////////////////////////////////////////////////////////////////////
      const body = req.body;
      if((!body.userId) || (!body.conversationId) || (!body.instructionType) || (!body.role) || (!body.categoryId)){
        console.log("Missing required parameters in request body");
        res.status(400).send("Missing required parameters in request body");
        return;
      }

      ////////////////////////////////////////////////////////////////////
      // Set language
      ////////////////////////////////////////////////////////////////////
      let language = 'nl'
      if(body.language){
        language = body.language;
      }

      ////////////////////////////////////////////////////////////////////
      // Check subscription
      ////////////////////////////////////////////////////////////////////
      const hasValidSubscription = await checkUserSubscription(body.userId);
      if (!hasValidSubscription) {
        res.status(403).send("User does not have a valid subscription");
        return;
      }

      ////////////////////////////////////////////////////////////////////
      // Get conversation messages
      ////////////////////////////////////////////////////////////////////
      let messages:any = []
      messages = await getPreviousMessages(body.userId, body.conversationId);
      if (!messages) {
        messages = [{content:'No other messages found'}];
      }
      messages = '<pre>' + JSON.stringify(messages) + '</pre>';

      ////////////////////////////////////////////////////////////////////
      // Get previous background
      //////////////////////////////////////////////////////////////////
      let previousBackground:any = []
      previousBackground = await getPreviousMessages(body.userId, body.conversationId,'background');
      if (!previousBackground) {
        previousBackground = [{content:'No other background found'}];
      }
      previousBackground =  '<pre>' + JSON.stringify(previousBackground) + '</pre>';

      ////////////////////////////////////////////////////////////////////
      // Get category data
      ////////////////////////////////////////////////////////////////////
      const categoryRef = db.doc(`categories/${body.categoryId}/languages/${language}`);
      const caseRef = db.doc(`users/${body.userId}/conversations/${body.conversationId}/caseItem/caseItem`);
      const [agent_instructions, categorySnap,formats,caseSnap] = await Promise.all([
        getAgentInstructions(body.instructionType,body.categoryId,language), 
        categoryRef.get(), 
        getFormats(body.instructionType),
        caseRef.get()
      ]);
      if (!categorySnap.exists) {
        throw new Error("Category not found");
      }
      const categoryData = categorySnap.data();
      const caseData = caseSnap.data();
      ////////////////////////////////////////////////////////////////////
      // Set system content
      ////////////////////////////////////////////////////////////////////
      let systemContent = setSystemContent(agent_instructions,formats);
      systemContent = systemContent.split("[role]").join(body.role).split("[category]").join(categoryData.title)
      if(caseData.casus){
        systemContent = systemContent.split("[casus]").join(caseData.casus);
      }
      else{
        systemContent = systemContent.split("[casus]").join('No specific case found');
      }
      
      ////////////////////////////////////////////////////////////////////
      // Set user content
      ////////////////////////////////////////////////////////////////////
      let content = agent_instructions.content.split("[role]").join(body.role).split("[category]").join(categoryData.title)
      content = content.split('[background]').join(previousBackground).split('[messages]').join(messages);

      ////////////////////////////////////////////////////////////////////
      // Set messages
      ////////////////////////////////////////////////////////////////////
      let sendMessages:any[] = []
      sendMessages.push({role: "system",content: systemContent})
      sendMessages.push({role: "user",content: content})

      ////////////////////////////////////////////////////////////////////
      // Stream Gemini
      ////////////////////////////////////////////////////////////////////
      const result:any = await streamGemini(sendMessages,agent_instructions,false)
      const completeMessage = result.text();

      ////////////////////////////////////////////////////////////////////
      // Add to conversation in Firebase
      ////////////////////////////////////////////////////////////////////
      await addToConversation(body.userId,body.conversationId,'assistant',completeMessage,'background');
      
      ////////////////////////////////////////////////////////////////////
      // Stop loading
      ////////////////////////////////////////////////////////////////////
      await stopLoading(body);

      ////////////////////////////////////////////////////////////////////
      // Add token usage
      ////////////////////////////////////////////////////////////////////
      await addTokenUsages(body,result.usageMetadata.promptTokenCount,result.usageMetadata.candidatesTokenCount,'background');

      ////////////////////////////////////////////////////////////////////
      // Update credits
      ////////////////////////////////////////////////////////////////////
      if(!body.training?.trainingId || !body.training?.trainerId){
        await updateCredits(body.userId, creditsCost['background']);
      }
      else{
        await updateCreditsTraining(body.userEmail,creditsCost['background'],body.training.trainingId,body.training.trainerId);
      }

      ////////////////////////////////////////////////////////////////////
      // Return response
      ////////////////////////////////////////////////////////////////////
      res.status(200).send('ready');
        
    } catch (error) {
      ////////////////////////////////////////////////////////////////////
      // Error handling
      ////////////////////////////////////////////////////////////////////
      console.error("Error tijdens streaming:", error);
      res.status(500).send("Error tijdens streaming");
    }
  }
);

exports.phasesGemini = onRequest(
  { cors: config.allowed_cors, region: "europe-west1" , memory: '1GiB', timeoutSeconds: 540},
  async (req: any, res: any) => {
    ////////////////////////////////////////////////////////////////////
    // Set headers
    ////////////////////////////////////////////////////////////////////
    res = setHeaders(res);

    try {
      ////////////////////////////////////////////////////////////////////
      // Check required parameters
      ////////////////////////////////////////////////////////////////////
      const body = req.body;
      if((!body.userId) || (!body.conversationId) || (!body.instructionType) || (!body.role) || (!body.categoryId)){
        console.log("Missing required parameters in request body");
        res.status(400).send("Missing required parameters in request body");
        return;
      }

      ////////////////////////////////////////////////////////////////////
      // Set language
      ////////////////////////////////////////////////////////////////////
      let language = 'nl'
      if(body.language){
        language = body.language;
      }

      ////////////////////////////////////////////////////////////////////
      // Check subscription
      ////////////////////////////////////////////////////////////////////
      const hasValidSubscription = await checkUserSubscription(body.userId);
      if (!hasValidSubscription) {
        res.status(403).send("User does not have a valid subscription");
        return;
      }

      ////////////////////////////////////////////////////////////////////
      // Get conversation messages
      ////////////////////////////////////////////////////////////////////
      let messages = await getPreviousMessages(body.userId, body.conversationId);
      messages = await getPreviousMessages(body.userId, body.conversationId);
      if (!messages) {
        messages = [{content:`no ${body.instructionType} found`}];
      }

      let messageText = '<pre>' + JSON.stringify(messages) + '</pre>';

      ////////////////////////////////////////////////////////////////////
      // Get previous feedback
      //////////////////////////////////////////////////////////////////
      let feedback = await getPreviousMessages(body.userId, body.conversationId,body.instructionType);
      if (!feedback) {
        feedback = [{content:`no ${body.instructionType} found`}];
      }
      
      ////////////////////////////////////////////////////////////////////
      // Get category data
      ////////////////////////////////////////////////////////////////////
      const categoryRef = db.doc(`categories/${body.categoryId}/languages/${language}`);
      const [agent_instructions, categorySnap,formats] = await Promise.all([
        getAgentInstructions(body.instructionType,body.categoryId,language), 
        categoryRef.get(), 
        getFormats(body.instructionType),
      ]);
      if (!categorySnap.exists) {
        throw new Error("Category not found");
      }
      const categoryData = categorySnap.data();
      
      ////////////////////////////////////////////////////////////////////
      // Set system content
      ////////////////////////////////////////////////////////////////////
      let systemContent = setSystemContent(agent_instructions,formats);
          systemContent = systemContent.split("[role]").join(body.role).split("[category]").join(categoryData.title)
          systemContent = systemContent.split(`[phases]`).join(JSON.stringify(categoryData['phaseList']));
          systemContent = systemContent.split(`[feedback]`).join(JSON.stringify(feedback));


      ////////////////////////////////////////////////////////////////////
      // Set user content
      ////////////////////////////////////////////////////////////////////
      let content = agent_instructions.content.split("[role]").join(body.role).split("[category]").join(categoryData.title)
      content = content.split(`[messages]`).join(messageText);

      ////////////////////////////////////////////////////////////////////
      // Set messages
      ////////////////////////////////////////////////////////////////////
      let sendMessages:any[] = []
      sendMessages.push({role: "system",content: systemContent})
      sendMessages.push({role: "user",content: content})

      ////////////////////////////////////////////////////////////////////
      // Stream Gemini
      ////////////////////////////////////////////////////////////////////
      const result:any = await streamGemini(sendMessages,agent_instructions,false)
      const completeMessage = result.text();
    //   const completeMessage = completion.choices[0].message.content;
      ////////////////////////////////////////////////////////////////////
      // Add to conversation in Firebase
      ////////////////////////////////////////////////////////////////////
      await addToConversation(body.userId,body.conversationId,'assistant',completeMessage,'phases');

      ////////////////////////////////////////////////////////////////////
      // Stop loading
      ////////////////////////////////////////////////////////////////////
      await stopLoading(body);

      ////////////////////////////////////////////////////////////////////
      // Add token usage
      ////////////////////////////////////////////////////////////////////
      await addTokenUsages(body,result.usageMetadata.promptTokenCount,result.usageMetadata.candidatesTokenCount,'phases');

      ////////////////////////////////////////////////////////////////////
      // Update credits
      ////////////////////////////////////////////////////////////////////
      if(!body.training?.trainingId || !body.training?.trainerId){
        await updateCredits(body.userId, creditsCost['phases']);
      }
      else{
        await updateCreditsTraining(body.userEmail,creditsCost['phases'],body.training.trainingId,body.training.trainerId);
      }

      ////////////////////////////////////////////////////////////////////
      // Return response
      ////////////////////////////////////////////////////////////////////
      res.status(200).send('ready');
        
    } catch (error) {
      ////////////////////////////////////////////////////////////////////
      // Error handling
      ////////////////////////////////////////////////////////////////////
      console.error("Error tijdens streaming:", error);
      res.status(500).send("Error tijdens streaming");
    }
  }
);

exports.feedbackGemini = onRequest(
  { cors: config.allowed_cors, region: "europe-west1" , memory: '1GiB', timeoutSeconds: 540},
  async (req: any, res: any) => {
    ////////////////////////////////////////////////////////////////////
    // Set headers
    ////////////////////////////////////////////////////////////////////
    res = setHeaders(res);

    console.log('Start feedback');

    try {
      ////////////////////////////////////////////////////////////////////
      // Check required parameters
      ////////////////////////////////////////////////////////////////////
      const body = req.body;
      if((!body.userId) || (!body.conversationId) || (!body.instructionType) || (!body.role) || (!body.categoryId)){
        console.log("Missing required parameters in request body");
        res.status(400).send("Missing required parameters in request body");
        return;
      }

      ////////////////////////////////////////////////////////////////////
      // Set language
      ////////////////////////////////////////////////////////////////////
      let language = 'nl'
      if(body.language){
        language = body.language;
      }

      ////////////////////////////////////////////////////////////////////
      // Check subscription
      //////////////////////////////////////////////////////////////////
      const hasValidSubscription = await checkUserSubscription(body.userId);
      if (!hasValidSubscription) {
        res.status(403).send("User does not have a valid subscription");
        return;
      }

      ////////////////////////////////////////////////////////////////////
      // Get conversation messages
      ////////////////////////////////////////////////////////////////////
      let messages = await getPreviousMessages(body.userId, body.conversationId);
      if (!messages) {
        messages = [{content:`no ${body.instructionType} found`}];
      }

      let messageText = '';
      for(let i = 1; i < messages.length; i++){
        // console.log('message ' + i + ' role', messages[i].role);
        if(i == messages.length-1 && messages[i].role == 'assistant'){
          //do nothing
        }
        else if(messages[i].role == 'assistant' || messages[i].role == 'modal'){
          messageText = messageText + messages[i].role + ': ' + cleanReactionMessage(messages[i].content) + '\n\n';
        }
        else{
          messageText = messageText + messages[i].role + ': ' + messages[i].content + '\n\n';
        }
      }

      ////////////////////////////////////////////////////////////////////
      // Get category data
      ////////////////////////////////////////////////////////////////////
      // const categoryRef = db.doc(`categories/${body.categoryId}`);
      const categoryRef = db.doc(`categories/${body.categoryId}/languages/${language}`);
      const caseRef = db.doc(`users/${body.userId}/conversations/${body.conversationId}/caseItem/caseItem`);
      const [agent_instructions, categorySnap,formats,caseSnap] = await Promise.all([
        getAgentInstructions(body.instructionType,body.categoryId,language), 
        categoryRef.get(), 
        getFormats(body.instructionType),
        caseRef.get()
      ]);
      if (!categorySnap.exists) {
        throw new Error("Category not found");
      }
      const categoryData = categorySnap.data();
      const caseData = caseSnap.data();

      caseData.extra_knowledge_summary = ''
      if(caseData.extra_knowledge && caseData.trainerId){
        const knowledgeRef = db.collection(`trainers`).doc(caseData.trainerId).collection('knowledge').doc(caseData.extra_knowledge);
        const knowledgeSnap = await knowledgeRef.get();
        if(knowledgeSnap.exists){
          caseData.extra_knowledge_summary = knowledgeSnap.data().summary || '';
        }
      }

      ////////////////////////////////////////////////////////////////////
      // Set system content
      ////////////////////////////////////////////////////////////////////
      let systemContent = setSystemContent(agent_instructions,formats);
      systemContent = systemContent.split("[role]").join(body.role).split("[category]").join(categoryData.title).split("[extra_knowledge]").join(caseData.extra_knowledge_summary);
      systemContent = systemContent.split(`[${body.instructionType}]`).join(JSON.stringify(categoryData[body.instructionType]));
      if(caseData.casus){
        systemContent = systemContent.split("[casus]").join(caseData.casus);
      }
      else{
        systemContent = systemContent.split("[casus]").join('No specific case found');
      }

      ////////////////////////////////////////////////////////////////////
      // Set user content
      ////////////////////////////////////////////////////////////////////
      let content = agent_instructions.content.split("[role]").join(body.role).split("[category]").join(categoryData.title)
      content = content.split(`[messages]`).join(messageText);

      ////////////////////////////////////////////////////////////////////
      // Set messages
      ////////////////////////////////////////////////////////////////////
      let sendMessages:any[] = [
        {role: "system",content: systemContent},
        {role: "user",content: content}
      ]

      ////////////////////////////////////////////////////////////////////
      // Stream Gemini
      ////////////////////////////////////////////////////////////////////
      const result:any = await streamGemini(sendMessages,agent_instructions,false)      
      let completeMessage = result.text();

      ////////////////////////////////////////////////////////////////////
      // Add to conversation in Firebase
      ////////////////////////////////////////////////////////////////////
      await addToConversation(body.userId,body.conversationId,'modal',completeMessage,'feedback',((messages[messages.length-1].role == 'modal' || messages[messages.length-1].role == 'assistant') ? messages.length-2 : messages.length-1));

      ////////////////////////////////////////////////////////////////////
      // Stop loading
      ////////////////////////////////////////////////////////////////////
      await stopLoading(body);

      ////////////////////////////////////////////////////////////////////
      // Add token usage
      ////////////////////////////////////////////////////////////////////
      await addTokenUsages(body,result.usageMetadata.promptTokenCount,result.usageMetadata.candidatesTokenCount,'feedback');

      ////////////////////////////////////////////////////////////////////
      // Update credits
      //////////////////////////////////////////////////////////////////
      if(!body.training?.trainingId || !body.training?.trainerId){
        console.log("Updating credits for user");
        await updateCredits(body.userId, creditsCost['feedback']);
      }
      else{
        console.log("Updating credits for training");
        await updateCreditsTraining(body.userEmail,creditsCost['feedback'],body.training.trainingId,body.training.trainerId);
      }

      ////////////////////////////////////////////////////////////////////
      // Return response
      ////////////////////////////////////////////////////////////////////
      res.status(200).send('ready');
        
    } catch (error) {
      ////////////////////////////////////////////////////////////////////
      // Error handling
      //////////////////////////////////////////////////////////////////
      console.error("Error tijdens streaming:", error);
      res.status(500).send("Error tijdens streaming");
    }
  }
);

exports.closeAnalystGemini = onRequest(
  { cors: config.allowed_cors, region: "europe-west1" , memory: '1GiB', timeoutSeconds: 540},
  async (req: any, res: any) => {
    ////////////////////////////////////////////////////////////////////
    // Set headers
    ////////////////////////////////////////////////////////////////////
    res = setHeaders(res);


    try {
      ////////////////////////////////////////////////////////////////////
      // Check required parameters
      ////////////////////////////////////////////////////////////////////
      const body = req.body;
      if((!body.userId) || (!body.userEmail && !body.caseId) || (!body.trainingId) || (!body.instructionType) || (!body.trainerId)){
        console.log("Missing required parameters in request body");
        res.status(400).send("Missing required parameters in request body");
        return;
      }

      ////////////////////////////////////////////////////////////////////
      // Set language
      ////////////////////////////////////////////////////////////////////
      let language = 'nl'
      if(body.language){
        language = body.language;
      }

      ////////////////////////////////////////////////////////////////////
      // Check subscription
      //////////////////////////////////////////////////////////////////
      const hasValidSubscription = await checkUserSubscription(body.userId);
      if (!hasValidSubscription) {
        res.status(403).send("User does not have a valid subscription");
        return;
      }

      const isAdmin = await checkUserIsAdmin(body.userId, body.trainerId);
      if (!isAdmin) {
        res.status(403).send("User is not an admin");
        return;
      }

      ////////////////////////////////////////////////////////////////////
      // Get close evaluations 
      ////////////////////////////////////////////////////////////////////
      const closeRef = db.collection(`trainers/${body.trainerId}/trainings/${body.trainingId}/close`);
      const closeSnap = await closeRef.get();
      if (closeSnap.empty) {
        throw new Error("Close evaluations not found");
      }

      let closeEvaluations = closeSnap.docs.map(doc => doc.data());
      let relevantEvaluations:any[] = [];
      for(let i = 0; i < closeEvaluations.length; i++){
        if((closeEvaluations[i].user == body.userEmail || closeEvaluations[i].caseId == body.caseId) && !closeEvaluations[i].summary){
          relevantEvaluations.push(closeEvaluations[i]);
        }
      }

      ////////////////////////////////////////////////////////////////////
      // Get instructions data
      ////////////////////////////////////////////////////////////////////
      const [agent_instructions,formats] = await Promise.all([
        getAgentInstructions(body.instructionType,'main',language), 
        getFormats(body.instructionType)
      ]);

      ////////////////////////////////////////////////////////////////////
      // Set system content
      ////////////////////////////////////////////////////////////////////
      let systemContent = setSystemContent(agent_instructions,formats);

      ////////////////////////////////////////////////////////////////////
      // Set user content
      ////////////////////////////////////////////////////////////////////
      let content = agent_instructions.content
      content = content.split(`[evaluations]`).join(JSON.stringify(relevantEvaluations));

      ////////////////////////////////////////////////////////////////////
      // Set messages
      ////////////////////////////////////////////////////////////////////
      let sendMessages:any[] = [
        {role: "system",content: systemContent},
        {role: "user",content: content}
      ]

      ////////////////////////////////////////////////////////////////////
      // Stream Gemini
      ////////////////////////////////////////////////////////////////////
      const result:any = await streamGemini(sendMessages,agent_instructions,false)      
      let completeMessage = result.text();

      ////////////////////////////////////////////////////////////////////
      // Add to training in firestore
      ////////////////////////////////////////////////////////////////////
      await db.collection('trainers').doc(body.trainerId).collection('trainings').doc(body.trainingId).collection('close').add({ 
        summary: completeMessage.split('```json ').join('').split('```').join('').split('json ').join('').split('json').join('').trim(),
        timestamp: new Date().getTime(),
        user: body.userEmail || null,
        caseId: body.caseId || null,
      });

      ////////////////////////////////////////////////////////////////////
      // Update credits
      //////////////////////////////////////////////////////////////////
      await updateCredits(body.userId,creditsCost['close_analyst']);

      ////////////////////////////////////////////////////////////////////
      // Return response
      ////////////////////////////////////////////////////////////////////
      res.status(200).send({ 
        summary: completeMessage.split('```json ').join('').split('```').join('').split('json ').join('').split('json').join('').trim(),
        timestamp: new Date().getTime(),
        user: body.userEmail,
        caseId: body.caseId || null,
      });
        
    } catch (error) {
      ////////////////////////////////////////////////////////////////////
      // Error handling
      //////////////////////////////////////////////////////////////////
      console.error("Error tijdens streaming:", error);
      res.status(500).send("Error tijdens streaming");
    }
  }
);

exports.closingGemini = onRequest(
  { cors: config.allowed_cors, region: "europe-west1" , memory: '1GiB', timeoutSeconds: 540},
  async (req: any, res: any) => {
    ////////////////////////////////////////////////////////////////////
    // Set headers
    ////////////////////////////////////////////////////////////////////
    res = setHeaders(res);

    try {
      ////////////////////////////////////////////////////////////////////
      // Check required parameters
      ////////////////////////////////////////////////////////////////////
      const body = req.body;
      if((!body.userId) || (!body.conversationId) || (!body.instructionType) || (!body.categoryId)){
        console.log("Missing required parameters in request body");
        res.status(400).send("Missing required parameters in request body");
        return;
      }

      ////////////////////////////////////////////////////////////////////
      // Set language
      ////////////////////////////////////////////////////////////////////
      let language = 'nl'
      if(body.language){
        language = body.language;
      }
      
      ////////////////////////////////////////////////////////////////////
      // Check subscription
      //////////////////////////////////////////////////////////////////
      const hasValidSubscription = await checkUserSubscription(body.userId);
      if (!hasValidSubscription) {
        res.status(403).send("User does not have a valid subscription");
        return;
      }

      ////////////////////////////////////////////////////////////////////
      // Get conversation messages
      ////////////////////////////////////////////////////////////////////
      let messages = await getPreviousMessages(body.userId, body.conversationId);
      if (!messages) {
        messages = [{content:`no ${body.instructionType} found`}];
      }
      let messageText = '<pre>' + JSON.stringify(messages) + '</pre>';
      
      ////////////////////////////////////////////////////////////////////
      // Get last phase scores
      ////////////////////////////////////////////////////////////////////
      let phaseMessages = await getPreviousMessages(body.userId, body.conversationId,'phases');
      let lastPhaseScores:any = ''
      if (!phaseMessages) {
        lastPhaseScores = [{content:'No scores currently available'}];
      }
      else{
        lastPhaseScores = phaseMessages[phaseMessages.length-1].content;
        lastPhaseScores = JSON.parse(lastPhaseScores);
        lastPhaseScores = lastPhaseScores.element_levels;
      }
      lastPhaseScores = '<pre>'+JSON.stringify(lastPhaseScores)+'</pre>';

      ////////////////////////////////////////////////////////////////////
      // Get category data
      //////////////////////////////////////////////////////////////////
      const categoryRef = db.doc(`categories/${body.categoryId}/languages/${language}`);
      const conversationRef = db.doc(`users/${body.userId}/conversations/${body.conversationId}`);
      const caseRef = db.doc(`users/${body.userId}/conversations/${body.conversationId}/caseItem/caseItem`);

      const [agent_instructions,categorySnap,formats,conversationSnap,caseSnap] = await Promise.all([
        getAgentInstructions(body.instructionType,body.categoryId,language),
        categoryRef.get(), 
        getFormats(body.instructionType),
        conversationRef.get(),
        caseRef.get()
      ]);
      if (!categorySnap.exists) {
        throw new Error("Category not found");
      }
      if(!conversationSnap.exists){
        throw new Error("Conversation not found");
      }
      const categoryData = categorySnap.data();
      const conversationData = conversationSnap.data();
      const caseData = caseSnap.data();

      caseData.extra_knowledge_summary = ''
      if(caseData.extra_knowledge && caseData.trainerId){
        const knowledgeRef = db.collection(`trainers`).doc(caseData.trainerId).collection('knowledge').doc(caseData.extra_knowledge);
        const knowledgeSnap = await knowledgeRef.get();
        if(knowledgeSnap.exists){
          caseData.extra_knowledge_summary = knowledgeSnap.data().summary || '';
        }
      }
      
      ////////////////////////////////////////////////////////////////////
      // Set system content
      ////////////////////////////////////////////////////////////////////
      let systemContent = setSystemContent(agent_instructions,formats);
      let goals = goalsText(conversationData);
      systemContent = systemContent.split(`[goal]`).join(goals);
      systemContent = systemContent.split(`[phases]`).join("<pre>" + JSON.stringify(categoryData['phaseList']) + "</pre>");
      systemContent = systemContent.split(`[phases_scores]`).join(lastPhaseScores);
      systemContent = systemContent.split(`[extra_knowledge]`).join(caseData.extra_knowledge_summary);

      ////////////////////////////////////////////////////////////////////
      // Set user content
      ////////////////////////////////////////////////////////////////////
      let content = agent_instructions.content.split('[messages').join(messageText);

      ////////////////////////////////////////////////////////////////////
      // Set messages
      ////////////////////////////////////////////////////////////////////
      let sendMessages:any[] = [
        {role: "system",content: systemContent},
        {role: "user",content: content}
      ]

      ////////////////////////////////////////////////////////////////////
      // Stream Gemini
      ////////////////////////////////////////////////////////////////////
      const result:any = await streamGemini(sendMessages,agent_instructions,false)
      const completeMessage = result.text();

      ////////////////////////////////////////////////////////////////////
      // Add to conversation in Firebase
      ////////////////////////////////////////////////////////////////////
      await addToConversation(body.userId,body.conversationId,'assistant',completeMessage,'close');

      ////////////////////////////////////////////////////////////////////
      // Close conversation
      ////////////////////////////////////////////////////////////////////
      let closeRef:any = db.doc(`users/${body.userId}/conversations/${body.conversationId}`);
      await closeRef.update({
        closed: new Date().getTime(),
      })

      ////////////////////////////////////////////////////////////////////
      // Stop loading
      ////////////////////////////////////////////////////////////////////
      await stopLoading(body);

      ////////////////////////////////////////////////////////////////////
      // Add token usage
      ////////////////////////////////////////////////////////////////////
      await addTokenUsages(body,result.usageMetadata.promptTokenCount,result.usageMetadata.candidatesTokenCount,'closing');

      ////////////////////////////////////////////////////////////////////
      // Update credits
      //////////////////////////////////////////////////////////////////
      if(!body.training?.trainingId || !body.training?.trainerId){
        await updateCredits(body.userId, creditsCost['closing']);
      }
      else{
        await db.collection('trainers').doc(body.training.trainerId).collection('trainings').doc(body.training.trainingId).collection('close').add({ 
          content: completeMessage,
          timestamp: new Date().getTime(),
          user: body.userEmail,
          caseId: conversationData.caseId || conversationData.id || body.conversationId,
        });

        await updateCreditsTraining(body.userEmail,creditsCost['closing'],body.training.trainingId,body.training.trainerId);
      }

      ////////////////////////////////////////////////////////////////////
      // Return response
      ////////////////////////////////////////////////////////////////////
      res.status(200).send('ready');
        
    } catch (error) {
      ////////////////////////////////////////////////////////////////////
      // Error handling
      //////////////////////////////////////////////////////////////////
      console.error("Error tijdens streaming:", error);
      res.status(500).send("Error tijdens streaming");
    }
  }
);

exports.skillsGemini = onRequest(
  { cors: config.allowed_cors, region: "europe-west1" , memory: '1GiB', timeoutSeconds: 540},
  async (req: any, res: any) => {
    ////////////////////////////////////////////////////////////////////
    // Set headers
    ////////////////////////////////////////////////////////////////////
    res = setHeaders(res);

    try {
      ////////////////////////////////////////////////////////////////////
      // Check required parameters
      ////////////////////////////////////////////////////////////////////
      const body = req.body;
      if((!body.userId) || (!body.conversationId) || (!body.instructionType) || (!body.categoryId)){
        console.log("Missing required parameters in request body");
        res.status(400).send("Missing required parameters in request body");
        return;
      }

      ////////////////////////////////////////////////////////////////////
      // Set language
      ////////////////////////////////////////////////////////////////////
      let language = 'nl'
      if(body.language){
        language = body.language;
      }
      console.log('language', language);
      ////////////////////////////////////////////////////////////////////
      // Check subscription
      //////////////////////////////////////////////////////////////////
      const hasValidSubscription = await checkUserSubscription(body.userId);
      if (!hasValidSubscription) {
        res.status(403).send("User does not have a valid subscription");
        return;
      }

      ////////////////////////////////////////////////////////////////////
      // Get conversation messages
      ////////////////////////////////////////////////////////////////////
      let messages = await getPreviousMessages(body.userId, body.conversationId);
      if (!messages) {
        messages = [{content:`no ${body.instructionType} found`}];
      }
      let messageText = '<pre>' + JSON.stringify(messages) + '</pre>';
      
      ////////////////////////////////////////////////////////////////////
      // Get last phase scores
      ////////////////////////////////////////////////////////////////////
      let phaseMessages = await getPreviousMessages(body.userId, body.conversationId,'phases');
      let lastPhaseScores:any = ''
      if (!phaseMessages) {
        lastPhaseScores = [{content:'No scores currently available'}];
      }
      else{
        lastPhaseScores = phaseMessages[phaseMessages.length-1].content;
        lastPhaseScores = JSON.parse(lastPhaseScores);
        lastPhaseScores = lastPhaseScores.element_levels;
      }
      lastPhaseScores = '<pre>'+JSON.stringify(lastPhaseScores)+'</pre>';

      ////////////////////////////////////////////////////////////////////
      // Get category data
      //////////////////////////////////////////////////////////////////
      const categoryRef = db.doc(`categories/${body.categoryId}/languages/${language}`);
      const conversationRef = db.doc(`users/${body.userId}/conversations/${body.conversationId}`);

      const [agent_instructions,categorySnap,formats,conversationSnap] = await Promise.all([
        getAgentInstructions(body.instructionType,body.categoryId,language),
        categoryRef.get(), 
        getFormats(body.instructionType),
        conversationRef.get()
      ]);
      if (!categorySnap.exists) {
        throw new Error("Category not found");
      }
      if(!conversationSnap.exists){
        throw new Error("Conversation not found");
      }
      const categoryData = categorySnap.data();
      const conversationData = conversationSnap.data();

      ////////////////////////////////////////////////////////////////////
      // Set system content
      ////////////////////////////////////////////////////////////////////
      let systemContent = setSystemContent(agent_instructions,formats);
      let goals = goalsText(conversationData,true);
      systemContent = systemContent.split(`[goal]`).join(goals);
      systemContent = systemContent.split(`[phases]`).join("<pre>" + JSON.stringify(categoryData['phaseList']) + "</pre>");
      systemContent = systemContent.split(`[phases_scores]`).join(lastPhaseScores);

      ////////////////////////////////////////////////////////////////////
      // Set user content
      ////////////////////////////////////////////////////////////////////
      let content = agent_instructions.content.split('[messages').join(messageText);
      content = content.split(`[goal]`).join(goals);

      ////////////////////////////////////////////////////////////////////
      // Set messages
      ////////////////////////////////////////////////////////////////////
      let sendMessages:any[] = [
        {role: "system",content: systemContent},
        {role: "user",content: content}
      ]

      ////////////////////////////////////////////////////////////////////
      // Stream Gemini
      ////////////////////////////////////////////////////////////////////
      const result:any = await streamGemini(sendMessages,agent_instructions,false)
      const completeMessage = result.text();

      ////////////////////////////////////////////////////////////////////
      // Add to conversation in Firebase
      ////////////////////////////////////////////////////////////////////
      await addToConversation(body.userId,body.conversationId,'assistant',completeMessage,'skills');

      ////////////////////////////////////////////////////////////////////
      // Stop loading
      ////////////////////////////////////////////////////////////////////
      await stopLoading(body);

      ////////////////////////////////////////////////////////////////////
      // Add token usage
      ////////////////////////////////////////////////////////////////////
      await addTokenUsages(body,result.usageMetadata.promptTokenCount,result.usageMetadata.candidatesTokenCount,'skills');

      ////////////////////////////////////////////////////////////////////
      // Update credits
      //////////////////////////////////////////////////////////////////
      if(!body.training?.trainingId || !body.training?.trainerId){
        await updateCredits(body.userId, creditsCost['skills']);
      }
      else{
        await updateCreditsTraining(body.userEmail,creditsCost['skills'],body.training.trainingId,body.training.trainerId);
      }

      ////////////////////////////////////////////////////////////////////
      // Return response
      ////////////////////////////////////////////////////////////////////
      res.status(200).send('ready');
        
    } catch (error) {
      ////////////////////////////////////////////////////////////////////
      // Error handling
      //////////////////////////////////////////////////////////////////
      console.error("Error tijdens streaming:", error);
      res.status(500).send("Error tijdens streaming");
    }
  }
);

exports.soundToTextGemini = onRequest(
  { cors: config.allowed_cors, region: "europe-west1", maxRequestSize: '40mb', memory: '1GiB', timeoutSeconds: 120 },

  async (req:any, res:any) => {
    try {
        // console.log("📌 Request ontvangen");
      const body = req.body;

      // ✅ Controleer verplichte parameters
      if (!body.userId || !body.conversationId || !body.file) {
        res.status(400).send("❌ Missing required parameters in request body");
        return;
      }

      // ✅ Decodeer Base64 audio naar bestand
      const inputBuffer = Buffer.from(body.file, "base64");
      const inputFilePath = path.join("/tmp", `audio-${Date.now()}`);
      fs.writeFileSync(inputFilePath, inputBuffer);

      // console.log("🎵 Bestand opgeslagen:", inputFilePath);

      // ✅ Detecteer MIME-type
      const detectedType = await fileType.fromFile(inputFilePath);
      const mimeType = detectedType ? detectedType.mime : "audio/wav"; // Default naar WAV indien onbekend
      
      console.log(`📌 Gedetecteerd MIME-type: ${mimeType}`);

      // ✅ Bepaal bestandsgrootte voor kostenberekening
      const stats = fs.statSync(inputFilePath);
      const fileSizeInBytes = stats.size;
      const soundLength = fileSizeInBytes / 16000;
      const creditsCosts = Math.ceil(soundLength / 30);
      // console.log(`🔹 Audio lengte: ${soundLength} sec | Kosten: ${creditsCosts} credits`);

      // ✅ Verwerk audio met Vertex AI Speech-to-Text (direct, zonder conversie)
      // const audioBytes = fs.readFileSync(inputFilePath).toString("base64");
      // const request = {
      //   contents: [
      //       { 
      //           role: "user",
      //           parts: [
      //               { text: "Can you convert this sound to text?" },
      //               { 
      //                   file_data: { 
      //                       mime_type: mimeType, 
      //                       file_uri: audioBytes 
      //                   }
      //               }
      //           ]
      //       }
      //   ],
      // };
      const base64Audio = fs.readFileSync(inputFilePath).toString("base64");

      // ✅ Genereer transcriptie via Gemini
      const result = await modelVertex.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { text: "Transcribe the following audio into the spoken language." },
              {
                inlineData: {
                  mimeType: 'audio/mp4',// mimeType,
                  data: base64Audio,
                },
              },
            ],
          },
        ],
      });

      // console.log('result - candidates', result.response.candidates.parts);
      // console.log("📡 Verstuur audio naar Vertex AI...");
      // const [response] = await modelVertex.generateContent(request);
      const transcription = result.response.candidates[0]?.content?.parts[0]?.text || "❌ Geen transcriptie ontvangen";

      // console.log("✅ Transcriptie ontvangen:", transcription);
      fs.unlinkSync(inputFilePath); // Opruimen bestand na verwerking

      let usage = result.response.usageMetadata


      // ✅ Tokens opslaan in Firestore
      const tokensRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/tokens`);
      await tokensRef.add({
        agent: 'soundToTextAI',
        usage: { seconds: soundLength,
          usage:usage,
         },
        credits: creditsCosts,
        timestamp: new Date().getTime(),
      });


      // ✅ Credits bijwerken
      if(!body.training?.trainingId || !body.training?.trainerId){
        await updateCredits(body.userId, creditsCosts);
      }
      else{
        await updateCreditsTraining(body.userEmail,creditsCost,body.training.trainingId,body.training.trainerId);
      }

      // ✅ Stuur transcriptie terug
      res.status(200).json({ transcription });


    } catch (error) {
      ////////////////////////////////////////////////////////////////////
      // 📌 Foutafhandeling
      ////////////////////////////////////////////////////////////////////
      console.error("Error processing request:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

exports.case_prompt_gemini = onRequest(
  { cors: config.allowed_cors, region: "europe-west1" , memory: '1GiB', timeoutSeconds: 540},
  async (req: any, res: any) => {
    setHeaders(res);

    try {
    ////////////////////////////////////////////////////////////////////
      // Check required parameters
      ////////////////////////////////////////////////////////////////////
      const body = req.body;
      if((!body.userId) || (!body.instructionType) || (!body.content) || (!body.categoryId)){
        console.log("Missing required parameters in request body");
        res.status(400).send("Missing required parameters in request body");
        return;
      }

      ////////////////////////////////////////////////////////////////////
      // Check subscription
      //////////////////////////////////////////////////////////////////
      const hasValidSubscription = await checkUserSubscription(body.userId);
      if (!hasValidSubscription) {
        res.status(403).send("User does not have a valid subscription");
        return;
      }

      ////////////////////////////////////////////////////////////////////
      // Get category data
      ////////////////////////////////////////////////////////////////////
      const categoryRef = db.doc(`categories/${body.categoryId}`);

      const [agent_instructions,categorySnap,formats] = await Promise.all([
        getAgentInstructions(body.instructionType,body.categoryId),
        categoryRef.get(), 
        getFormats(body.instructionType)
      ]);

      if (!categorySnap.exists) {
        throw new Error("Category not found");
      }
      const categoryData = categorySnap.data();

      ////////////////////////////////////////////////////////////////////
      // Set system content
      ////////////////////////////////////////////////////////////////////
      let systemContent = agent_instructions.systemContent.split("[category]").join(categoryData.title);

      ////////////////////////////////////////////////////////////////////
      // Set user content
      ////////////////////////////////////////////////////////////////////
      let content = agent_instructions.content.split("[case_data]").join(body.content)
      content = content + '\n\n' + formats.format + '\n\n' + formats.instructions;

      ////////////////////////////////////////////////////////////////////
      // Set messages
      ////////////////////////////////////////////////////////////////////
      let sendMessages:any[] = [
        { role: "system", content: systemContent },
        { role: "user", content: content },
      ]

      ////////////////////////////////////////////////////////////////////
      // Stream Gemini
      ////////////////////////////////////////////////////////////////////
      const result:any = await streamGemini(sendMessages,agent_instructions,false)
      let completeMessage = result.text();

      ////////////////////////////////////////////////////////////////////
      // set case Metadata in Firebase
      ////////////////////////////////////////////////////////////////////
      let messageRef = db.collection(`users/${body.userId}/case_creations`);
      
      await messageRef.add({
        agent: body.instructionType,
        usage: {
            prompt_tokens: result.usageMetadata.promptTokenCount,
            candidates_tokens: result.usageMetadata.candidatesTokenCount,
            total_tokens: result.usageMetadata.promptTokenCount + result.usageMetadata.candidatesTokenCount,
        },
        timestamp: new Date().getTime(),
        credits: creditsCost['case_prompt'],
      })
      
      await updateCredits(body.userId, creditsCost['case_prompt']); 
      
      res.status(200).send({content:completeMessage});

        
    } catch (error) {
      console.error("Error tijdens streaming:", error);
      res.status(500).send("Error tijdens streaming");
    }
  }
);

exports.textToSpeechAngryStudio = onRequest(
  {
    cors: true,
    region: "europe-west1",
    timeoutSeconds: 60,
  },
  async (req:any, res:any) => {
    try {
      const body = req.body;

      if (!body.text) {
        res.status(400).send("❌ 'text' parameter is required");
        return;
      }

      // const ssml = `
      //   <speak>
      //     <prosody pitch="-4%" rate="fast">
      //       <emphasis level="strong">${body.text}</emphasis>
      //     </prosody>
      //   </speak>
      // `;

      const request = {
        input: { text:body.text },
        voice: {
          languageCode: "nl-NL",
          name: "nl-NL-Chirp3-HD-Leda", // 👈 Studio voice (gebruik "en-US-Studio-O" als fallback)
        },
        audioConfig: {
          audioEncoding: "MP3",
          effectsProfileId: ["telephony-class-application"], // optioneel
        },
      };

      const [response] = await ttsClient.synthesizeSpeech(request);

      res.status(200).json({
        audio: response.audioContent.toString("base64"),
        format: "mp3",
      });
    } catch (error) {
      console.error("❌ Error during Studio TTS:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

// import { HumeClient } from "hume"

// const hume = new HumeClient({ apiKey: config.hume_api_key });


exports.textToSpeechWithEmotion = onRequest({
  cors: true,
  region: "europe-west1",
  timeoutSeconds: 60,
},
async (req:any, res:any) => {
  try {
    const { text, emotion, language, model } = req.body;

    if (!text || !emotion) {
      return res.status(400).json({ error: 'Missing text or emotion parameter.' });
    }

    console.log(`Received text: ${text}, emotion: ${emotion}, language: ${language}`);

    let input:any = {
      text: text,
      model_id: model ||  "eleven_multilingual_v2",
      previous_text:emotion,
      output_format: "mp3_44100_128",
    } 
    if(model != 'eleven_multilingual_v2'){
      input.language = language || 'nl-NL';
    }
    let voiceId = req.body.voiceId;
    if(!voiceId){
      voiceId = 'JBFqnCBsd6RMkjVDRZzb';
    }
    const base64Audio = await eleven.textToSpeech.convert(voiceId, input );

      if (!base64Audio) {
        res.status(500).json({ error: "No audio generated by Hume" });
        return;
      }
      const audioBuffer = await buffer(base64Audio as Readable);
      res.set("Content-Type", "audio/mpeg"); 
      res.send(audioBuffer); 

  } catch (error) {
    console.error('Error generating speech:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


exports.testEmbeddings = onRequest({
  cors: true,
  region: "europe-west1",
  timeoutSeconds: 540,
  memory: '1GiB',
},
async (req:any, res:any) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Missing text parameter.' });
    }

    console.log(`Received text: ${text}`);

    const result = await embeddingModel.doEmbed({
      values: [text]
    });

    await db.collection('test_embeddings').add({
      text: text,
      embeddings: FieldValue.vector(result.embeddings[0]),
      timestamp: new Date().getTime(),
    });

    res.status(200).json({ embeddings: result.embeddings[0] });


  } catch (error) {
    console.error('Error generating vector embedding:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


exports.testSearchVectors = onCall(
  {
    region: 'europe-west1',
    memory: '1GiB',
  },
  async (request: CallableRequest<any>,) => {
    const { auth,data } = request;

    if( !auth.uid ) {
      return new responder.Message('Unauthorized', 401);
    }

    if(!data || !data.query) {
      return new responder.Message('Missing required parameters', 400);
    }
    try {

      const search = await embeddingModel.doEmbed({
      values: [data.query]
    });

      const collection = data.collection || 'test_embeddings';

      const vectorQuery = clientDb
        .collection(collection)
        .findNearest({vectorField:"embeddings", queryVector:search.embeddings[0],limit: 5, distanceMeasure: 'COSINE', distanceResultField: 'distance'});
      const result = await vectorQuery.get();
      if (result.empty) {
        return new responder.Message('No results found', 404);
      }
      // Format the results
      const formattedResults = result.docs.map((doc:any) => ({
        id: doc.id,
        data: doc.data(),
      }));

      // console.log('Search results:', formattedResults);

      return new responder.Message(formattedResults, 200);
    } catch (error) {
      console.error('Error during vector search:', error);
      return new responder.Message('Internal Server Error', 500);
    }
    
    
  })

// exports.goalGemini = onRequest(
//   { cors: config.allowed_cors, region: "europe-west1" },
//   async (req: any, res: any) => {
//     res.setHeader("Content-Type", "text/event-stream");
//     res.setHeader("Cache-Control", "no-cache");
//     res.setHeader("Connection", "keep-alive");


//     try {
//       const body = req.body;
//       if((!body.userId) || (!body.conversationId) || (!body.instructionType) || (!body.categoryId)){
//         console.log("Missing required parameters in request body");
//         res.status(400).send("Missing required parameters in request body");
//         return;
//       }

//       // 1. Controleer abonnement
//       const hasValidSubscription = await checkUserSubscription(body.userId);
//       if (!hasValidSubscription) {
//         res.status(403).send("User does not have a valid subscription");
//         return;
//       }

//       // 2. Haal eerdere berichten op (indien aanwezig)
//       let messages = []
//       messages = await getPreviousMessages(body.userId, body.conversationId);
//       if (!messages) {
//         messages = [{content:`no ${body.instructionType} found`}];
//       }

//       let messageText = JSON.stringify(messages);
      

//       const categoryRef = db.doc(`categories/${body.categoryId}`);
//       const conversationRef = db.doc(`users/${body.userId}/conversations/${body.conversationId}`);

//       const [agent_instructions,categorySnap,formats,conversationSnap] = await Promise.all([
//         getAgentInstructions(body.instructionType,body.categoryId),
//         categoryRef.get(), 
//         getFormats(body.instructionType),
//         conversationRef.get()
//       ]);

//       if (!categorySnap.exists) {
//         throw new Error("Category not found");
//       }
//       if(!conversationSnap.exists){
//         throw new Error("Conversation not found");
//       }

//       const categoryData = categorySnap.data();
//       const conversationData = conversationSnap.data();


//       let systemContent = agent_instructions.systemContent
//       systemContent = systemContent.split(`[phases]`).join(JSON.stringify(categoryData['phaseList']));
//       systemContent = systemContent + '\n\n' + formats.format + '\n\n' + formats.instructions;

//       let messageRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/${body.instructionType}`);

//       let sendMessages:any[] = []

//       sendMessages.push({
//         role: "system",
//         content: systemContent,
//       })

//       sendMessages.push({
//         role: "user",
//         content: agent_instructions.content.split('[messages').join(messageText).split('[goals]').join(conversationData.goalsItems.free),
//       })

//       const completion = await openai.chat.completions.create({
//         model: openAiModal,
//         messages: sendMessages,
//         temperature: agent_instructions.temperature,
//         max_tokens: agent_instructions.max_tokens,
//       });

//       const completeMessage = completion.choices[0].message.content;

//       await messageRef.add({
//         role: "assistant",
//         content: completeMessage.split('```json').join('').split('```').join(''),
//         timestamp: new Date().getTime(),
//       });

//       messageRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/loading`);

//       await messageRef.doc(body.instructionType).set({
//         loading: false,
//       })

//       let tokensRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/tokens`);
//       await tokensRef.add({
//         agent: body.instructionType,
//         usage: completion.usage,
//         timestamp: new Date().getTime(),
//         credits: creditsCost['goal'],
//       });

//       await updateCredits(body.userId, creditsCost['goal']);

//       // 7. Retourneer het complete antwoord
//       res.status(200).send('ready');
//       //res.write(payload);
        
//     } catch (error) {
//       console.error("Error tijdens streaming:", error);
//       res.status(500).send("Error tijdens streaming");
//     }
//   }
// );

exports.chatGeminiVoiceStream = onRequest(
  { cors: true, region: "europe-west1", memory: "2GiB", timeoutSeconds: 540 },
  async (req:any, res:any) => {
    res = setHeaders(res);
    try {
      const body = req.body;
      const requiredFields = ["userId", "conversationId", "categoryId", "caseId", "instructionType", "attitude"];
      if (requiredFields.some(field => !body[field]) || (!body.prompt && !body.conversationId)) {
        res.status(400).send("Missing required parameters in request body");
        return;
      }

      const hasValidSubscription = await checkUserSubscription(body.userId);
      if (!hasValidSubscription) {
        res.status(403).send("User does not have a valid subscription");
        return;
      }

      // Haal conversatie op
      let messages = await getPreviousMessages(body.userId, body.conversationId);
      if (!messages) {
        messages = await initializeConversation(body);
      } else {
        await setToConversation(body.userId, body.conversationId, "user", body.prompt, "messages", messages.length + "");
        messages.push({ role: "user", content: body.prompt });
      }

      const language = body.language || "nl";

      // Haal instructies op
      const agent_instructions = await getAgentInstructions(body.instructionType, body.categoryId, language);

      // Zet audio headers
      res.setHeader("Content-Type", "audio/mpeg");
      // res.setHeader("Content-Type", "audio/wav");

      // Stream Gemini output
      const result = await streamingGemini(messages, agent_instructions, true);
      let completeMessage = "";
      let promptTokens: any = {};

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        completeMessage += chunkText;
        promptTokens = chunk.usageMetadata;

        // Zet om naar audio
        const [ttsResponse] = await ttsClient.synthesizeSpeech({
          input: { text: chunkText },
          voice: { languageCode: "nl-NL", ssmlGender: "NEUTRAL" },
          audioConfig: { audioEncoding: "MP3" },
          
          // audioConfig: {
          //   audioEncoding: "LINEAR16",
          //   sampleRateHertz: 24000
          // }
        });

        if (ttsResponse.audioContent) {
          console.log(`Sending chunk of size: ${ttsResponse.audioContent.length} bytes`);
          res.write(ttsResponse.audioContent);
        } else {
          console.warn("TTS response had no audio content for chunk:", chunkText);
        }

        // if (ttsResponse.audioContent) {
        //   res.write(ttsResponse.audioContent);
        // }
      }

      res.end();

      // Sla reactie op
      await setToConversation(body.userId, body.conversationId, "assistant", completeMessage, "messages", (messages.length + 1) + "");

      await stopLoading(body);

      await addTokenUsages(body, promptTokens.promptTokenCount, promptTokens.candidatesTokenCount, "reaction");

      if(!body.training?.trainingId || !body.training?.trainerId){
        await updateCredits(body.userId, 1); // creditsCost['reaction']
      } else {
        await updateCreditsTraining(body.userEmail, 1, body.training.trainingId, body.training.trainerId);
      }

    } catch (err) {
      console.error("Error tijdens streaming voice:", err);
      res.status(500).send("Error tijdens streaming voice");
    }
  }
);

// Importeer hier eventuele benodigde modules die je al hebt
// bijv. admin, functions, etc.
// const { onRequest } = require('firebase-functions/v2/https');
// const { setHeaders, checkUserSubscription, getPreviousMessages, initializeConversation, setToConversation, getAgentInstructions, streamingGemini, stopLoading, addTokenUsages, updateCredits, updateCreditsTraining } = require('./utils'); // Voorbeeld van je utility functies

// Zorg ervoor dat je ELEVENLABS_API_KEY is ingesteld als een omgevingsvariabele in Firebase Functions
// bijv. firebase functions:config:set elevenlabs.api_key="JOUW_API_KEY_HIER"
// of direct in je environment als je lokaal test
const ELEVENLABS_API_KEY = config.elevenlabs_api_key //process.env.ELEVENLABS_API_KEY;

exports.chatGeminiVoiceElevenlabsStream = onRequest(
  { cors: true, region: "europe-west1", memory: "2GiB", timeoutSeconds: 540 },
  async (req:any, res:any) => {
    // Stel CORS headers in (ervan uitgaande dat setHeaders dit correct doet)
    res = setHeaders(res);

    try {
      const body = req.body;
      const requiredFields = ["userId", "conversationId", "categoryId", "caseId", "instructionType", "attitude"];

      if (requiredFields.some(field => !body[field]) || (!body.prompt && !body.conversationId)) {
        res.status(400).send("Missing required parameters in request body");
        return;
      }

      const hasValidSubscription = await checkUserSubscription(body.userId);
      if (!hasValidSubscription) {
        res.status(403).send("User does not have a valid subscription");
        return;
      }

      // Haal conversatie op en update deze
      let messages = await getPreviousMessages(body.userId, body.conversationId);
      if (!messages) {
        messages = await initializeConversation(body);
      } else {
        await setToConversation(body.userId, body.conversationId, "user", body.prompt, "messages", messages.length + "");
        messages.push({ role: "user", content: body.prompt });
      }

      const language = body.language || "nl";
      // Bepaal de Eleven Labs voiceId en modelId. Pas deze aan naar jouw voorkeur.
      // Voorbeeld NL voice, pas dit aan naar een geschikte Nederlandse stem.
      const elevenLabsVoiceId = body.voiceId || 'piiJv4CqWw2m6bWv402O'; // Bijv. "Nicole" NL voice
      const elevenLabsModelId = body.modelId || 'eleven_multilingual_v2';

      // Haal instructies op
      const agent_instructions = await getAgentInstructions(body.instructionType, body.categoryId, language);

      // Zet audio headers voor MP3 (standaard voor Eleven Labs streaming)
      res.setHeader("Content-Type", "audio/mpeg");
      // res.setHeader("Content-Type", "audio/ogg");

      // Start streaming Gemini output
      const geminiResult = await streamingGemini(messages, agent_instructions, true);
      let completeMessage = "";
      let promptTokens: any = {};

      // Buffer voor tekstchunks van Gemini
      let textBuffer: string[] = [];
      let bufferTimeout: NodeJS.Timeout | null = null;
      let isProcessingBuffer = false; // Voorkom dat de buffer meerdere keren tegelijk wordt verwerkt

      // Functie om de gebufferde tekst naar Eleven Labs te sturen en de audio door te sturen
      const processTextBuffer = async (force: boolean = false) => {
        if (isProcessingBuffer && !force) return; // Voorkom dubbele calls tenzij geforceerd
        if (textBuffer.length === 0 && !force) return;

        // Combineer de gebufferde tekst en reset de buffer
        const textToSend = textBuffer.join(' ').trim();
        textBuffer = [];
        if (textToSend === '') return;

        isProcessingBuffer = true; // Markeer dat de verwerking is gestart
        console.log(`Sending text chunk to Eleven Labs: "${textToSend}"`);

        try {
          // Roep de Eleven Labs streaming API aan via fetch
          const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}/stream`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'xi-api-key': ELEVENLABS_API_KEY!, // API-sleutel is vereist
                  'Accept': 'audio/mpeg', // Specificeer accept-header voor audio
              },
              body: JSON.stringify({
                  text: textToSend.split("  ").join(" "), // Verwijder extra spaties
                  model_id: elevenLabsModelId,
                  voice_settings: {
                    stability: 0.75, // Experimenteer hiermee
                    similarity_boost: 0.75, // Experimenteer hiermee
                  },
                  output_format: "mp3_44100_128", // MP3-formaat met 44.1kHz sample rate en 128kbps bitrate
              }),
          });

          if (!elevenLabsResponse.ok || !elevenLabsResponse.body) {
            console.error(`Eleven Labs streaming API call failed: ${elevenLabsResponse.status} ${elevenLabsResponse.statusText}`);
            // Overweeg hier een foutmelding naar de client te sturen of de stream te beëindigen
            return;
          }

          // Lees de stream van Eleven Labs en stuur deze direct door naar de client
          const reader = elevenLabsResponse.body.getReader();
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              res.write(value); // Stuur de audio chunk direct door
            }
          }

        } catch (elevenLabsErr) {
          console.error("Error calling Eleven Labs streaming API:", elevenLabsErr);
        } finally {
          isProcessingBuffer = false; // Verwerking voltooid
        }
      };


      // Lees chunks van Gemini en buffer ze
      for await (const chunk of geminiResult.stream) {
        const chunkText = chunk.text();
        completeMessage += chunkText;
        promptTokens = chunk.usageMetadata;

        // textBuffer.push(chunkText);

        // // Als de buffer al lang genoeg is, verwerk meteen (voor natuurlijke spraakflow)
        // if (textBuffer.join(" ").length >= 250) {
        //   if (bufferTimeout) clearTimeout(bufferTimeout); // reset timer
        //   await processTextBuffer(); // directe verwerking
        // } else {
        //   // anders: wacht een korte pauze af voor mogelijk langere zin
        //   if (bufferTimeout) clearTimeout(bufferTimeout);
        //   bufferTimeout = setTimeout(() => processTextBuffer(), 300); 
        // }


        textBuffer.push(chunkText);

        // Reset of start de timer om de buffer te verwerken
        // Dit is een heuristische aanpak: stuur de buffer na een korte pauze of bij elke nieuwe chunk
        if (bufferTimeout) {
            clearTimeout(bufferTimeout);
        }
        // Dit zorgt ervoor dat we wachten tot Gemini een korte pauze heeft (200ms)
        // of dat de stream eindigt, om een grotere, coherentere tekst naar Eleven Labs te sturen.
        bufferTimeout = setTimeout(() => processTextBuffer(), 200);
      }

      // Zorg ervoor dat de laatste gebufferde tekst wordt verwerkt nadat de Gemini stream is voltooid
      if (bufferTimeout) {
        clearTimeout(bufferTimeout);
      }
      await processTextBuffer(true); // Forceer de laatste verwerking

      // Beëindig de HTTP-respons
      res.end();

      // Opslaan van reactie en credits (dit blijft hetzelfde)
      await setToConversation(body.userId, body.conversationId, "assistant", completeMessage, "messages", (messages.length + 1) + "");
      await stopLoading(body);
      await addTokenUsages(body, promptTokens.promptTokenCount, promptTokens.candidatesTokenCount, "reaction");

      if(!body.training?.trainingId || !body.training?.trainerId){
        await updateCredits(body.userId, 1);
      } else {
        await updateCreditsTraining(body.userEmail, 1, body.training.trainingId, body.training.trainerId);
      }

    } catch (err) {
      console.error("Error tijdens streaming voice:", err);
      res.status(500).send("Error tijdens streaming voice");
    }
  }
);


exports.chatGeminiVoiceElevenlabsStream2 = onRequest(
  { cors: true, region: "europe-west1", memory: "2GiB", timeoutSeconds: 540 },
  async (req:any, res:any) => {
    res = setHeaders(res); // Stel CORS headers in

    console.log("Debug: ELEVENLABS_API_KEY status:", ELEVENLABS_API_KEY ? "Set" : "Not set", "Length:", ELEVENLABS_API_KEY?.length);
    if (!ELEVENLABS_API_KEY) {
      console.error("ELEVENLABS_API_KEY is not set!");
      res.status(500).send("Server configuration error: Eleven Labs API key missing.");
      return;
  }

    try {
      const body = req.body;
      const requiredFields = ["userId", "conversationId", "categoryId", "caseId", "instructionType", "attitude"];

      if (requiredFields.some(field => !body[field]) || (!body.prompt && !body.conversationId)) {
        res.status(400).send("Missing required parameters in request body");
        return;
      }

      const hasValidSubscription = await checkUserSubscription(body.userId);
      if (!hasValidSubscription) {
        res.status(403).send("User does not have a valid subscription");
        return;
      }

      let messages = await getPreviousMessages(body.userId, body.conversationId);
      if (!messages) {
        messages = await initializeConversation(body);
      } else {
        await setToConversation(body.userId, body.conversationId, "user", body.prompt, "messages", messages.length + "");
        messages.push({ role: "user", content: body.prompt });
      }

      const language = body.language || "nl";
      const elevenLabsVoiceId = body.voiceId || 'piiJv4CqWw2m6bWv402O';
      const elevenLabsModelId = body.modelId || 'eleven_multilingual_v2';
      
      let agent_instructions = await getAgentInstructions(body.instructionType, body.categoryId, language);
      agent_instructions.systemContent = agent_instructions.systemContent + `\n\n<b>Belangrijke Extra aanwijzing</b>:Zorg dat je zinnen goed klinken in spraak: gebruik natuurlijke intonatie, spreektaal, korte zinnen, duidelijke pauzes en vermijd afkortingen of complex samengestelde bijzinnen. Formuleer je reacties zo dat ze prettig klinken wanneer ze worden voorgelezen door een text-to-speech stem van ElevenLabs versie 2.`; 

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Transfer-Encoding", "chunked");

      const geminiResult = await streamingGemini(messages, agent_instructions, true);
      let completeGeminiMessage = "";
      let promptTokens: any = {};

      for await (const chunk of geminiResult.stream) {
        const chunkText = chunk.text();
        completeGeminiMessage += chunkText;
        promptTokens = chunk.usageMetadata || promptTokens;
      }
      console.log(`Complete Gemini message received: "${completeGeminiMessage}"`);

      await setToConversation(body.userId, body.conversationId, "assistant", completeGeminiMessage, "messages", (messages.length + 1) + "");
      await stopLoading(body);

      // --- NIEUWE LOGICA: PARSE HIER DE TEKST VOOR ELEVEN LABS ---
      let textForElevenLabs = completeGeminiMessage;
      const reactionPrefix = "reaction:";
      const reactionIndex = completeGeminiMessage.indexOf(reactionPrefix);

      if (reactionIndex !== -1) {
        // Extraheer de tekst na "reaction:"
        textForElevenLabs = completeGeminiMessage.substring(reactionIndex + reactionPrefix.length).trim();
      } else {
        // Log een waarschuwing als de verwachte prefix niet gevonden is
        console.warn(`'${reactionPrefix}' not found in Gemini response. Sending full message to Eleven Labs.`);
      }

      console.log(`Text sent to Eleven Labs: "${textForElevenLabs}"`);
      const emotionText:any = emotions(completeGeminiMessage);
      console.log(`Detected emotion: ${JSON.stringify(emotionText)}`);

      try {
        const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY!,
            'Accept': 'audio/mpeg',
          },
          body: JSON.stringify({
            text: textForElevenLabs,
            model_id: elevenLabsModelId,
            voice_settings: {
              stability: emotionText.stability,
              similarity_boost: 0.6,
              style: emotionText.style || 0.5, // Gebruik de emotie uit de response
              use_speaker_boost: true,
            },
            previous_text: emotionText.previous || "", // Voeg hier de emotie toe als vorige tekst
            next_text: emotionText.next || "he said neutral",
            output_format: "mp3_44100_128",
          }),
        });

        if (!elevenLabsResponse.ok || !elevenLabsResponse.body) {
          console.error(`Eleven Labs streaming API call failed: ${elevenLabsResponse.status} ${elevenLabsResponse.statusText}`);
          res.end();
          return;
        }

        // Stream direct naar de client
        const reader = elevenLabsResponse.body.getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            res.write(value); // stuur direct door
          }
        }
      } catch (elevenLabsErr) {
        console.error("Error calling Eleven Labs streaming API:", elevenLabsErr);
      }




      res.end();

      // De *hele* completeGeminiMessage wordt nog steeds opgeslagen in Firestore
      // await setToConversation(body.userId, body.conversationId, "assistant", completeGeminiMessage, "messages", (messages.length + 1) + "");
      // await stopLoading(body);
      await addTokenUsages(body, promptTokens.promptTokenCount, promptTokens.candidatesTokenCount, "reaction");

      if(!body.training?.trainingId || !body.training?.trainerId){
        await updateCredits(body.userId, 1);
      } else {
        await updateCreditsTraining(body.userEmail, 1, body.training.trainingId, body.training.trainerId);
      }

    } catch (err) {
      console.error("Error tijdens streaming voice:", err);
      if (!res.headersSent) {
        res.status(500).send("Error tijdens streaming voice");
      } else {
        res.end();
      }
    }
  }
);


// exports.newKnowledgeItem = onDocumentCreated({
//   region: "europe-west1",
//   memory: "1GiB",
//   timeoutSeconds: 540,
//   document:"trainers/{trainerId}/knowledge/{itemId}",
// },

//     async (event) => {
//         const snapshot = event.data;
//     if (!snapshot.exists) {
//         console.log('New knowledge item document does not exist:', snapshot.id);
//         return null;
//     }
//     const data = snapshot.data();
//     if (!data || !data.description) {
//         console.log('New knowledge item document is missing description:', snapshot.id);
//         return null;
//     }

//     ////////////////////////////////////////////////////////////////////
//       // Set language
//       ////////////////////////////////////////////////////////////////////
//     let language = 'Nederlands';
//     if(data.language){
//       language = data.language;
//     }

//     const [agent_instructions,formats] = await Promise.all([
//         getAgentInstructions('knowledge_summarizer','main',language), 
//         getFormats('knowledge_summarizer'),
//       ]);

//       ////////////////////////////////////////////////////////////////////
//       // Set system content
//       ////////////////////////////////////////////////////////////////////
//       let systemContent = setSystemContent(agent_instructions,formats);

      
//       ////////////////////////////////////////////////////////////////////
//       // Set user content
//       ////////////////////////////////////////////////////////////////////
//       console.log('description', data.description);
//       let content = agent_instructions.content.split("[description]").join(data.description).split("[title]").join(data.title).split("[language]").join(language)

//       ////////////////////////////////////////////////////////////////////
//       // Set messages
//       ////////////////////////////////////////////////////////////////////
//       let sendMessages:any[] = []
//       sendMessages.push({role: "system",content: systemContent})
//       sendMessages.push({role: "user",content: content})

//       ////////////////////////////////////////////////////////////////////
//       // Stream Gemini
//       ////////////////////////////////////////////////////////////////////
//       const result:any = await streamGemini(sendMessages,agent_instructions,false)
//       const completeMessage = result.text();

//       await db.doc(`trainers/${snapshot.ref.parent.parent.id}/knowledge/${snapshot.id}`).update({
//         summary: completeMessage,
//         timestamp: new Date().getTime(),
//       });

//     // Perform any necessary actions with the new knowledge item
//     console.log('New summary item created:', snapshot);

//     return null;
// })

exports.editedKnowledgeItem = onDocumentWritten({
  region: "europe-west1",
  memory: "1GiB",
  timeoutSeconds: 540,
  document:"trainers/{trainerId}/knowledge/{itemId}",
},
    async (event) => {
        const snapshot = event.data;
    if( !snapshot.after.exists ) {
        console.log('Knowledge item document was deleted:', snapshot.after.id);
        return null;
    }
    if (!snapshot.after.exists) {
        console.log('Knowledge item document does not exist:', snapshot.after.id);
        return null;
    }
    if (snapshot.before.data()?.description === snapshot.after.data()?.description) {
        console.log('Knowledge item document was not changed:', snapshot.after.id);
        return null;
    }
    if (!snapshot.after.data()) {
        console.log('Knowledge item document is empty:', snapshot.after.id);
        return null;
    }
    const data = snapshot.after.data();
    if (!data || !data.description) {
        console.log('New knowledge item document is missing description:', snapshot.after.id);
        return null;
    }

    ////////////////////////////////////////////////////////////////////
      // Set language
      ////////////////////////////////////////////////////////////////////
    let language = 'nl';
    if(data.language){
      language = data.language;
    }
    let original_language = 'Nederlands';
    if(data.original_language){
      original_language = data.original_language;
    }

    const [agent_instructions,formats] = await Promise.all([
        getAgentInstructions('knowledge_summarizer','main',language), 
        getFormats('knowledge_summarizer'),
      ]);

      ////////////////////////////////////////////////////////////////////
      // Set system content
      ////////////////////////////////////////////////////////////////////
      let systemContent = setSystemContent(agent_instructions,formats);

      
      ////////////////////////////////////////////////////////////////////
      // Set user content
      ////////////////////////////////////////////////////////////////////
      let content = agent_instructions.content.split("[description]").join(data.description).split("[title]").join(data.title).split("[language]").join(original_language)

      ////////////////////////////////////////////////////////////////////
      // Set messages
      ////////////////////////////////////////////////////////////////////
      let sendMessages:any[] = []
      sendMessages.push({role: "system",content: systemContent})
      sendMessages.push({role: "user",content: content})

      ////////////////////////////////////////////////////////////////////
      // Stream Gemini
      ////////////////////////////////////////////////////////////////////
      const result:any = await streamGemini(sendMessages,agent_instructions,false)
      const completeMessage = result.text();

      await db.doc(`trainers/${snapshot.after.ref.parent.parent.id}/knowledge/${snapshot.after.id}`).update({
        summary: completeMessage,
        timestamp: new Date().getTime(),
      });

    // console.log('New summary item created:', snapshot);

    return null;
})

// async function initializeConversationOld(body:any): Promise<any[]> {
//     // console.log('initializeConversation language: ' + body.language)
//     let language = 'nl'
//     if(body.language){
//       language = body.language;
//     }
//   try {
//     // const categoryRef = db.doc(`categories/${body.categoryId}`);
//     const categoryRef = db.doc(`categories/${body.categoryId}/languages/${language}`);
//     let caseRef = db.doc(`users/${body.userId}/conversations/${body.conversationId}/caseItem/caseItem`);
//     // if(body.trainerId){
//     //   caseRef = db.doc(`cases_trainer/${body.caseId}`);
//     // }
//     const [categorySnap, caseSnap, attitudes, positions, agent_instructions, userData,formats] = await Promise.all([
//       categoryRef.get(),                  // Haal category op
//       caseRef.get(),                      // Haal case op
//       getAllAttitudes(language),                  // Haal attitudes op
//       getAllPositions(),                  // Haal positions op
//       getAgentInstructions(body.instructionType,body.categoryId,language),   // Haal instructions op
//       getUserInfo(body.userId)         ,        // Haal user info op
//       getFormats(body.instructionType)
//     ]);

//     if (!categorySnap.exists || !caseSnap.exists) {
//       throw new Error("Category or Case not found");
//     }

//     // const categoryData = categorySnap.data();
//     const caseData = caseSnap.data();
//     const attitudesText = '<pre>'+JSON.stringify(attitudes) + '</pre>';
//     const positionsText = '<pre>'+JSON.stringify(positions) + '</pre>';
    
//     // console.log('agent_instructions 2: ' + agent_instructions.systemContent.substring(0, 50) + '...');

//     let systemContent = agent_instructions.systemContent;
//     systemContent = systemContent.split("[role]").join(caseData.role); 
//     systemContent = systemContent.replace("[description]", caseData.description);
//     if(caseData.steadfastness){
//       systemContent = systemContent.replace("[steadfastness]", caseData.steadfastness.toString());
//     }
//     systemContent = systemContent.replace("[attitudes]", attitudesText);
//     systemContent = systemContent.replace("[current_attitude]", body.attitude.toString());

//     systemContent = systemContent.replace("[positions]", positionsText);
//     systemContent = systemContent.replace("[current_position]", body.attitude.toString());

//     systemContent = systemContent.split("[expertise_title]").join(caseData.expertise_title || '');
//     systemContent = systemContent.split("[expertise_summary]").join(caseData.expertise_summary || '');


//     systemContent = systemContent + "\n\n" + formats.format + '\n\n' + formats.instructions;

//     let casus = caseData.casus;
//     if(!casus){casus='';}

//     // if(caseData.casus){
//     if(caseData.free_question){
//       casus = casus + '\n\n' + agent_instructions.question_user + caseData.free_question;
//       casus = casus + '\n\n' + agent_instructions.answer_user + (caseData.free_answer || agent_instructions.no_answer);
//     }
//     if(caseData.free_question2){
//       casus = casus + '\n\n' + agent_instructions.question_user + caseData.free_question2;
//       casus = casus + '\n\n' + agent_instructions.answer_user + (caseData.free_answer2 || agent_instructions.no_answer);
//     }
//     if(caseData.free_question3){
//       casus = casus + '\n\n' + agent_instructions.question_user + caseData.free_question3;
//       casus = casus + '\n\n' + agent_instructions.answer_user + (caseData.free_answer3 || agent_instructions.no_answer);
//     }
//     if(caseData.free_question4){
//       casus = casus + '\n\n' + agent_instructions.question_user + caseData.free_question4;
//       casus = casus + '\n\n' + agent_instructions.answer_user + (caseData.free_answer4 || agent_instructions.no_answer);
//     }
    
//     if(casus !== ''){
//       systemContent = systemContent.replace("[casus]",casus);
//     }
//     else{
//       systemContent = systemContent.replace("[casus]",agent_instructions.no_casus);
//     }

//     if(agent_instructions.extra_info){
//       systemContent = systemContent + "\n\n" + agent_instructions.extra_info;
//     }

    

//     let userMessage = ''
//     if(body?.openingMessage){
//       userMessage = body.openingMessage.split("[role]").join(caseData.role).split("[name]").join(userData.displayName);
//     }
//     if(!userMessage){
//       userMessage = agent_instructions.content.split("[role]").join(caseData.role).split("[name]").join(userData.displayName);
//     }

//     await setToConversation(body.userId,body.conversationId,'system',systemContent,'messages','0')
//     await setToConversation(body.userId,body.conversationId,'user',userMessage,'messages','1')

//     return [
//       {
//         role: "system",
//         content: systemContent,
//         timestamp: new Date().getTime(),
//       },
//       {
//         role: "user",
//         content: userMessage,
//         timestamp: new Date().getTime(),
//       }
//     ];
//   } catch (error) {
//     console.error("Error bij initialiseren van gesprek:", error);
//     throw new Error("Failed to initialize conversation");
//   }
// }

async function initializeConversation(body:any): Promise<any[]> {
    // console.log('initializeConversation language: ' + body.language)
    let language = 'nl'
    if(body.language){
      language = body.language;
    }
  try {
    // const categoryRef = db.doc(`categories/${body.categoryId}`);
    const categoryRef = db.doc(`categories/${body.categoryId}/languages/${language}`);
    let caseRef = db.doc(`users/${body.userId}/conversations/${body.conversationId}/caseItem/caseItem`);
    // if(body.trainerId){
    //   caseRef = db.doc(`cases_trainer/${body.caseId}`);
    // }
    const [categorySnap, caseSnap, attitudes, positions, agent_instructions, userData,formats] = await Promise.all([
      categoryRef.get(),                  // Haal category op
      caseRef.get(),                      // Haal case op
      getAllAttitudes(language),                  // Haal attitudes op
      getAllPositions(),                  // Haal positions op
      getAgentInstructions(body.instructionType,body.categoryId,language),   // Haal instructions op
      getUserInfo(body.userId)         ,        // Haal user info op
      getFormats(body.instructionType)
    ]);

    if (!categorySnap.exists || !caseSnap.exists) {
      throw new Error("Category or Case not found");
    }

    // const categoryData = categorySnap.data();
    const caseData = caseSnap.data();
    const attitudesText = '<pre>'+JSON.stringify(attitudes) + '</pre>';
    const positionsText = '<pre>'+JSON.stringify(positions) + '</pre>';
    let daysBetweenConversations = body.daysBetweenConversations
    if(daysBetweenConversations === undefined || daysBetweenConversations === null){
      daysBetweenConversations = 1; // default to 1 day if not provided
    }
    let casusUpdates:any = await getCasusUpdatePrevious(body.userId,caseData,daysBetweenConversations);

    if(casusUpdates.length > 0){
      //update casusUpdates in caseItem as array field
      await db.doc(`users/${body.userId}/conversations/${body.conversationId}/caseItem/caseItem`).update(
        { casusUpdates: casusUpdates }
      );
    }
    let textCasusUpdates = '';
    if(casusUpdates.length > 0){
      
      for(let i=0; i<casusUpdates.length; i++){

        textCasusUpdates += casusUpdates[i].title.replace('<nr_conversation>', i+1) + ':\n';
        textCasusUpdates += casusUpdates[i].intro + ':\n';
        textCasusUpdates += casusUpdates[i].summary + '\n';
        textCasusUpdates += 'Quotes:\n' + casusUpdates[i].quotes + '\n\n';
      }
    }
    // console.log('agent_instructions 2: ' + agent_instructions.systemContent.substring(0, 50) + '...');
    let newAttitude = 0;
    if(casusUpdates.length > 0 && casusUpdates[casusUpdates.length - 1].latestAttitude !== undefined){
      newAttitude = casusUpdates[casusUpdates.length - 1].latestAttitude;
    }
    // if(newAttitude == 80 && body.attitude > 80){
    //   newAttitude = body.attitude; // if the latest attitude is 80, but the user has a higher attitude, use the user's attitude
    // }
    
    let systemContent = agent_instructions.systemContent;
    systemContent = systemContent.split("[role]").join(caseData.role); 
    systemContent = systemContent.replace("[description]", caseData.description);

    systemContent = systemContent.replace("[casus_updates]", textCasusUpdates);

    if(caseData.steadfastness){
      systemContent = systemContent.replace("[steadfastness]", caseData.steadfastness.toString());
    }
    systemContent = systemContent.replace("[attitudes]", attitudesText);
    systemContent = systemContent.replace("[current_attitude]", (newAttitude || body.attitude).toString());

    systemContent = systemContent.replace("[positions]", positionsText);
    systemContent = systemContent.replace("[current_position]", (newAttitude || body.attitude).toString());

    systemContent = systemContent.split("[expertise_title]").join(caseData.expertise_title || '');
    systemContent = systemContent.split("[expertise_summary]").join(caseData.expertise_summary || '');


    systemContent = systemContent + "\n\n" + formats.format + '\n\n' + formats.instructions;

    let casus = caseData.casus;
    if(!casus){casus='';}

    // if(caseData.casus){
    if(caseData.free_question){
      casus = casus + '\n\n' + agent_instructions.question_user + caseData.free_question;
      casus = casus + '\n\n' + agent_instructions.answer_user + (caseData.free_answer || agent_instructions.no_answer);
    }
    if(caseData.free_question2){
      casus = casus + '\n\n' + agent_instructions.question_user + caseData.free_question2;
      casus = casus + '\n\n' + agent_instructions.answer_user + (caseData.free_answer2 || agent_instructions.no_answer);
    }
    if(caseData.free_question3){
      casus = casus + '\n\n' + agent_instructions.question_user + caseData.free_question3;
      casus = casus + '\n\n' + agent_instructions.answer_user + (caseData.free_answer3 || agent_instructions.no_answer);
    }
    if(caseData.free_question4){
      casus = casus + '\n\n' + agent_instructions.question_user + caseData.free_question4;
      casus = casus + '\n\n' + agent_instructions.answer_user + (caseData.free_answer4 || agent_instructions.no_answer);
    }
    
    if(casus !== ''){
      systemContent = systemContent.replace("[casus]",casus);
    }
    else{
      systemContent = systemContent.replace("[casus]",agent_instructions.no_casus);
    }

    if(agent_instructions.extra_info){
      systemContent = systemContent + "\n\n" + agent_instructions.extra_info;
    }

    

    let userMessage = ''
    if(body?.openingMessage){
      userMessage = body.openingMessage.split("[role]").join(caseData.role).split("[name]").join(userData.displayName);
    }
    if(!userMessage){
      userMessage = agent_instructions.content.split("[role]").join(caseData.role).split("[name]").join(userData.displayName);
    }

    await setToConversation(body.userId,body.conversationId,'system',systemContent,'messages','0')
    await setToConversation(body.userId,body.conversationId,'user',userMessage,'messages','1')

    return [
      {
        role: "system",
        content: systemContent,
        timestamp: new Date().getTime(),
      },
      {
        role: "user",
        content: userMessage,
        timestamp: new Date().getTime(),
      }
    ];
  } catch (error) {
    console.error("Error bij initialiseren van gesprek:", error);
    throw new Error("Failed to initialize conversation");
  }
}

async function getAllAttitudes(language:string = 'nl'): Promise<{ id: string; [key: string]: any }[]> {
  try {
    const snapshot = await db.collection("attitudes").orderBy("level").get();
    if (snapshot.empty) {
      console.warn("Geen attitudes gevonden in Firestore.");
      return [];
    }

    const attitudes = await Promise.all(snapshot.docs.map(async (doc) => {
      let attitudeData = doc.data();
      const langDoc = await doc.ref.collection('languages').doc(language).get();
      if (langDoc.exists) {
        const langData = langDoc.data();
        attitudeData.title = langData.title;
        attitudeData.description = langData.description;
      }
      return { id: doc.id, ...attitudeData };
    }));
    return attitudes;
  } catch (error) {
    console.error("Error bij ophalen attitudes:", error);
    throw new Error("Kan attitudes niet ophalen.");
  }
}

async function getAllPositions(): Promise<{ id: string; [key: string]: any }[]> {
  try {
    const snapshot = await db.collection("positions").orderBy("level").get();
    if (snapshot.empty) {
      console.warn("Geen positions gevonden in Firestore.");
      return [];
    }

    return snapshot.docs.map((doc) => {
      
      return { id: doc.id, ...doc.data() };
    });
  } catch (error) {
    console.error("Error bij ophalen positions:", error);
    throw new Error("Kan positions niet ophalen.");
  }
}

async function getAgentInstructions(type: string, categoryId:string,lang:string = 'nl'): Promise<{ [key: string]: any } | null> {
  // console.log('instructions' + type)
  console.log('agent instructions: ' + type + ', lang: ' + lang + ', categoryId: ' + categoryId)
  try {

    const snapShotMain = await db.collection("categories").doc('main').collection('languages').doc(lang).collection('agents').doc(type).get();
    if (!snapShotMain.exists) {
      console.warn(`Geen instructies gevonden voor Main`);
      return null;
    }

    let mainInstructions = snapShotMain.data();

    


    const snapShotDoc = await db.collection("categories").doc('main').collection('languages').doc(lang).get();
    if (!snapShotDoc.exists) {
      console.warn(`Geen instructies gevonden voor Main`);
      return null;
    }

    const mainInstructionsDoc = snapShotDoc.data();
    // console.log('mainInstructionsDoc: ' + mainInstructionsDoc.general_layer.substring(0, 50) + '...');


    if(categoryId != 'main'){
      const snapshot = await db.collection("categories").doc(categoryId).collection('languages').doc(lang).collection('agents').doc(type).get();
      if (!snapshot.exists) {
        console.warn(`Geen instructies gevonden voor type: ${type}`);
        return null;
      }

      const instructions = snapshot.data();
      if(instructions.overwrite&&instructions.systemContent){
        mainInstructions.systemContent = instructions.systemContent;
      }
      else if(instructions.systemContent){
        mainInstructions.systemContent = mainInstructions.systemContent.split("[category_input]").join(instructions.systemContent);
      }
      if(instructions.overwrite&&instructions.content){
        mainInstructions.content = instructions.content;
      }
      else if(instructions.content){
        mainInstructions.content = mainInstructions.content.split("[category_input]").join(instructions.content);
      }
      if(instructions.temperature){
        mainInstructions.temperature = instructions.temperature;
      }
      if(instructions.max_tokens){
        mainInstructions.max_tokens = instructions.max_tokens;
      }

    }



    if(mainInstructionsDoc.general_layer){
      mainInstructions.systemContent = mainInstructions.systemContent.split("[general_layer]").join(mainInstructionsDoc.general_layer);
    }

    // console.log('mainInstructions: ' + mainInstructions.systemContent.substring(0, 50) + '...');

    return mainInstructions;
  } catch (error) {
    console.error("Error bij ophalen instructies:", error);
    throw new Error("Kan instructies niet ophalen.");
  }

}

async function getFormats(type: string): Promise<{ [key: string]: any } | null> {
  // console.log('instructions' + type)

  try {
    const snapshot = await db.collection("formats").doc(type).get();
    if (!snapshot.exists) {
      console.warn(`Geen formats gevonden voor type: ${type}`);
      return null;
    }
    return snapshot.data();
  } catch (error) {
    console.error("Error bij ophalen instructies:", error);
    throw new Error("Kan instructies niet ophalen.");
  }

}

async function checkUserSubscription(userId: string): Promise<boolean> {
  try {
    const subscriptionRef = db.collection(`users/${userId}/subscriptions`);
    const snapshot = await subscriptionRef.get();
    if (snapshot.empty) {
      return false;
    }
// return false;

    // Controleer op specifieke abonnementsvoorwaarden
    const validSubscriptions = snapshot.docs.filter((doc) => {
      const data = doc.data();
      return data.status=='active' && (data.type === "basic"); // Pas dit aan naar jouw logica
    });

    return validSubscriptions.length > 0;
  } catch (error) {
    console.error("Error bij abonnementcontrole:", error);
    return false;
  }
}

async function checkUserIsAdmin(userId: string,trainerId:string): Promise<boolean> {
  try {
    const trainerRef = db.collection(`trainers`).doc(trainerId);
    const trainerDoc = await trainerRef.get();
    if (!trainerDoc.exists) {
      return false;
    }
    const trainerData = trainerDoc.data();

    // Controleer op specifieke abonnementsvoorwaarden
    if(trainerData.admins && trainerData.admins.includes(userId)){
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error bij abonnementcontrole:", error);
    return false;
  }
}


async function getUserInfo(userId: string): Promise<{ [key: string]: any } | null> {
  try {
    const snapshot = await db.collection("users").doc(userId).get();
    if (!snapshot.exists) {
      console.warn(`Geen user gevonden voor type: ${userId}`);
      return null;
    }
    return snapshot.data();
  } catch (error) {
    throw new Error("Kan userInfo niet ophalen.");
  }
}

async function getPreviousMessages(userId: string, conversationId: string, subCollection?:string): Promise<any[] | null> {
  try {
    if(!subCollection){
      subCollection = 'messages';
    }
    // console.log(`users/${userId}/conversations/${conversationId}/${subCollection}`);
    const messagesRef = db.collection(`users/${userId}/conversations/${conversationId}/${subCollection}`);
    const snapshot = await messagesRef.orderBy("timestamp", "asc").get();

    if (snapshot.empty) return null;

    const messages = snapshot.docs.map((doc) => doc.data());
    return messages;
  } catch (error) {
    console.error("Error bij ophalen van eerdere berichten:", error);
    return null;
  }
}

// async function updateCredits(userId: string, credits: number): Promise<void> {
//   try {
//     const creditsRef = db.collection("users").doc(userId).collection("credits").doc("credits");
//     const creditsdata = await creditsRef.get();
//     if (!creditsdata.exists) {
//       throw new Error("User not found");
//     }
//     const creditsTotal = creditsdata.data();
//     const newCredits = creditsTotal.total - credits;
//     await creditsRef.update({ total: newCredits });
//     return;
//   }
//   catch (error) {
//     console.error("Error bij updaten credits:", error);
//     throw new Error("Failed to update credits");
//   } 
// }

// async function updateCredits(userId: string, creditsToSubtract: number): Promise<void> {

//   let creditsCollectionRef = db.collection("users").doc(userId).collection("credits");

//   const user = await db.collection("users").doc(userId).get();
//   if (!user.exists) {
//     throw new Error("User not found");
//   }
//   const userData = user.data();
//   if (!userData || !userData.email) {
//     throw new Error("User email not found");
//   }
//   const employeesRef = db.collectionGroup("employees").where("email", "==", userData.email);
//   const employeesSnapshot = await employeesRef.get();
//   console.log("Employees snapshot size:", employeesSnapshot.size);
//   if (!employeesSnapshot.empty) {
//     const employeeOrganisationId = employeesSnapshot.docs[0].ref.parent.parent?.id;
//     console.log("Employee organisation ID:", employeeOrganisationId);
//     if (employeeOrganisationId) {
//       try {
//         creditsCollectionRef = db.collection("trainers").doc(employeeOrganisationId).collection('credits');
//       } catch (error) {
//         console.error("Error bij het ophalen van de organisatie ID:", error);
//         throw new Error("Failed to get organisation ID");
//       }
//     }
//   }

//   try {
//     console.log('path: ', creditsCollectionRef.path);
//     // Haal alle credit documenten op waar total > 0, gesorteerd op 'added' (oudste eerst)
//     const creditsQuerySnapshot = await creditsCollectionRef
//       .where('total', '>', 0)
//       .orderBy('added', 'asc')
//       .get();

//     // let creditDocs = creditsQuerySnapshot.docs;
//     let creditDocs: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>[] = creditsQuerySnapshot.docs;

//     // Als er geen documenten zijn met total > 0, pak het laatst toegevoegde document (ook als total 0 of negatief is)
//     if (creditDocs.length === 0) {
//       const allCreditsSnapshot = await creditsCollectionRef
//         .orderBy('added', 'desc')
//         .limit(1)
//         .get();

//       if (!allCreditsSnapshot.empty) {
//         creditDocs = allCreditsSnapshot.docs;
//       } else {
//         // Als er helemaal geen 'added' field bestaat, pak document met id 'credits'
//         const fallbackDocRef = creditsCollectionRef.doc('credits');
//         const fallbackDocSnap = await fallbackDocRef.get();

//         if (fallbackDocSnap.exists) {
//           creditDocs = [fallbackDocSnap];
//         } else {
//           throw new Error("Geen credits documenten gevonden.");
//         }
//       }
//     }

//     let remainingCredits = creditsToSubtract;
//     const batch = db.batch(); // We doen alles in een batch update

//     for (let i = 0; i < creditDocs.length; i++) {
//       const doc = creditDocs[i];
//       const data = doc.data();
//       const currentTotal = data.total || 0;

//       if (remainingCredits <= 0) {
//         break; // Niks meer af te boeken
//       }

//       let newTotal;

//       if (i === creditDocs.length - 1) {
//         // Laatste document mag in de min
//         newTotal = currentTotal - remainingCredits;
//         remainingCredits = 0;
//       } else {
//         if (currentTotal >= remainingCredits) {
//           newTotal = currentTotal - remainingCredits;
//           remainingCredits = 0;
//         } else {
//           newTotal = 0;
//           remainingCredits = remainingCredits - currentTotal;
//         }
//       }
//       const docRef = creditsCollectionRef.doc(doc.id);
//       batch.update(docRef, { total: newTotal });
//     }

//     await batch.commit();
//     // console.log("Credits succesvol geüpdatet");
//   } catch (error) {
//     console.error("Error bij updaten credits:", error);
//     throw new Error("Failed to update credits");
//   }
// }

async function updateCredits(userId: string, creditsToSubtract: number): Promise<void> {
  // Helper: probeert af te boeken in één credits-collectie.
  async function trySubtractFromCreditsCollection(
    creditsCollectionRef: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>,
    amount: number
  ): Promise<boolean> {
    try {
      // console.log('Proberen in pad:', creditsCollectionRef.path);

      // Haal alle credit documenten op waar total > 0, gesorteerd op 'added' (oudste eerst)
      const creditsQuerySnapshot = await creditsCollectionRef
        .where('total', '>', 0)
        .orderBy('added', 'asc')
        .get();

      let creditDocs: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>[] =
        creditsQuerySnapshot.docs;

      // Als er geen documenten zijn met total > 0, pak het laatst toegevoegde document (ook als total 0 of negatief is)
      if (creditDocs.length === 0) {
        const allCreditsSnapshot = await creditsCollectionRef
          .orderBy('added', 'desc')
          .limit(1)
          .get();

        if (!allCreditsSnapshot.empty) {
          creditDocs = allCreditsSnapshot.docs;
        } else {
          // Als er helemaal geen 'added' field bestaat, pak document met id 'credits'
          const fallbackDocRef = creditsCollectionRef.doc('credits');
          const fallbackDocSnap = await fallbackDocRef.get();

          if (fallbackDocSnap.exists) {
            creditDocs = [fallbackDocSnap];
          } else {
            console.log(`Geen credits documenten gevonden in ${creditsCollectionRef.path}`);
            return false; // deze collectie kan het niet afhandelen -> probeer volgende
          }
        }
      }

      let remainingCredits = amount;
      const batch = db.batch(); // We doen alles in een batch update

      for (let i = 0; i < creditDocs.length; i++) {
        const doc = creditDocs[i];
        const data = doc.data() || {};
        const currentTotal = data.total || 0;

        if (remainingCredits <= 0) break; // Niks meer af te boeken

        let newTotal: number;

        if (i === creditDocs.length - 1) {
          // Laatste document mag in de min
          newTotal = currentTotal - remainingCredits;
          remainingCredits = 0;
        } else {
          if (currentTotal >= remainingCredits) {
            newTotal = currentTotal - remainingCredits;
            remainingCredits = 0;
          } else {
            newTotal = 0;
            remainingCredits = remainingCredits - currentTotal;
          }
        }

        const docRef = creditsCollectionRef.doc(doc.id);
        batch.update(docRef, { total: newTotal });
      }

      // Als we niets hebben aangepast (bijv. omdat er geen docs waren), sla dan over
      if (remainingCredits === amount) {
        console.log(`Geen mutaties gedaan in ${creditsCollectionRef.path}`);
        return false;
      }

      await batch.commit();
      console.log(`Credits succesvol geüpdatet in ${creditsCollectionRef.path}`);
      return true;
    } catch (err) {
      // Fout in deze collectie? Log en ga door met de volgende
      console.error(`Fout bij proberen in ${creditsCollectionRef.path}:`, err);
      return false;
    }
  }

  // --- Start van hoofdlogica ---
  // Begin met de fallback naar de user-zijn eigen credits
  const userCreditsRef = db.collection("users").doc(userId).collection("credits");

  // Valideer user en e-mailadres
  const userSnap = await db.collection("users").doc(userId).get();
  if (!userSnap.exists) {
    throw new Error("User not found");
  }
  const userData = userSnap.data();
  if (!userData || !userData.email) {
    throw new Error("User email not found");
  }

  // Zoek alle organisaties waar deze email als employee voorkomt
  const employeesRef = db.collectionGroup("employees").where("email", "==", userData.email);
  const employeesSnapshot = await employeesRef.get();
  console.log("Aantal gevonden employee-records:", employeesSnapshot.size);

  // Bouw een lijst met kandidaat-collecties om in te boeken (unique, in vaste volgorde)
  // 1) Alle trainers/{orgId}/credits (voor elke gevonden organisatie)
  // 2) Als laatste: users/{userId}/credits
  const seen = new Set<string>();
  const candidateCollections: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>[] = [];

  if (!employeesSnapshot.empty) {
    for (const doc of employeesSnapshot.docs) {
      const orgId = doc.ref.parent.parent?.id;
      if (orgId) {
        const path = `trainers/${orgId}/credits`;
        if (!seen.has(path)) {
          seen.add(path);
          candidateCollections.push(db.collection("trainers").doc(orgId).collection("credits"));
        }
      }
    }
  }

  // Altijd de user-credits als laatste fallback
  const userPath = userCreditsRef.path;
  if (!seen.has(userPath)) {
    candidateCollections.push(userCreditsRef);
  }

  // Probeer in elke kandidaat-collectie tot het lukt
  for (const creditsRef of candidateCollections) {
    const ok = await trySubtractFromCreditsCollection(creditsRef, creditsToSubtract);
    if (ok) return; // klaar
  }

  // Als we hier komen is het overal mislukt
  throw new Error("Failed to update credits: geen geschikte credits gevonden in gekoppelde organisaties of gebruikersaccount.");
}

async function updateCreditsTraining(userEmail: string, creditsToSubtract: number,trainingId:string,trainerId:string): Promise<void> {
  try {
    console.log("updateCreditsTraining trainerId: " + trainerId + ', trainingId: ' + trainingId + ', userEmail: ' + userEmail + ', creditsToSubtract: ' + creditsToSubtract);
    const creditsCollectionRef = db.collection("trainers").doc(trainerId).collection('trainings').doc(trainingId).collection("credits");
    const creditsUsersCollectionRef = db.collection("trainers").doc(trainerId).collection('trainings').doc(trainingId).collection("creditsUsers");

    // Haal alle credit documenten op waar total > 0, gesorteerd op 'added' (oudste eerst)
    const creditsQuerySnapshot = await creditsCollectionRef
      .where('total', '>', 0)
      .orderBy('created', 'asc')
      .get();

    // let creditDocs = creditsQuerySnapshot.docs;
    let creditDocs: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>[] = creditsQuerySnapshot.docs;

    // Als er geen documenten zijn met total > 0, pak het laatst toegevoegde document (ook als total 0 of negatief is)
    if (creditDocs.length === 0) {
      const allCreditsSnapshot = await creditsCollectionRef
        .orderBy('created', 'desc')
        .limit(1)
        .get();

      if (!allCreditsSnapshot.empty) {
        creditDocs = allCreditsSnapshot.docs;
      } else {
        // Als er helemaal geen 'added' field bestaat, pak document met id 'credits'
        const fallbackDocRef = creditsCollectionRef.doc('credits');
        const fallbackDocSnap = await fallbackDocRef.get();

        if (fallbackDocSnap.exists) {
          creditDocs = [fallbackDocSnap];
        } else {
          throw new Error("Geen credits documenten gevonden.");
        }
      }
    }

    let remainingCredits = creditsToSubtract;
    const batch = db.batch(); // We doen alles in een batch update

    for (let i = 0; i < creditDocs.length; i++) {
      const doc = creditDocs[i];
      const data = doc.data();
      const currentTotal = data.total || 0;

      if (remainingCredits <= 0) {
        break; // Niks meer af te boeken
      }

      let newTotal;

      if (i === creditDocs.length - 1) {
        // Laatste document mag in de min
        newTotal = currentTotal - remainingCredits;
        remainingCredits = 0;
      } else {
        if (currentTotal >= remainingCredits) {
          newTotal = currentTotal - remainingCredits;
          remainingCredits = 0;
        } else {
          newTotal = 0;
          remainingCredits = remainingCredits - currentTotal;
        }
      }
      const docRef = creditsCollectionRef.doc(doc.id);
      batch.update(docRef, { total: newTotal });
    }

    await batch.commit();

    let creditsUsersDoc = await creditsUsersCollectionRef.doc(userEmail).get();
    if (creditsUsersDoc.exists) {
      let data = creditsUsersDoc.data();
      if(data.total){
        creditsToSubtract = data.total + creditsToSubtract;
      }
    }

    await creditsUsersCollectionRef.doc(userEmail).set({
      total: creditsToSubtract,
      lastUse: moment().unix(),
    });


    // console.log("Credits succesvol geüpdatet");
  } catch (error) {
    console.error("Error bij updaten credits:", error);
    throw new Error("Failed to update credits");
  }
}

function cleanReactionMessage(message:string){
  let cleanMessageArr = message.split(', reaction:');
  if(cleanMessageArr.length < 2){
    return message;
  }
  cleanMessageArr.splice(0,1);
  let reaction = cleanMessageArr.join('');
  return reaction;
}


async function addTokenUsages(body:any,promptTokens:number,completionTokens:any,instructionType:string){
  let tokensRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/tokens`);
  let usage:any = {}
  
  if(completionTokens==null){
    usage = promptTokens
  }
  else{
    usage = {prompt_tokens: promptTokens,completion_tokens: completionTokens,total_tokens: promptTokens + completionTokens}
  }

  usage.credits = creditsCost[instructionType],
  
  await tokensRef.add({
    agent: body.instructionType,
    usage: usage,
    timestamp: new Date().getTime(),
  });
}

async function setToConversation(userId:string,conversationId:string,role:string,content:string,agent:string,docId:string){
    // console.log('docId: ' + docId);
    let messageRef = db.collection(`users/${userId}/conversations/${conversationId}/${agent}`);
    messageRef.doc(docId).set({
        role: role,
        content: content.split('```json').join('').split('```').join(''),
        timestamp: new Date().getTime(),
    }).then(() => {
        // console.log('Document successfully written!');
    }).catch((error:any) => {
        console.error('Error writing document: ', error);
    });
}

async function addToConversation(userId:string,conversationId:string,role:string,content:string,agent:string,id?:any){
  let messageRef = db.collection(`users/${userId}/conversations/${conversationId}/${agent}`);
  messageRef.add({
    role: role,
    content: content.split('```json').join('').split('```').join(''),
    timestamp: new Date().getTime(),
    id: id+'' || '',
  });
}

async function stopLoading(body:any){
  let loadRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/loading`);
  return await loadRef.doc(body.instructionType).set({
    loading: false,
  });
}

// function calculateTokens(messages:any){
//   const encoding = encoding_for_model(openAiModal);
//   return messages.reduce((total:any, msg:any) => {
//     const tokens = encoding.encode(msg.content);
//     return total + tokens.length;
//   }, 0);
// }

// async function streamOpenAi(messages:any, agent_instructions:any,stream:boolean){
//   return await openai.chat.completions.create({
//     model: openAiModal,
//     messages: messages,
//     temperature: agent_instructions.temperature,
//     max_tokens: agent_instructions.max_tokens,
//     stream: stream,
//   });
// }

async function streamGemini(messages:any, agent_instructions:any,stream:boolean){
  console.log('streamGemini messages: ' + JSON.stringify(messages).substring(0,200));
    let systemContent = ''
    let lastMessage = messages[messages.length-1];
    messages.splice(messages.length-1,1);
    for(let i=0;i<messages.length;i++){
      if(messages[i].role == 'assistant'){
        messages[i].role = 'model';
      }
      if(messages[i].role == 'system'){
        systemContent = messages[i].content;
        messages.splice(i,1);
        i--;
      }
    }
    for(let i=0;i<messages.length;i++){
        messages[i].parts = [{text: messages[i].content}];
        delete messages[i].content;
    }

    const chat = modelGemini.startChat({
        history: messages,
        generationConfig: {
            maxOutputTokens: agent_instructions.max_tokens,
            temperature: agent_instructions.temperature,
        },
        systemInstruction: {
            role: 'system',
            parts: [{ text: systemContent }]
        }
        
    });

    const result =  await chat.sendMessage(lastMessage.content);

    if (!result || !result.response || !result.response.text) {
        throw new Error("No valid response from Gemini model");
    }

    return result.response; // Haal de volledige tekst op

}

async function streamingGemini(messages:any, agent_instructions:any,stream:boolean){
    let systemContent = ''
    // let lastMessage = messages[messages.length-1];
    // console.log('messages: ' + JSON.stringify(messages).substring(0,200));

    // messages.splice(messages.length-1,1);
    for(let i=0;i<messages.length;i++){
        delete messages[i].timestamp;
      if(messages[i].role == 'asssitant'){
        messages[i].role = 'model';
      }
      if(messages[i].role == 'system'){
        systemContent = messages[i].content;
        messages.splice(i,1);
        i--;
      }
    }
    for(let i=0;i<messages.length;i++){
        messages[i].parts = [{text: messages[i].content}];
        delete messages[i].content;
    }

    // console.log('messages: ' + JSON.stringify(messages).substring(0,200));
    const chat = modelGemini.generateContentStream({
        contents: messages,
        generationConfig: {
            maxOutputTokens: agent_instructions.max_tokens,
            temperature: agent_instructions.temperature,
        },
        systemInstruction: {
            role: 'system',
            parts: [{ text: systemContent }]
        }
        
    });

    return chat
    // const result =  await chat.sendMessage(lastMessage.content);

    // if (!result || !result.response || !result.response.text) {
    //     throw new Error("No valid response from Gemini model");
    // }

    // return result.response; // Haal de volledige tekst op

}

async function streamingExpertGemini(messages:any, agent_instructions:any,conversationData:any,relevant_expertise:string){
    let systemContent = agent_instructions.systemContent
    systemContent = systemContent.split("[relevant_vector_output]").join(relevant_expertise);
    systemContent = systemContent.split("[expertise_title]").join(conversationData.expertiseTitle || '');
    systemContent = systemContent.split("[expertise_summary]").join(conversationData.expertiseSummary || '');
    // let lastMessage = messages[messages.length-1];
    // console.log('messages: ' + JSON.stringify(messages).substring(0,200));

    // messages.splice(messages.length-1,1);
    for(let i=0;i<messages.length;i++){
        delete messages[i].timestamp;
      if(messages[i].role == 'asssitant'){
        messages[i].role = 'model';
      }
      if(messages[i].role == 'system'){
        systemContent = messages[i].content;
        messages.splice(i,1);
        i--;
      }
    }
    for(let i=0;i<messages.length;i++){
        messages[i].parts = [{text: messages[i].content}];
        delete messages[i].content;
    }

    // console.log('messages: ' + JSON.stringify(messages).substring(0,200));
    const chat = modelGemini.generateContentStream({
        contents: messages,
        generationConfig: {
            maxOutputTokens: agent_instructions.max_tokens,
            temperature: agent_instructions.temperature,
        },
        systemInstruction: {
            role: 'system',
            parts: [{ text: systemContent }]
        }
        
    });

    return chat
    // const result =  await chat.sendMessage(lastMessage.content);

    // if (!result || !result.response || !result.response.text) {
    //     throw new Error("No valid response from Gemini model");
    // }

    // return result.response; // Haal de volledige tekst op

}

function setHeaders(res:any){
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  return res;
}

// async function streamingChunks(stream:any,res:any){
//   const encoding = encoding_for_model(openAiModal);
//   let message:string = '';
//   let tokens:number = 0;
//   for await (const chunk of stream) {
//     const payload = chunk.choices[0]?.delta?.content;
//     if (payload) {
//       res.write(payload);
//       message = message + payload;
//       const ai_tokens = encoding.encode(payload);
//       tokens += ai_tokens.length;
//     }
//   }
//   encoding.free();
//   return {message,tokens};
// }

function setSystemContent(agent_instructions:any,formats:any){
  let systemContent = agent_instructions.systemContent
  if(formats.format){
    systemContent = systemContent + '\n\n' + formats.format;
  }
  if(formats.instructions){
    systemContent = systemContent + '\n\n' + formats.instructions;
  }
  return systemContent;
}

function goalsText(conversationData:any,noSpecifics?:boolean){
  let goals:string = ''
  if(conversationData.goalsItems?.free){
    if(goals == ''){
      goals = goals + 'Het volgende doel is gesteld door de gebruiker: '
    }
    goals = goals + conversationData.goalsItems.free + '\n\n'
  }
  if(conversationData.goalsItems?.attitude){
    if(goals == ''){
      goals = goals + 'Het volgende doel is gesteld door de gebruiker: '
    }
    goals = goals + 'Een hogere attitudescore behalen dan ' + conversationData.goalsItems.attitude + '\n\n'
  }
  if(conversationData.goalsItems?.phases?.length){
    if(goals == ''){
      goals = goals + 'Het volgende doel is gesteld door de gebruiker: '
    }
    goals = goals + 'Hogere scores gehaald bij de fases dan de volgende scores (in de volgorde van de fases): ' + conversationData.goalsItems.phases.join(', ') + '\n\n'
  }

  if(goals==''){
    if(noSpecifics){
      goals = 'Geen specifieke doelen gesteld door de gebruiker'
    }
    else{
      goals = 'Het normale doel van hoort bij [category]'
    }
  }
  
  return goals;
}


function emotions(input:string){

  let emotionInput = input.split('reaction:')
  if(!emotionInput || emotionInput.length < 2){
    return {
      text: input,
      attitude: 50,
      beforeText: 'Ik ben neutraal',
      afterText: 'Zei die neutraal',
      stability: 0.5,
    }
  }

  let attitude:any = emotionInput[0].replace('newAttitude:','').replace(',','').trim();
  attitude = parseInt(attitude);
  if(isNaN(attitude)){
    attitude = 50;
  }

  

// 1: Vijandig
// 10: Wantrouwend
// 20: Achterdochtig
// 30: Onwillig
// 40: Sceptisch
// 50: Neutraal
// 60: Respectvol
// 70: Open
// 80: Vertrouwend
// 90: empathisch
// 100: perfect empathisch


  const beforeText = getValueForScore(attitude, {
    "1":"Ik ben vijandig",
    "10":"Ik ben wantrouwnd",
    "20":"Ik ben achterdochtig",
    "30":"Ik ben onwillig",
    "40":"Ik ben sceptisch",
    "50":"Ik ben neutraal",
    "60":"Ik ben respectvol",
    "70":"Ik ben open",
    "80":"Ik ben vertrouwend",
    "90":"Ik ben empathisch",
    "100":"Ik ben perfect empathisch",
  })
  const afterText = getValueForScore(attitude, {
    "1":", zei die vijandig",
    "10":", zei die wantrouwend",
    "20":", zei die achterdochtig",
    "30":", zei die onwillig",
    "40":", zei die sceptisch",
    "50":", zei die neutraal",
    "60":", zei die respectvol",
    "70":", zei die open",
    "80":", zei die vertrouwend",
    "90":", zei die empathisch",
    "100":", zei die perfect empathisch",
  })

  const stability = getValueForScore(attitude, {
    "1":0.3,
    "10":0.32,
    "20":0.34,
    "30":0.5,
    "40":0.6,
    "50":0.7,
    "60":0.6,
    "70":0.5,
    "80":0.5,
    "90":0.5,
    "100":0.5
  })
  const style = getValueForScore(attitude, {
    "1":0.8,
    "10":0.7,
    "20":0.65,
    "30":0.5,
    "40":0.4,
    "50":0.4,
    "60":0.4,
    "70":0.5,
    "80":0.6,
    "90":0.7,
    "100":0.7
  })

  let answer:any = {
    text: emotionInput[1].trim(),
    attitude: attitude,
    beforeText: beforeText || 'Ik ben neutraal',
    afterText: afterText || 'Zei die neutraal',
    stability: stability || 0.5,
    style: style || 0.5,
  }

  return answer
}


function getValueForScore(score:any, mapping:any) {
  const keys = Object.keys(mapping)
    .map(Number) // strings naar nummers
    .sort((a, b) => a - b); // oplopend sorteren

  // Vind de grootste key ≤ score
  let selectedKey = null;
  for (let i = 0; i < keys.length; i++) {
    if (score >= keys[i]) {
      selectedKey = keys[i];
    } else {
      break;
    }
  }

  return selectedKey !== null ? mapping[selectedKey.toString()] : null;
}

async function getCasusUpdatePrevious(userId:string, caseData:any,daysBetweenConversations:number){
  if(!caseData || !caseData.previousConversationId){
    return [];
  }
  let casusUpdates:any = [];
  let previousMessages:any = [];
  
    const previousConversationRef = db.doc(`users/${userId}/conversations/${caseData.previousConversationId}`);
    const previousConversationCaseItemRef = db.doc(`users/${userId}/conversations/${caseData.previousConversationId}/caseItem/caseItem`);
    const previousConversationMessagesRef = db.collection(`users/${userId}/conversations/${caseData.previousConversationId}/messages`);

    const previousConversationSnap = await previousConversationRef.get();
    if(previousConversationSnap.exists){
      // const previousConversationData = previousConversationSnap.data();
      const previousConversationCaseItemSnap = await previousConversationCaseItemRef.get();
      if(previousConversationCaseItemSnap.exists){
        const previousConversationCaseItemData = previousConversationCaseItemSnap.data();
        if(previousConversationCaseItemData.casusUpdates){
          casusUpdates.push(...previousConversationCaseItemData.casusUpdates);
        }
      }
      // if(previousConversationData?.casusUpdates){
      //   casusUpdates.push(...previousConversationData.casusUpdates);
      // }

      const previousMessagesSnap = await previousConversationMessagesRef.get();

      previousMessages = await Promise.all(previousMessagesSnap.docs.map(async (doc) => {
        let message = doc.data();
        if(message.role !== 'system'){
          return {id:parseInt(doc.id), role: message.role, content: message.content};
        }
        return null;
      }));
      // console.log('previousMessages: ' + previousMessages.length + ' berichten gevonden');
      previousMessages = previousMessages.filter((msg:any) => msg !== null); // Verwijder null waarden
      // console.log('volle previousMessages: ' + previousMessages.length + ' berichten gevonden');
      // if (!Array.isArray(previousMessages)) {
      //  console.log('previousMessages is geen array');
      // }
      // previousMessages = previousMessages.sort((a: any, b: any) => {
      //   const aId = String(a?.id ?? '');
      //   const bId = String(b?.id ?? '');
      //   return aId.localeCompare(bId);
      // });
      previousMessages = previousMessages.sort((a:any, b:any) => a.id - b.id); // Sorteer op id
    }
    
    if(previousMessages.length > 0){
      const agent_instructions = await getAgentInstructions('conversation_summarizer','main',caseData.language);
      if(!agent_instructions || !agent_instructions.systemContent){
        return '';
      }
      let systemContent = agent_instructions.systemContent;
      let content = agent_instructions.content;
      content = content.split("[messages]").join(JSON.stringify(previousMessages));
      let messages = [
        {
          role: "system",
          content: systemContent,
        },
        {
          role: "user",
          content: content,
        }
      ];
      db.collection('temporary').add({
        messages: messages,
        userId: userId,
        caseId: caseData.id,
        timestamp: new Date()
      });
      const response = await streamGemini(messages, agent_instructions, false);
      if(response && response.text){
        let casusUpdate:any = response.text().trim();
        casusUpdate = casusUpdate.split('```json').join('').split('```').join('')
        console.log('casusUpdate: ' + casusUpdate);
        casusUpdate = JSON.parse(casusUpdate);
        casusUpdate.intro = casusUpdate.intro.split('<days_before>').join(daysBetweenConversations+'');
        casusUpdate.daysBetweenConversations = daysBetweenConversations;
        if(caseData.actionsBetweenConversationsQuestion){
          casusUpdate.summary = casusUpdate.summary + '\n\n' + caseData.actionsBetweenConversationsQuestion + '\n\n' + caseData.actionsBetweenConversations;
        }
        if(casusUpdate !== ''){
          casusUpdates.push(casusUpdate);
        }
      }
    }

    let latestAttitude = 0;
    if(previousMessages.length > 0){
      const lastMessage = previousMessages[previousMessages.length - 1];
      if(lastMessage && lastMessage.content){
        const emotionData = emotions(lastMessage.content);
        console.log('emotionData 1: ' + JSON.stringify(emotionData));

        latestAttitude = emotionData.attitude;
      }
    }
    if(latestAttitude && latestAttitude > 80){
      let temp = latestAttitude - daysBetweenConversations;
      if(temp < 80){
        temp = 80;
      }
      latestAttitude = temp;
    }
    if(latestAttitude && latestAttitude < 20){
      let temp = latestAttitude + daysBetweenConversations;
      if(temp > 20){
        temp = 20;
      }
      latestAttitude = temp;
    }

    casusUpdates[casusUpdates.length - 1].latestAttitude = latestAttitude;

    return casusUpdates;
}
