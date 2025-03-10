const { onRequest } = require("firebase-functions/v2/https");
const { encoding_for_model } = require("tiktoken");
const fs = require("fs");
const path = require("path");
import * as responder from '../utils/responder'
import * as functions from 'firebase-functions/v1';

import { db } from "../firebase";
import openai from '../configs/config-openai';
import { config } from '../configs/config-basics';
import * as sharp from "sharp";
import axios from "axios";
import admin from '../firebase'
import * as moment from 'moment';
// import { get } from 'axios';

const storage = admin.storage();
const clientId = '8eFP7LHPy8OQB5u2a8t9Qg==';  // Vervang door je eigen client ID
const clientSecret = '88jqH8PJw9G2GGq5oco7E7xEKmln2hXx';  // Vervang door je eigen client secret

const openAiModal = 'gpt-4o';

const creditsCost:any = {
  reaction: 3,
  choices: 4,
  facts: 1,
  background: 6,
  phases: 8,
  feedback: 2,
  closing: 5,
  promptChecker: 2,
  case_prompt: 5,
  goal: 3,
  soundToText:2,
  skills: 3,
}

// firebase deploy --only functions:chatAI,functions.choicesAI,functions.factsAI,functions.backgroundAI,functions.phasesAI,functions.feedbackAI,functions.closingAI,functions.promptChecker,functions.casePrompt,functions.goal,functions.soundToText,functions.skillsAI

exports.chatAI = onRequest( 
  { cors: config.allowed_cors, region: "europe-west1" },
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
        messages = await initializeConversation(body);
      }
      else{
        await setToConversation(body.userId,body.conversationId,'user',body.prompt,'messages',messages.length+'');
        messages.push({ role: "user", content: body.prompt });
      }
      
      ////////////////////////////////////////////////////////////////////
      // Calculate prompt tokens
      ////////////////////////////////////////////////////////////////////
      const promptTokens = calculateTokens(messages);

      ////////////////////////////////////////////////////////////////////
      // Get agent instructions
      ////////////////////////////////////////////////////////////////////
      const [agent_instructions] = await Promise.all([
        getAgentInstructions(body.instructionType,body.categoryId), 
      ]);

      ////////////////////////////////////////////////////////////////////
      // Stream OpenAI
      ////////////////////////////////////////////////////////////////////
      const stream = await streamOpenAi(messages,agent_instructions,true)
      let complete = await streamingChunks(stream,res);

      ////////////////////////////////////////////////////////////////////
      // end response
      ////////////////////////////////////////////////////////////////////
      res.end();

      ////////////////////////////////////////////////////////////////////
      // Add to conversation in Firebase
      ////////////////////////////////////////////////////////////////////
      await setToConversation(body.userId,body.conversationId,'assistant',complete.message.split('```json').join('').split('```').join(''),'messages',messages.length+'');

      ////////////////////////////////////////////////////////////////////
      // Stop loading
      ////////////////////////////////////////////////////////////////////
      await stopLoading(body)

      ////////////////////////////////////////////////////////////////////
      // Add token usage
      ////////////////////////////////////////////////////////////////////
      await addTokenUsages(body,promptTokens,complete.tokens,'reaction');

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

