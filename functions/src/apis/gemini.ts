const { onRequest } = require("firebase-functions/v2/https");
// const { encoding_for_model } = require("tiktoken");
const fs = require("fs");
const path = require("path");
// import * as mime from "mime-types";
const fileType = require("file-type");
const { VertexAI } = require("@google-cloud/vertexai");
const vertexAI = new VertexAI({ project: "lwai-3bac8", location: "europe-west1" });
const modelVertex = vertexAI.getGenerativeModel({ model: "gemini-2.0-flash" });
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
}

// firebase deploy --only functions:chatAI,functions.choicesAI,functions.factsAI,functions.backgroundAI,functions.phasesAI,functions.feedbackAI,functions.closingAI,functions.promptChecker,functions.casePrompt,functions.goal,functions.soundToText,functions.skillsAI

exports.chatGemini = onRequest( 
  { cors: config.allowed_cors, region: "europe-west1" ,runWith: {memory: '1GB'}},
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
      await updateCredits(body.userId, creditsCost['reaction']);

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
  { cors: config.allowed_cors, region: "europe-west1" },
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
      const [agent_instructions, categorySnap,formats,conversationSnap] = await Promise.all([
        getAgentInstructions(body.instructionType,body.categoryId), 
        categoryRef.get(), 
        getFormats(body.instructionType),
        conversationRef.get()
      ]);

    if (!categorySnap.exists) {
      throw new Error("Category not found");
    }
      const categoryData = categorySnap.data();
      const conversationData = conversationSnap.data();

      ////////////////////////////////////////////////////////////////////
      // Set system content
      ////////////////////////////////////////////////////////////////////
      let systemContent = setSystemContent(agent_instructions,formats);
      systemContent = systemContent.split(`[phases_scores]`).join(lastPhaseScores);
      
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
      await updateCredits(body.userId, creditsCost['choices']);

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
  { cors: config.allowed_cors, region: "europe-west1" },
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
      await updateCredits(body.userId, creditsCost['facts']);

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
  { cors: config.allowed_cors, region: "europe-west1" },
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
      await updateCredits(body.userId, creditsCost['background']);

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
  { cors: config.allowed_cors, region: "europe-west1" },
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
      await updateCredits(body.userId, creditsCost['phases']);

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
  { cors: config.allowed_cors, region: "europe-west1", runWith: { memory: '2GB' } },
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
        if(i == messages.length-1 && messages[i].role == 'modal'){
          //do nothing
        }
        else if(messages[i].role == 'modal'){
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

      ////////////////////////////////////////////////////////////////////
      // Set system content
      ////////////////////////////////////////////////////////////////////
      let systemContent = setSystemContent(agent_instructions,formats);
      systemContent = systemContent.split("[role]").join(body.role).split("[category]").join(categoryData.title)
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
      await addToConversation(body.userId,body.conversationId,'modal',completeMessage,'feedback');

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
      await updateCredits(body.userId, creditsCost['feedback']);

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

exports.closingGemini = onRequest(
  { cors: config.allowed_cors, region: "europe-west1" },
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
      let goals = goalsText(conversationData);
      systemContent = systemContent.split(`[goal]`).join(goals);
      systemContent = systemContent.split(`[phases]`).join("<pre>" + JSON.stringify(categoryData['phaseList']) + "</pre>");
      systemContent = systemContent.split(`['phases_scores']`).join(lastPhaseScores);

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
      await updateCredits(body.userId, creditsCost['closing']);

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
  { cors: config.allowed_cors, region: "europe-west1" },
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
      systemContent = systemContent.split(`['phases_scores']`).join(lastPhaseScores);

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
      await updateCredits(body.userId, creditsCost['skills']);

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
  { cors: config.allowed_cors, region: "europe-west1", maxRequestSize: '40mb', timeoutSeconds: 120 },

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
              { text: "Transcribe the following audio into Dutch." },
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
      await updateCredits(body.userId, creditsCosts);

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
  { cors: config.allowed_cors, region: "europe-west1" },
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

    const base64Audio = await eleven.textToSpeech.convert("JBFqnCBsd6RMkjVDRZzb", input );

    // const response = await hume.tts.synthesizeJson({
    //   utterances: [
    //     {
    //       text,
    //       description: emotion, // bijv. "angry", "excited", "cold and sarcastic"
    //     },
    //   ],
    // });

    // const base64Audio = response.generations?.[0]?.audio;

      if (!base64Audio) {
        res.status(500).json({ error: "No audio generated by Hume" });
        return;
      }
      const audioBuffer = await buffer(base64Audio as Readable);
      res.set("Content-Type", "audio/mpeg"); 
      res.send(audioBuffer); 

      // res.status(200).json({
      //   audio: base64Audio,
      //   format: "mp3",
      // });
      


  } catch (error) {
    console.error('Error generating speech:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

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
    
    // console.log('agent_instructions 2: ' + agent_instructions.systemContent.substring(0, 50) + '...');

    let systemContent = agent_instructions.systemContent;
    systemContent = systemContent.split("[role]").join(caseData.role); 
    systemContent = systemContent.replace("[description]", caseData.description);
    if(caseData.steadfastness){
      systemContent = systemContent.replace("[steadfastness]", caseData.steadfastness.toString());
    }
    systemContent = systemContent.replace("[attitudes]", attitudesText);
    systemContent = systemContent.replace("[current_attitude]", body.attitude.toString());

    systemContent = systemContent.replace("[positions]", positionsText);
    systemContent = systemContent.replace("[current_position]", body.attitude.toString());

    systemContent = systemContent + "\n\n" + formats.format + '\n\n' + formats.instructions;

    if(caseData.casus){
      let casus = caseData.casus;
      if(caseData.free_question){
        casus = casus + '\n\nVraag aan de gebruiker: ' + caseData.free_question;
        casus = casus + '\n\nAntwoord van de gebruiker: ' + (caseData.free_answer || 'Geen antwoord gegeven');
      }
      systemContent = systemContent.replace("[casus]",casus);
    }
    else{
      systemContent = systemContent.replace("[casus]",'Geen casus specificaties');
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
  // console.log('agent instructions: ' + type + ', lang: ' + lang + ', categoryId: ' + categoryId)
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

async function updateCredits(userId: string, credits: number): Promise<void> {
  try {
    const creditsRef = db.collection("users").doc(userId).collection("credits").doc("credits");
    const creditsdata = await creditsRef.get();
    if (!creditsdata.exists) {
      throw new Error("User not found");
    }
    const creditsTotal = creditsdata.data();
    const newCredits = creditsTotal.total - credits;
    await creditsRef.update({ total: newCredits });
    return;
  }
  catch (error) {
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

async function addToConversation(userId:string,conversationId:string,role:string,content:string,agent:string){
  let messageRef = db.collection(`users/${userId}/conversations/${conversationId}/${agent}`);
  messageRef.add({
    role: role,
    content: content.split('```json').join('').split('```').join(''),
    timestamp: new Date().getTime(),
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
    let systemContent = ''
    let lastMessage = messages[messages.length-1];
    messages.splice(messages.length-1,1);
    for(let i=0;i<messages.length;i++){
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




// /**
//  * Converteert een WebM audiobestand naar WAV-formaat.
//  * @param inputBuffer - Buffer met WebM audio
//  * @returns {Promise<Buffer>} - Geconverteerd WAV-bestand als buffer
//  */
// export async function convertWebMtoWav(inputBuffer: Buffer): Promise<Buffer> {
//   // 📌 Maak tijdelijke bestanden aan
//   const inputPath = path.join("/tmp", `input-${Date.now()}.webm`);
//   const outputPath = path.join("/tmp", `output-${Date.now()}.wav`);

//   // 📌 Schrijf de WebM-audio naar een tijdelijk bestand
//   fs.writeFileSync(inputPath, inputBuffer);

//   return new Promise((resolve, reject) => {
//     // 📌 Voer FFmpeg uit om WebM naar WAV te converteren
//     const ffmpegProcess = spawn(ffmpeg as unknown as string, [
//       "-i", inputPath, // Inputbestand
//       "-ar", "16000",  // Sample rate 16kHz (geschikt voor Whisper AI)
//       "-ac", "1",      // Mono audio
//       "-b:a", "256k",  // Bitrate
//       outputPath       // Outputbestand
//     ]);

//     ffmpegProcess.on("close", (code) => {
//       if (code === 0) {
//         // 📌 Lees de geconverteerde WAV en geef als buffer terug
//         const wavBuffer = fs.readFileSync(outputPath);
        
//         // 📌 Opruimen van tijdelijke bestanden
//         fs.unlinkSync(inputPath);
//         fs.unlinkSync(outputPath);

//         resolve(wavBuffer);
//       } else {
//         reject(new Error(`FFmpeg fout, exit code: ${code}`));
//       }
//     });
//   });
// }