exports.choicesAI = onRequest(
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
      // Stream OpenAI
      ////////////////////////////////////////////////////////////////////
      const completion:any = await streamOpenAi(sendMessages,agent_instructions,false)
      const completeMessage = completion.choices[0].message.content;

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
      await addTokenUsages(body,completion.usage,null,'choices');

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

exports.factsAI = onRequest(
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
      const categoryRef = db.doc(`categories/${body.categoryId}`);
      const [agent_instructions, categorySnap,formats] = await Promise.all([
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
      // Stream OpenAI
      ////////////////////////////////////////////////////////////////////
      const completion:any = await streamOpenAi(sendMessages,agent_instructions,false)
      const completeMessage = completion.choices[0].message.content;

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
      await addTokenUsages(body,completion.usage,null,'facts');

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

exports.backgroundAI = onRequest(
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
      const categoryRef = db.doc(`categories/${body.categoryId}`);
      const caseRef = db.doc(`users/${body.userId}/conversations/${body.conversationId}/caseItem/caseItem`);
      const [agent_instructions, categorySnap,formats,caseSnap] = await Promise.all([
        getAgentInstructions(body.instructionType,body.categoryId), 
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
      // Stream OpenAI
      ////////////////////////////////////////////////////////////////////
      const completion:any = await streamOpenAi(sendMessages,agent_instructions,false)
      const completeMessage = completion.choices[0].message.content;

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
      await addTokenUsages(body,completion.usage,null,'background');

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

exports.phasesAI = onRequest(
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
      const categoryRef = db.doc(`categories/${body.categoryId}`);
      const [agent_instructions, categorySnap,formats] = await Promise.all([
        getAgentInstructions(body.instructionType,body.categoryId), 
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
      // Stream OpenAI
      ////////////////////////////////////////////////////////////////////
      const completion:any = await streamOpenAi(sendMessages,agent_instructions,false)
      const completeMessage = completion.choices[0].message.content;

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
      await addTokenUsages(body,completion.usage,null,'phases');

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

exports.feedbackAI = onRequest(
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
        if(i == messages.length-1 && messages[i].role == 'assistant'){
          //do nothing
        }
        else if(messages[i].role == 'assistant'){
          messageText = messageText + messages[i].role + ': ' + cleanReactionMessage(messages[i].content) + '\n\n';
        }
        else{
          messageText = messageText + messages[i].role + ': ' + messages[i].content + '\n\n';
        }
      }

      ////////////////////////////////////////////////////////////////////
      // Get category data
      ////////////////////////////////////////////////////////////////////
      const categoryRef = db.doc(`categories/${body.categoryId}`);
      const caseRef = db.doc(`users/${body.userId}/conversations/${body.conversationId}/caseItem/caseItem`);
      const [agent_instructions, categorySnap,formats,caseSnap] = await Promise.all([
        getAgentInstructions(body.instructionType,body.categoryId), 
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
      // Stream OpenAI
      ////////////////////////////////////////////////////////////////////
      const completion:any = await streamOpenAi(sendMessages,agent_instructions,false)
      const completeMessage = completion.choices[0].message.content;

      ////////////////////////////////////////////////////////////////////
      // Add to conversation in Firebase
      ////////////////////////////////////////////////////////////////////
      await addToConversation(body.userId,body.conversationId,'assistant',completeMessage,'feedback');

      ////////////////////////////////////////////////////////////////////
      // Stop loading
      ////////////////////////////////////////////////////////////////////
      await stopLoading(body);

      ////////////////////////////////////////////////////////////////////
      // Add token usage
      ////////////////////////////////////////////////////////////////////
      await addTokenUsages(body,completion.usage,null,'feedback');

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

exports.closingAI = onRequest(
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
      const categoryRef = db.doc(`categories/${body.categoryId}`);
      const conversationRef = db.doc(`users/${body.userId}/conversations/${body.conversationId}`);

      const [agent_instructions,categorySnap,formats,conversationSnap] = await Promise.all([
        getAgentInstructions(body.instructionType,body.categoryId),
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
      // Stream OpenAI
      ////////////////////////////////////////////////////////////////////
      const completion:any = await streamOpenAi(sendMessages,agent_instructions,false)
      const completeMessage = completion.choices[0].message.content;

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
      await addTokenUsages(body,completion.usage,null,'closing');

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

exports.skillsAI = onRequest(
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
      const categoryRef = db.doc(`categories/${body.categoryId}`);
      const conversationRef = db.doc(`users/${body.userId}/conversations/${body.conversationId}`);

      const [agent_instructions,categorySnap,formats,conversationSnap] = await Promise.all([
        getAgentInstructions(body.instructionType,body.categoryId),
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
      // Stream OpenAI
      ////////////////////////////////////////////////////////////////////
      const completion:any = await streamOpenAi(sendMessages,agent_instructions,false)
      const completeMessage = completion.choices[0].message.content;

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
      await addTokenUsages(body,completion.usage,null,'skills');

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

exports.soundToTextAI = onRequest(
  { cors: config.allowed_cors, region: "europe-west1", maxRequestSize: '40mb', timeoutSeconds: 120, },

  async (req:any, res:any) => {
    try {
      console.log("Received request");
      console.log(JSON.stringify(req.body));
      ////////////////////////////////////////////////////////////////////
      // Check required parameters
      ////////////////////////////////////////////////////////////////////
      const body = req.body;
      if((!body.userId) || (!body.conversationId) || (!body.file)){
        console.log("Missing required parameters in request body");
        res.status(400).send("Missing required parameters in request body");
        return;
      }

      console.log("Received file size:", body.file.length);
      console.log("File format:", body.file.slice(0, 20)); // Log eerste 20 bytes om header te checken

      ////////////////////////////////////////////////////////////////////
      // Check subscription
      ////////////////////////////////////////////////////////////////////
      const hasValidSubscription = await checkUserSubscription(body.userId);
      if (!hasValidSubscription) {
        res.status(403).send("User does not have a valid subscription");
        return;
      }

      ////////////////////////////////////////////////////////////////////
      // Decode base64 file
      ////////////////////////////////////////////////////////////////////
      const buffer:any = Buffer.from(body.file, "base64");
      const filePath = path.join("/tmp", `audio-${Date.now()}.webm`);
      fs.writeFileSync(filePath, buffer);

      ////////////////////////////////////////////////////////////////////
      // get sound length and calc credits cost
      ////////////////////////////////////////////////////////////////////
      const stats = fs.statSync(filePath);
      const fileSizeInBytes = stats.size;
      const soundLength = fileSizeInBytes / 16000;
      const creditsCosts = Math.ceil(soundLength / 30);

      console.log("Sound length:", soundLength, "Credits costs:", creditsCosts);
      ////////////////////////////////////////////////////////////////////
      // Stream OpenAI => Whisper
      ////////////////////////////////////////////////////////////////////
      const fileStream = fs.createReadStream(filePath);
      const whisperResponse = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: fileStream,
        temperature: 0.3,
      });
      const transcription = whisperResponse.text;
      fs.unlinkSync(filePath);

      ////////////////////////////////////////////////////////////////////
      // Add token usage
      ////////////////////////////////////////////////////////////////////
      const  tokensRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/tokens`);
      await tokensRef.add({
        agent: 'soundToText',
        usage: {seconds: soundLength},
        credits: creditsCosts,
        timestamp: new Date().getTime(),
      });

      ////////////////////////////////////////////////////////////////////
      // Update credits
      //////////////////////////////////////////////////////////////////
      await updateCredits(body.userId, creditsCosts);

      ////////////////////////////////////////////////////////////////////
      // Return response
      ////////////////////////////////////////////////////////////////////
      res.status(200).json({ transcription });

    } catch (error) {
      ////////////////////////////////////////////////////////////////////
      // Error handling
      ////////////////////////////////////////////////////////////////////
      console.error("Error processing request:", error);
      res.status(500).send("Internal Server Error");
    }
  }

)

exports.case_prompt = onRequest(
  { cors: config.allowed_cors, region: "europe-west1" },
  async (req: any, res: any) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");


    try {
      const body = req.body;
      if((!body.userId) || (!body.instructionType) || (!body.content) || (!body.categoryId)){
        console.log("Missing required parameters in request body");
        res.status(400).send("Missing required parameters in request body");
        return;
      }

      // 1. Controleer abonnement
      const hasValidSubscription = await checkUserSubscription(body.userId);
      if (!hasValidSubscription) {
        res.status(403).send("User does not have a valid subscription");
        return;
      }

      // // 2. Haal eerdere berichten op (indien aanwezig)
      // let messages = []
      // messages = await getPreviousMessages(body.userId, body.conversationId);
      // if (!messages) {
      //   messages = [{content:`no ${body.instructionType} found`}];
      // }

      // let messageText = JSON.stringify(messages);
      

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

      let systemContent = agent_instructions.systemContent.split("[category]").join(categoryData.title);
      let content = agent_instructions.content.split("[case_data]").join(body.content)
      content = content + '\n\n' + formats.format + '\n\n' + formats.instructions;

      let sendMessages:any[] = [
        { role: "system", content: systemContent },
        { role: "user", content: content },
      ]

      const completion = await openai.chat.completions.create({
        model: openAiModal,
        messages: sendMessages,
        temperature: agent_instructions.temperature,
        max_tokens: agent_instructions.max_tokens,
      });

      const completeMessage = completion.choices[0].message.content
      
      let messageRef = db.collection(`users/${body.userId}/case_creations`);
      
      await messageRef.add({
        agent: body.instructionType,
        usage: completion.usage,
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

exports.goalAI = onRequest(
  { cors: config.allowed_cors, region: "europe-west1" },
  async (req: any, res: any) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");


    try {
      const body = req.body;
      if((!body.userId) || (!body.conversationId) || (!body.instructionType) || (!body.categoryId)){
        console.log("Missing required parameters in request body");
        res.status(400).send("Missing required parameters in request body");
        return;
      }

      // 1. Controleer abonnement
      const hasValidSubscription = await checkUserSubscription(body.userId);
      if (!hasValidSubscription) {
        res.status(403).send("User does not have a valid subscription");
        return;
      }

      // 2. Haal eerdere berichten op (indien aanwezig)
      let messages = []
      messages = await getPreviousMessages(body.userId, body.conversationId);
      if (!messages) {
        messages = [{content:`no ${body.instructionType} found`}];
      }

      let messageText = JSON.stringify(messages);
      

      const categoryRef = db.doc(`categories/${body.categoryId}`);
      const conversationRef = db.doc(`users/${body.userId}/conversations/${body.conversationId}`);

      const [agent_instructions,categorySnap,formats,conversationSnap] = await Promise.all([
        getAgentInstructions(body.instructionType,body.categoryId),
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


      let systemContent = agent_instructions.systemContent
      systemContent = systemContent.split(`[phases]`).join(JSON.stringify(categoryData['phaseList']));
      systemContent = systemContent + '\n\n' + formats.format + '\n\n' + formats.instructions;

      let messageRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/${body.instructionType}`);

      let sendMessages:any[] = []

      sendMessages.push({
        role: "system",
        content: systemContent,
      })

      sendMessages.push({
        role: "user",
        content: agent_instructions.content.split('[messages').join(messageText).split('[goals]').join(conversationData.goalsItems.free),
      })

      const completion = await openai.chat.completions.create({
        model: openAiModal,
        messages: sendMessages,
        temperature: agent_instructions.temperature,
        max_tokens: agent_instructions.max_tokens,
      });

      const completeMessage = completion.choices[0].message.content;

      await messageRef.add({
        role: "assistant",
        content: completeMessage.split('```json').join('').split('```').join(''),
        timestamp: new Date().getTime(),
      });

      messageRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/loading`);

      await messageRef.doc(body.instructionType).set({
        loading: false,
      })

      let tokensRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/tokens`);
      await tokensRef.add({
        agent: body.instructionType,
        usage: completion.usage,
        timestamp: new Date().getTime(),
        credits: creditsCost['goal'],
      });

      await updateCredits(body.userId, creditsCost['goal']);

      // 7. Retourneer het complete antwoord
      res.status(200).send('ready');
      //res.write(payload);
        
    } catch (error) {
      console.error("Error tijdens streaming:", error);
      res.status(500).send("Error tijdens streaming");
    }
  }
);

exports.generateAndStoreImage = onRequest(
  { cors: config.allowed_cors, region: "europe-west1" },
  async (req: any, res: any) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-cache");

    const body = req.body;

    if (!body.userId) {
      console.log("Missing required parameters in request body");
      res.status(400).send("Missing required parameters: userId or prompt");
      return;
    }

let prompt = `
A centered portrait of a 
[age] 
[gender] 
[ethnicity] 
[occupation],
who looks [emotion].
The person is positioned in the center of the frame, with the head and shoulders taking up no more than 40% of the image height and width.  
There is exactly 30% empty space above the head and 30% empty space on both sides of the person.  
The person’s hairstyle, clothing, and any accessories are chosen creatively by the AI.  
The background is soft, neutral, and simple (e.g., soft gray or light beige).  
The face is well-lit with a natural expression, and the portrait is in a [style].  
The framing should emphasize the empty space, with the head appearing small compared to the overall frame.
No text, lines, or other elements should be present in the image besides the portrait.
If the image does not meet these requirements, please create the image again.
`
    if(body.prompt){
      prompt = body.prompt;
    }


    const ethnicities = ['African', 'Asian', 'Caucasian', 'Hispanic',' Middle Eastern', 'Native American', 'Mixed-race'];
    const randomEthnicity = ethnicities[Math.floor(Math.random() * ethnicities.length)];
    const gender = ['male, female', 'non-binary'];
    const randomGender = gender[Math.floor(Math.random() * gender.length)];
    const age = ['Child', 'Teenager', 'Young adult', 'Middle-aged', 'Senior', 'Elderly'];
    const randomAge = age[Math.floor(Math.random() * age.length)];
    const style = ['photo-realistic', 'Disney-style illustration', 'anime-style illustration'];
    const randomStyle = style[Math.floor(Math.random() * style.length)];
    const emotions = ['Happy', 'Sad', 'Angry', 'Surprised', 'Neutral', 'Disgusted', 'Fearful'];
    const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];


    const selectedAge = body.age || randomAge;
    const selectedGender = body.gender || randomGender;
    const selectedEthnicity = body.ethnicity || randomEthnicity;
    const selectedOccupation = body.occupation || 'Person';
    const selectedStyle = body.style || randomStyle;
    const selectedEmotion = body.emotion || randomEmotion;


    prompt = prompt.replace('[age]', selectedAge)
    prompt = prompt.replace('[gender]', selectedEthnicity)
    prompt = prompt.replace('[ethnicity]', selectedGender)
    prompt = prompt.replace('[occupation]', selectedOccupation)
    prompt = prompt.replace('[style]', selectedStyle)
    prompt = prompt.replace('[emotion]', selectedEmotion)


    try {

      if(!body.akool){
        console.log(prompt);
        // OpenAI API-aanroep om de afbeelding te genereren
        const completion = await openai.images.generate({
          model: 'dall-e-3',
          prompt: prompt,
          quality: 'standard',
          n: 1,
          size: body.size || "1024x1024",
        });
  
        const imageUrl = completion.data[0].url;
        console.log(JSON.stringify(completion.data));
        console.log("Image URL:", imageUrl);
        let imageInfo = {
          userId: body.userId,
          gender: selectedGender,
          age: selectedAge,
          style: selectedStyle,
          occupation: selectedOccupation,
          emotion: selectedEmotion,
          ethnicity: selectedEthnicity,
          akool:true
        }
  
        await saveImages(imageUrl,imageInfo);

      }
      else{
        const tokenResponse = await axios.post('https://openapi.akool.com/api/open/v3/getToken', {
          clientId: clientId,
          clientSecret: clientSecret
        });
        
        const accessToken = tokenResponse.data.token;
        if (!accessToken) {
          throw new Error("Failed to retrieve access token");
        }
  
        // **Stap 2: Afbeelding genereren**
        const imageCreationResponse = await axios.post(
          'https://openapi.akool.com/api/open/v3/content/image/createbyprompt',
          { prompt: prompt },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
      console.log("Image creation response:", JSON.stringify(imageCreationResponse.data));
        const imageModelId = imageCreationResponse.data.data._id;
        console.log("Image model ID:", imageModelId);
        if (!imageModelId) {
          throw new Error("Failed to create image with Akool API");
        }
        // let _id:string = ''
        // **Stap 3: Wachten tot de afbeelding klaar is**
        
        let imageStatus = 1;
        while (imageStatus !== 3) {
          const statusResponse:any = await axios.get(
            `https://openapi.akool.com/api/open/v3/content/image/infobymodelid?image_model_id=${imageModelId}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`
              }
            }
          );
  
          imageStatus = statusResponse.data.data.image_status;
  
          if (imageStatus === 4) {
            console.log("Image generation failed");
            throw new Error("Image generation failed");
          }
  
          // Wacht 2 seconden voordat de volgende statuscontrole wordt uitgevoerd
          if (imageStatus !== 3) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        console.log("Afbeelding gegenereerd:", imageModelId);
        // **Stap 4: Ophalen van de gegenereerde afbeelding**
        const imageUrl = 'https://openapi.akool.com/api/open/v3/content/image/infobymodelid?image_model_id=' + imageModelId;
        if (!imageUrl) {
          throw new Error("Failed to retrieve final image URL");
        }
  
  
  
        // Download de afbeelding
        const response = await axios.get(
          imageUrl, 
          { 
            headers: {
              Authorization: `Bearer ${accessToken}`
            },
          });
  
        console.log('Status response:', JSON.stringify(response.data));
  
        const imagePNG1 = response.data.data.upscaled_urls[0];
        const imagePNG2 = response.data.data.upscaled_urls[1];
        const imagePNG3 = response.data.data.upscaled_urls[2];
        const imagePNG4 = response.data.data.upscaled_urls[3];
  
        let imageInfo = {
          userId: body.userId,
          gender: selectedGender,
          age: selectedAge,
          style: selectedStyle,
          occupation: selectedOccupation,
          emotion: selectedEmotion,
          ethnicity: selectedEthnicity,
          akool:true
        }
  
        await saveImages(imagePNG1,imageInfo,accessToken);
        await saveImages(imagePNG2,imageInfo,accessToken);
        await saveImages(imagePNG3,imageInfo,accessToken);
        await saveImages(imagePNG4,imageInfo,accessToken);

      }


      // console.log("Afbeelding opgeslagen:", publicUrl);
      res.status(200).send({ status: 'image saved' });

    } catch (error) {
      console.error("Error generating or saving image:", error);
      res.status(500).send("Error generating or saving image");
    }
  }
);


// exports.categoryCreatePhases = functions.region('europe-west1')
//   .firestore
//   .document('categories/{categoryId}')
//   .onCreate(async (change:any, context:any) => {
//     const categoryData = change.data();

//     if(!categoryData.phaseList || categoryData.phaseList.length <2){

//       const [agent_instructions,formats] = await Promise.all([
//         getAgentInstructions('phase_creator','main'), 
//         getFormats('phase_creator')
//       ]);


//       let systemContent = agent_instructions.systemContent
//       systemContent = systemContent + '\n\n' + formats.format + '\n\n' + formats.instructions;

//       let sendMessages:any[] = []

//       sendMessages.push({
//         role: "system",
//         content: systemContent,
//       })

//       let content = agent_instructions.content.split("[category]").join(categoryData.title)

//       sendMessages.push({
//         role: "user",
//         content: content,
//       })


//       const completion = await openai.chat.completions.create({
//         model: openAiModal,
//         messages: sendMessages,
//         temperature: agent_instructions.temperature,
//         max_tokens: agent_instructions.max_tokens,
//       });

//       const completeMessage = completion.choices[0].message.content.split('```json').join('').split('```').join('')
      
//       console.log('completeMessage: ' + completeMessage);

//       const parsedMessage = JSON.parse(completeMessage);

//       await db.collection('categories').doc(context.params.categoryId).update({
//         phaseList: Array.isArray(parsedMessage) ? parsedMessage : []
//       });

//     }
//   });

exports.analyzeCaseLevel = functions.region('europe-west1')
  .runWith({memory:'1GB'}).firestore
  .document('cases/{caseId}')
  .onWrite(async (change, context) => {
    const caseId = context.params.caseId;
    const db = admin.firestore();
    let caseDataNew:any = {}
    let caseDataOld:any = {}
    if(change.before.exists){
      caseDataOld = change.before.data();
    }
    if(change.after.exists){
      caseDataNew = change.after.data();

      // if case_analyzed is minder dan 10 seconden geleden, dan niet analyseren
      if(caseDataNew.case_analyzed && caseDataNew.case_analyzed > Date.now() - 10000){
        return null;
      }

      const categoryRef = db.collection('categories').doc(caseDataNew.conversation);
      const categorySnap = await categoryRef.get();
      if (!categorySnap.exists) {
        throw new Error("Category not found");
      }
      const categoryData = categorySnap.data();

      if(
        caseDataNew.role !== caseDataOld.role ||
        caseDataNew.casus !== caseDataOld.casus ||
        caseDataNew.attitude !== caseDataOld.attitude ||
        caseDataNew.steadfastness !== caseDataOld.steadfastness ||
        caseDataNew.conversation !== caseDataOld.conversation ||
        caseDataNew.goalsItems !== caseDataOld.goalsItems
      ){
        await db.collection('cases').doc(caseId).update({
          analyzing_level: true
        });

        let caseText:string = '';

        if(caseDataNew.role){
          caseText = caseText + 'Welke Rol moet de AI aannemen?\n' + caseDataNew.role + '\n\n';
        }

        caseText = caseText + 'Welk gesprekstype / gesprekstechniek betreft het?\n' + categoryData.title + '\n\n';

        caseText = caseText + 'Welke fases/elementen zijn van belang in dit gesprekstype?\n';
        for(let i=0;i<categoryData.phaseList.length;i++){
          caseText = caseText + 'Fase/element '+ (i+1) + ':\nTitel: ' + categoryData.phaseList[i].title + '\nOmschrijving :'+ categoryData.phaseList[i].description + '\n\n';
        }


        if(caseDataNew.casus){
          caseText = caseText + 'Beschrijf de casus:\n' + caseDataNew.casus + '\n\n';
        }
        if(caseDataNew.attitude){
          caseText = caseText + 'Met welke begin attitude start de AI?\nScore: ' + caseDataNew.attitude + '\n\n';
        }
        else{
          caseText = caseText + 'Met welke begin attitude start de AI?\nScore '+ '1' + '\n\n';
        }
        if(caseDataNew.steadfastness){
          caseText = caseText + 'Hoe standvastig is de AI?\nScore: ' + caseDataNew.steadfastness + '\n\n';
        }
        else{
          caseText = caseText + 'Hoe standvastig is de AI?\nScore: '+ '1' + '\n\n';
        }

        if(caseDataNew.goalsItems.attitude){
          caseText = caseText + 'Tot welke attitudescore moeten de AI veranderd worden in het gesprek?\n' + caseDataNew.goalsItems.attitude + '\n\n';
        }
        if(caseDataNew.goalsItems.phases?.length){
          caseText = caseText + 'Welke percentage moeten de fases worden vervuld?\n' 
          for(let i=0;i<caseDataNew.goalsItems.phases.length;i++){
            caseText = caseText + categoryData.phaseList[i].title + ': ' + caseDataNew.goalsItems.phases[i] + '\n';
          }
        }
        if(caseDataNew.goalsItems.free){
          caseText = caseText + 'Welke doelen moeten worden bereikt?\n' + caseDataNew.goalsItems.free + '\n\n';
        }

        const [agent_instructions,formats] = await Promise.all([
          getAgentInstructions('levels','main'), 
          getFormats('levels')
        ]);


        let systemContent = agent_instructions.systemContent
        systemContent = systemContent + '\n\n' + formats.format + '\n\n' + formats.instructions;

        let sendMessages:any[] = [
          {role: "system",content: systemContent},
          {role: "user",content: agent_instructions.content.split('[case_data]').join(caseText)},
        ]


        const completion = await openai.chat.completions.create({
          model: openAiModal,
          messages: sendMessages,
          temperature: agent_instructions.temperature,
          max_tokens: agent_instructions.max_tokens,
        });

        const completeMessage = completion.choices[0].message.content.split('```json').join('').split('```').join('')

        await db.collection('cases').doc(caseId).update({
          level: JSON.parse(completeMessage).level,
          level_explanation: JSON.parse(completeMessage).description,
          analyzing_level: false,
          case_analyzed: Date.now(),
        });

        return null;

      }
    }

    


    return null;
});



exports.createPhases = functions.region('europe-west1').https.onCall(async (data: any, context: any) => {
  const categoryData = data.categoryData
  const user = await admin.firestore().collection('users').doc(context.auth?.uid).get()
  if(!user.exists){
      return new responder.Message('Admin not found',404)
  }
  const userData = user.data()
  if(!userData?.isAdmin){
      return new responder.Message('Not authorized',403)
  }

  const [agent_instructions,formats] = await Promise.all([
    getAgentInstructions('phase_creator','main'), 
    getFormats('phase_creator')
  ]);


  let systemContent = agent_instructions.systemContent
  systemContent = systemContent + '\n\n' + formats.format + '\n\n' + formats.instructions;

  let sendMessages:any[] = []

  sendMessages.push({
    role: "system",
    content: systemContent,
  })

  let content = agent_instructions.content.split("[category]").join(categoryData.title)

  sendMessages.push({
    role: "user",
    content: content,
  })


  const completion = await openai.chat.completions.create({
    model: openAiModal,
    messages: sendMessages,
    temperature: agent_instructions.temperature,
    max_tokens: agent_instructions.max_tokens,
  });

  const completeMessage = completion.choices[0].message.content.split('```json').join('').split('```').join('')

  const parsedMessage = JSON.parse(completeMessage);

  await db.collection('categories').doc(categoryData.id).update({
    phaseList: Array.isArray(parsedMessage) ? parsedMessage : []
  });

  return new responder.Message('Phases created',200)
  
});


exports.createPhasesOnCreate = functions.region('europe-west1')
.runWith({memory:'1GB'}).firestore
.document('categories/{categoryId}')
.onCreate(async (change, context) => {



  const categoryData = change.data();

  const [agent_instructions,formats] = await Promise.all([
    getAgentInstructions('phase_creator','main'), 
    getFormats('phase_creator')
  ]);


  let systemContent = agent_instructions.systemContent
  systemContent = systemContent + '\n\n' + formats.format + '\n\n' + formats.instructions;

  let sendMessages:any[] = []

  sendMessages.push({
    role: "system",
    content: systemContent,
  })

  let content = agent_instructions.content.split("[category]").join(categoryData.title)

  sendMessages.push({
    role: "user",
    content: content,
  })


  const completion = await openai.chat.completions.create({
    model: openAiModal,
    messages: sendMessages,
    temperature: agent_instructions.temperature,
    max_tokens: agent_instructions.max_tokens,
  });

  const completeMessage = completion.choices[0].message.content.split('```json').join('').split('```').join('')
  
  const parsedMessage = JSON.parse(completeMessage);

  await db.collection('categories').doc(categoryData.id).update({
    phaseList: Array.isArray(parsedMessage) ? parsedMessage : []
  });

  return null;
  
});

async function saveImages(imageUrl:string,imageInfo:any,accessToken?:string){

  let imageData:any;
  console.log('imageInfo: ' + imageUrl);
  console.log('imageInfo: ' + JSON.stringify(imageInfo));
  if(imageInfo.akool){
    imageData = await axios.get(
      imageUrl, 
      { headers: {
        Authorization: `Bearer ${accessToken}`
      },
      responseType: 'arraybuffer' });
  }
  else{
    
    console.log('imageData laden');
    imageData = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    console.log('imageData geladen');
  }

  const imageBuffer = Buffer.from(imageData.data, "binary");
  // Optioneel: Converteer PNG naar WebP (commentaar verwijderen als nodig)
  const webpBuffer = await sharp(imageBuffer).webp().toBuffer();
  // Genereer een unieke bestandsnaam
  const fileName = `generated-images/${Date.now()}_${imageInfo.userId}.webp`;
  // Upload de afbeelding naar Firebase Cloud Storage
  const bucket = storage.bucket('lwai-3bac8.firebasestorage.app');
  const file = bucket.file(fileName);

  await file.save(webpBuffer, {
    metadata: {
      contentType: "image/webp",
    },
  });

  await file.makePublic();

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

  await admin.firestore().collection('ai-avatars').add({
    // userId: imageInfo.userId,
    url: publicUrl,
    timestamp: moment().unix(),
    gender: imageInfo.gender,
    age: imageInfo.age,
    style: imageInfo.style,
    occupation: imageInfo.occupation,
    occupationCategory: occupationCategory(imageInfo.occupation),
    ethnicity: imageInfo.ethnicity,
    emotion: imageInfo.emotion,
  });
}


// async function initializeConversationOld(
//   categoryId: string,
//   caseId: string,
//   startAttitude: number,
//   instructionType: string,
//   userId: string,
//   data:any
// ): Promise<any[]> {
//   try {
//     const categoryRef = db.doc(`categories/${categoryId}`);
//     let caseRef = db.doc(`cases/${caseId}`);
//     if(data.trainerId){
//       caseRef = db.doc(`cases_trainer/${caseId}`);
//     }
//     const [categorySnap, caseSnap, attitudes, positions, agent_instructions, userData,formats] = await Promise.all([
//       categoryRef.get(),                  // Haal category op
//       caseRef.get(),                      // Haal case op
//       getAllAttitudes(),                  // Haal attitudes op
//       getAllPositions(),                  // Haal positions op
//       getAgentInstructions(instructionType,categoryId),   // Haal instructions op
//       getUserInfo(userId)         ,        // Haal user info op
//       getFormats(instructionType)
//     ]);

//     if (!categorySnap.exists || !caseSnap.exists) {
//       throw new Error("Category or Case not found");
//     }

//     // const categoryData = categorySnap.data();
//     const caseData = caseSnap.data();
//     const attitudesText = JSON.stringify(attitudes);
//     const positionsText = JSON.stringify(positions);
    

//     let systemContent = agent_instructions.systemContent;
//     systemContent = systemContent.split("[role]").join(caseData.role); 
//     systemContent = systemContent.replace("[description]", caseData.description);
//     if(caseData.steadfastness){
//       systemContent = systemContent.replace("[steadfastness]", caseData.steadfastness.toString());
//     }
//     systemContent = systemContent.replace("[attitudes]", attitudesText);
//     systemContent = systemContent.replace("[current_attitude]", startAttitude.toString());

//     systemContent = systemContent.replace("[positions]", positionsText);
//     systemContent = systemContent.replace("[current_position]", startAttitude.toString());

//     systemContent = systemContent + "\n\n" + formats.format + '\n\n' + formats.instructions;

//     if(caseData.casus){
//       systemContent = systemContent + "\nDe casus voor de gebruiker is als volgt: " + caseData.casus;
//     }

//     if(caseData.interest_goals){
//       systemContent = systemContent.replace("[interest_goals]", caseData.interest_goals);
//     }

//     if(agent_instructions.extra_info){
//       systemContent = systemContent + "\n\n" + agent_instructions.extra_info;
//     }

    

//     let userMessage = ''
//     if(data?.openingMessage){
//       userMessage = data.openingMessage.split("[role]").join(caseData.role).split("[name]").join(userData.displayName);
//     }
//     if(!userMessage){
//       userMessage = agent_instructions.content.split("[role]").join(caseData.role).split("[name]").join(userData.displayName);
//     }

//     // console.log('userMessage: ' + userMessage);


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
  try {
    const categoryRef = db.doc(`categories/${body.categoryId}`);
    let caseRef = db.doc(`users/${body.userId}/conversations/${body.conversationId}/caseItem/caseItem`);
    // if(body.trainerId){
    //   caseRef = db.doc(`cases_trainer/${body.caseId}`);
    // }
    const [categorySnap, caseSnap, attitudes, positions, agent_instructions, userData,formats] = await Promise.all([
      categoryRef.get(),                  // Haal category op
      caseRef.get(),                      // Haal case op
      getAllAttitudes(),                  // Haal attitudes op
      getAllPositions(),                  // Haal positions op
      getAgentInstructions(body.instructionType,body.categoryId),   // Haal instructions op
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
      systemContent = systemContent.replace("[casus]",caseData.casus);
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

    // console.log('userMessage: ' + userMessage);
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



async function getAllAttitudes(): Promise<{ id: string; [key: string]: any }[]> {
  try {
    const snapshot = await db.collection("attitudes").orderBy("level").get();
    if (snapshot.empty) {
      console.warn("Geen attitudes gevonden in Firestore.");
      return [];
    }

    return snapshot.docs.map((doc) => {
      
      return { id: doc.id, ...doc.data() };
    });
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

// async function getInstructions(type: string): Promise<{ [key: string]: any } | null> {
//   // console.log('instructions' + type)
//   try {
//     const snapshot = await db.collection("instructions").doc(type).get();
//     if (!snapshot.exists) {
//       console.warn(`Geen instructies gevonden voor type: ${type}`);
//       return null;
//     }
//     return snapshot.data();
//   } catch (error) {
//     console.error("Error bij ophalen instructies:", error);
//     throw new Error("Kan instructies niet ophalen.");
//   }
// }

async function getAgentInstructions(type: string, categoryId:string): Promise<{ [key: string]: any } | null> {
  // console.log('instructions' + type)

  try {

    const snapShotMain = await db.collection("categories").doc('main').collection('agents').doc(type).get();
    if (!snapShotMain.exists) {
      console.warn(`Geen instructies gevonden voor Main`);
      return null;
    }

    let mainInstructions = snapShotMain.data();

    const snapShotDoc = await db.collection("categories").doc('main').get();
    if (!snapShotDoc.exists) {
      console.warn(`Geen instructies gevonden voor Main`);
      return null;
    }

    const mainInstructionsDoc = snapShotDoc.data();

    const snapshot = await db.collection("categories").doc(categoryId).collection('agents').doc(type).get();
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
    if(mainInstructionsDoc.general_layer){
      mainInstructions.systemContent = mainInstructions.systemContent.split("[general_layer]").join(mainInstructionsDoc.general_layer);
    }



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
    if (snapshot.empty) return false;

    // Controleer op specifieke abonnementsvoorwaarden
    const validSubscriptions = snapshot.docs.filter((doc) => {
      const data = doc.data();
      return data.status=='active' && (data.type === "premium" || data.type === "trial" || data.type === "student" ); // Pas dit aan naar jouw logica
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
    console.log(`users/${userId}/conversations/${conversationId}/${subCollection}`);
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

// function messagesToConversationString(messages:any,role:string){
//   let conversation:string = '';
//   for(let i = 0; i < messages.length; i++){
//     if(messages[i].role == 'assistant'){
//       conversation = conversation + (i+1) +". '" + role + "': " + messages[i].content + '\n';
//     }
//     else if (messages[i].role == 'user'){
//       conversation = conversation + (i+1) +".'User': " + messages[i].content + '\n';
//     }
//     else if (messages[i].role == 'system'){
//       conversation = conversation + (i+1) +".'Setting': " + messages[i].content + '\n';
//     }
//   }
//   return conversation;

// }

function cleanReactionMessage(message:string){
  let cleanMessageArr = message.split(', reaction:');
  if(cleanMessageArr.length < 2){
    return message;
  }
  cleanMessageArr.splice(0,1);
  let reaction = cleanMessageArr.join('');
  return reaction;
}

function occupationCategory(occupation:string){
  let categories:any = {
      "Person": {
        "category": "General"
      },
      "Doctor": {
        "category": "Healthcare"
      },
      "Nurse": {
        "category": "Healthcare"
      },
      "Dentist": {
        "category": "Healthcare"
      },
      "Pharmacist": {
        "category": "Healthcare"
      },
      "Veterinarian": {
        "category": "Healthcare"
      },
      "Psychologist": {
        "category": "Healthcare"
      },
      "Paramedic": {
        "category": "Healthcare"
      },
      "Engineer": {
        "category": "Technical"
      },
      "Software Developer": {
        "category": "Technical"
      },
      "Civil Engineer": {
        "category": "Technical"
      },
      "Electrician": {
        "category": "Technical"
      },
      "Plumber": {
        "category": "Technical"
      },
      "Mechanic": {
        "category": "Technical"
      },
      "Carpenter": {
        "category": "Technical"
      },
      "Architect": {
        "category": "Technical"
      },
      "Data Scientist": {
        "category": "Technical"
      },
      "Construction Worker": {
        "category": "Technical"
      },
      "Biologist": {
        "category": "Technical"
      },
      "Environmental Scientist": {
        "category": "Technical"
      },
      "Marine Biologist": {
        "category": "Technical"
      },
      "Astronomer": {
        "category": "Technical"
      },
      "Botanist": {
        "category": "Technical"
      },
      "Pilot": {
        "category": "Technical"
      },
      "Teacher": {
        "category": "Business"
      },
      "Librarian": {
        "category": "Business"
      },
      "Accountant": {
        "category": "Business"
      },
      "Financial Advisor": {
        "category": "Business"
      },
      "Business Analyst": {
        "category": "Business"
      },
      "Marketing Specialist": {
        "category": "Business"
      },
      "Entrepreneur": {
        "category": "Business"
      },
      "Event Planner": {
        "category": "Business"
      },
      "Economist": {
        "category": "Business"
      },
      "Lawyer": {
        "category": "Business"
      },
      "Journalist": {
        "category": "Creative"
      },
      "Photographer": {
        "category": "Creative"
      },
      "Graphic Designer": {
        "category": "Creative"
      },
      "Artist": {
        "category": "Creative"
      },
      "Animator": {
        "category": "Creative"
      },
      "Fashion Designer": {
        "category": "Creative"
      },
      "Musician": {
        "category": "Creative"
      },
      "Model": {
        "category": "Creative"
      },
      "Chef": {
        "category": "Creative"
      },
      "Athlete": {
        "category": "Creative"
      }
    }
  
    if(categories[occupation]){
      return categories[occupation].category;
    }
    return ''
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
  let messageRef = db.collection(`users/${userId}/conversations/${conversationId}/${agent}`);
  messageRef.doc(docId).set({
    role: role,
    content: content.split('```json').join('').split('```').join(''),
    timestamp: new Date().getTime(),
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

function calculateTokens(messages:any){
  const encoding = encoding_for_model(openAiModal);
  return messages.reduce((total:any, msg:any) => {
    const tokens = encoding.encode(msg.content);
    return total + tokens.length;
  }, 0);
}

async function streamOpenAi(messages:any, agent_instructions:any,stream:boolean){
  return await openai.chat.completions.create({
    model: openAiModal,
    messages: messages,
    temperature: agent_instructions.temperature,
    max_tokens: agent_instructions.max_tokens,
    stream: stream,
  });
}

function setHeaders(res:any){
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  return res;
}

async function streamingChunks(stream:any,res:any){
  const encoding = encoding_for_model(openAiModal);
  let message:string = '';
  let tokens:number = 0;
  for await (const chunk of stream) {
    const payload = chunk.choices[0]?.delta?.content;
    if (payload) {
      res.write(payload);
      message = message + payload;
      const ai_tokens = encoding.encode(payload);
      tokens += ai_tokens.length;
    }
  }
  encoding.free();
  return {message,tokens};
}

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