const { onRequest } = require("firebase-functions/v2/https");
const { encoding_for_model } = require("tiktoken");
const fs = require("fs");
const path = require("path");

import { db } from "../firebase";
import openai from '../configs/config-openai';
import { config } from '../configs/config-basics';

const openAiModal = 'gpt-4o';

//firebase deploy --only functions:chatAI,functions:choicesAI,functions.factsAI,functions:backgroundAI,functions:phasesAI,functions:feedbackAI,functions:closingAI,functions:promptCheckerAI,functions:case_prompt,functions:goalAI

exports.chatAI = onRequest( 
  { cors: config.allowed_cors, region: "europe-west1" },
  async (req: any, res: any) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");


    try {
      const body = req.body;

      if((!body.userId) || (!body.conversationId) || (!body.categoryId) || (!body.caseId) || (!body.instructionType) || (!body.attitude) || (!body.prompt && !body.conversationId)){
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
        // 3. Initialiseer nieuw gesprek als er geen berichten zijn
        // console.log('initialize conversation')
        messages = await initializeConversation(body.categoryId, body.caseId, body.attitude, body.instructionType, body.userId,body);
        for(let i = 0; i < messages.length; i++){
          db.doc(`users/${body.userId}/conversations/${body.conversationId}/messages/${i}`).set(messages[i]);
        }
      }
      else{
        // console.log('messages found: ' + messages.length)
        let messageRef = db.doc(`users/${body.userId}/conversations/${body.conversationId}/messages/${messages.length}`);
        await messageRef.set({
          role: "user",
          content: body.prompt,
          timestamp: new Date().getTime(),
        });
        messages.push({ role: "user", content: body.prompt });
      }

      // res.write('messages - ' +JSON.stringify(messages));
      // res.end();
      // return
      
      // 4. Voeg prompt toe aan berichten

      // Bereken prompt_tokens
      const encoding = encoding_for_model(openAiModal);
      const promptTokens = messages.reduce((total, msg) => {
        const tokens = encoding.encode(msg.content);
        return total + tokens.length;
      }, 0);

      const [agent_instructions] = await Promise.all([
        getAgentInstructions(body.instructionType,body.categoryId), 
      ]);

      // 5. Start streaming OpenAI-antwoord
      const stream = await openai.chat.completions.create({
        model: openAiModal,
        messages: messages,
        temperature: agent_instructions.temperature,
        max_tokens: agent_instructions.max_tokens,
        stream: true,
      });
      

      let completeMessage = '';
      let completionTokens = 0;

      for await (const chunk of stream) {
        const payload = chunk.choices[0]?.delta?.content;
        if (payload) {
          res.write(payload);
          completeMessage = completeMessage + payload;

          // Tel tokens in de huidige chunk
          const tokens = encoding.encode(payload);
          completionTokens += tokens.length;
        }
      }
      res.end();

      const totalTokens = promptTokens + completionTokens;
      encoding.free();

      // console.log('messages id found: ' + messages.length)
      let message_id = messages.length;
      let messageRef = db.doc(`users/${body.userId}/conversations/${body.conversationId}/messages/${message_id}`);
      await messageRef.set({
        role: "assistant",
        content: completeMessage,
        timestamp: new Date().getTime(),
      });

      let loadRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/loading`);

      await loadRef.doc(body.instructionType).set({
        loading: false,
      });
      
      let tokensRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/tokens`);
      await tokensRef.add({
        agent: body.instructionType,
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
        },
        timestamp: new Date().getTime(),
      });


    } catch (error) {
      console.error("Error tijdens streaming:", error);
      res.status(500).send("Error tijdens streaming");
    }
  }
);

exports.choicesAI = onRequest(
  { cors: config.allowed_cors, region: "europe-west1" },
  async (req: any, res: any) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");


    try {
      const body = req.body;
      if((!body.userId) || (!body.conversationId) || (!body.instructionType) || (!body.role) || (!body.categoryId)){
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
      let messages:any = []
      messages = await getPreviousMessages(body.userId, body.conversationId);
      if (!messages) {
        return res.status(400).send("No previous messages found");
      }

      // let messageText = '';
      // for(let i = 0; i < messages.length; i++){
      //   messageText = messageText + '\n\n' + messages[i].role + 'prompt: ' + cleanReactionMessage(messages[i].content) + '\n\n';
      // }
      let messageText = JSON.stringify(messages);
      let lastMessage =  cleanReactionMessage(messages[messages.length-1].content);



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

      // console.log('agent_instructions: ' + body.instructionType + ' /// ' + JSON.stringify(agent_instructions))

      let systemContent = agent_instructions.systemContent
      systemContent = systemContent + '\n\n' + formats.format + '\n\n' + formats.instructions;

      let content = agent_instructions.content.split("[role]").join(body.role).split("[category]").join(categoryData.title);
      content = content.split('[messages]').join(messageText).split('[lastMessage]').join(lastMessage);
      // content = content + '\n\n' + JSON.stringify(messagesToConversationString(messages,body.role));

      // res.write(content+'\n\n');

      let messageRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/${body.instructionType}`);
      
      messageRef.add({
        role: "system",
        content: systemContent,
        timestamp: new Date().getTime(),
      });

      messageRef.add({
        role: "user",
        content: content,
        timestamp: new Date().getTime(),
      });

      let sendMessages:any[] = []

      if(body.allMessages){
        sendMessages = messages;
      }
      else{
        sendMessages.push({
          role: "system",
          content: systemContent,
        })

        sendMessages.push({
          role: "user",
          content: content,
        })
      }

      const completion = await openai.chat.completions.create({
        model: openAiModal,
        messages: sendMessages,
        temperature: agent_instructions.temperature,
        max_tokens: agent_instructions.max_tokens,
      });

      const completeMessage = completion.choices[0].message.content;

      // 6. Sla het antwoord op in de database
      await messageRef.add({
        role: "assistant",
        content: completeMessage,
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
      });
      // 7. Retourneer het complete antwoord
      res.status(200).send('ready');
      //res.write(payload);
        
    } catch (error) {
      console.error("Error tijdens streaming:", error);
      res.status(500).send("Error tijdens streaming");
    }
  }
);

exports.factsAI = onRequest(
  { cors: config.allowed_cors, region: "europe-west1" },
  async (req: any, res: any) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");


    try {
      const body = req.body;
      if((!body.userId) || (!body.conversationId) || (!body.instructionType) || (!body.role) || (!body.categoryId)){
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
      // let messages = []
      // messages = await getPreviousMessages(body.userId, body.conversationId,'facts');
      // if (!messages) {
      //   messages = [{content:'no facts found'}];
      // }

      // let messageText = '';
      // for(let i = 0; i < messages.length; i++){
      //   messageText = messageText + messages[i].content + '\n\n';
      // }

      let messages:any = []
      messages = await getPreviousMessages(body.userId, body.conversationId);
      if (!messages) {
        messages = [{content:'No other messages found'}];
      }

      let messageText = '';
      // messageText = messages[0].role +': ' + messages[0].content
      // for last 4 messages add the content
      for(let i = 1; i < messages.length; i++){
        if(i > messages.length-5){
          messageText = messageText + messages[i].role +': ' + messages[i].content + '\n\n';
        }
      }
        // messages = JSON.stringify(messages);
          
      let previousFacts:any = []
      previousFacts = await getPreviousMessages(body.userId, body.conversationId,'facts');
      if (!previousFacts) {
        previousFacts = [{content:'No other facts found'}];
      }
      previousFacts = JSON.stringify(messages);

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

      let systemContent = agent_instructions.systemContent
      systemContent = systemContent + '\n\n' + formats.format + '\n\n' + formats.instructions;
      
      let content = agent_instructions.content.split("[role]").join(body.role).split("[category]").join(categoryData.title)
      content = content.split('[facts]').join(previousFacts);
      content = content.split('[messages]').join(messageText);

      let messageRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/${body.instructionType}`);

      // messageRef.add({
      //   role: "system",
      //   content: systemContent,
      //   timestamp: new Date().getTime(),
      // });

      // messageRef.add({
      //   role: "user",
      //   content: content,
      //   timestamp: new Date().getTime(),
      // });

      let sendMessages:any[] = [
        {role: "system", content: systemContent},
        {role: "user", content: content},
      ]


      const completion = await openai.chat.completions.create({
        model: openAiModal,
        messages: sendMessages,
        temperature: agent_instructions.temperature,
        max_tokens: agent_instructions.max_tokens,
      });

      const completeMessage = completion.choices[0].message.content;

      // 6. Sla het antwoord op in de database
      // let messageRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/${body.instructionType}`);

      await messageRef.add({
        role: "assistant",
        content: completeMessage,
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
      });

      // 7. Retourneer het complete antwoord
      res.status(200).send('ready');
      //res.write(payload);
        
    } catch (error) {
      console.error("Error tijdens streaming:", error);
      res.status(500).send("Error tijdens streaming");
    }
  }
);

exports.backgroundAI = onRequest(
  { cors: config.allowed_cors, region: "europe-west1" },
  async (req: any, res: any) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");


    try {
      const body = req.body;
      if((!body.userId) || (!body.conversationId) || (!body.instructionType) || (!body.role) || (!body.categoryId)){
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
      let messages:any = []
      messages = await getPreviousMessages(body.userId, body.conversationId);
      if (!messages) {
        messages = [{content:'No other messages found'}];
      }

      messages = JSON.stringify(messages);
      // for(let i = 0; i < messages.length; i++){
      //   messageText = messageText + messages[i].content + '\n\n';
      // }

      let previousBackground:any = []
      previousBackground = await getPreviousMessages(body.userId, body.conversationId,'background');
      if (!previousBackground) {
        previousBackground = [{content:'No other background found'}];
      }
      previousBackground = JSON.stringify(messages);

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

      let systemContent = agent_instructions.systemContent.split("[role]").join(body.role).split("[category]").join(categoryData.title)
      systemContent = systemContent + '\n\n' + formats.format + '\n\n' + formats.instructions;
      
      let content = agent_instructions.content.split("[role]").join(body.role).split("[category]").join(categoryData.title)
      content = content.split('[background]').join(previousBackground).split('[messages]').join(messages);

      let sendMessages:any[] = []

      sendMessages.push({
        role: "system",
        content: systemContent,
      })

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

      const completeMessage = completion.choices[0].message.content;

      // 6. Sla het antwoord op in de database
      let messageRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/${body.instructionType}`);

      await messageRef.add({
        role: "assistant",
        content: completeMessage,
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
      });

      // 7. Retourneer het complete antwoord
      res.status(200).send('ready');
      //res.write(payload);
        
    } catch (error) {
      console.error("Error tijdens streaming:", error);
      res.status(500).send("Error tijdens streaming");
    }
  }
);

exports.phasesAI = onRequest(
  { cors: config.allowed_cors, region: "europe-west1" },
  async (req: any, res: any) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");


    try {
      const body = req.body;
      if((!body.userId) || (!body.conversationId) || (!body.instructionType) || (!body.role) || (!body.categoryId)){
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

      let messageText = '';
      for(let i = 1; i < messages.length; i++){
        messageText = messageText + messages[i].role + ': ' + cleanReactionMessage(messages[i].content) + '\n\n';
      }

      let feedback = []
      feedback = await getPreviousMessages(body.userId, body.conversationId,body.instructionType);
      if (!feedback) {
        feedback = [{content:`no ${body.instructionType} found`}];
      }

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


      let systemContent = agent_instructions.systemContent.split("[role]").join(body.role).split("[category]").join(categoryData.title)
      systemContent = systemContent.split(`[phases]`).join(JSON.stringify(categoryData['phaseList']));
      systemContent = systemContent.split(`[feedback]`).join(JSON.stringify(feedback));
      systemContent = systemContent + '\n\n' + formats.format + '\n\n' + formats.instructions;

      let messageRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/${body.instructionType}`);

      // await messageRef.add({
      //   role: "system",
      //   content: systemContent,
      //   timestamp: new Date().getTime(),
      // });

      let sendMessages:any[] = []

      sendMessages.push({
        role: "system",
        content: systemContent,
      })

      let content = agent_instructions.content.split("[role]").join(body.role).split("[category]").join(categoryData.title)
      content = content.split(`[messages]`).join(messageText);


      sendMessages.push({
        role: "user",
        content: content,
      })

      // await messageRef.add({
      //   role: "user",
      //   content: content,
      //   timestamp: new Date().getTime(),
      // });

      const completion = await openai.chat.completions.create({
        model: openAiModal,
        messages: sendMessages,
        temperature: agent_instructions.temperature,
        max_tokens: agent_instructions.max_tokens,
      });

      const completeMessage = completion.choices[0].message.content;

      await messageRef.add({
        role: "assistant",
        content: completeMessage,
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
      });

      // 7. Retourneer het complete antwoord
      res.status(200).send('ready');
      //res.write(payload);
        
    } catch (error) {
      console.error("Error tijdens streaming:", error);
      res.status(500).send("Error tijdens streaming");
    }
  }
);

exports.feedbackAI = onRequest(
  { cors: config.allowed_cors, region: "europe-west1" },
  async (req: any, res: any) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");


    try {
      const body = req.body;
      if((!body.userId) || (!body.conversationId) || (!body.instructionType) || (!body.role) || (!body.categoryId)){
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
      // let feedback = []
      // feedback = await getPreviousMessages(body.userId, body.conversationId,body.instructionType);
      // if (!feedback) {
      //   feedback = [{content:`no ${body.instructionType} found`}];
      // }

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


      let systemContent = agent_instructions.systemContent.split("[role]").join(body.role).split("[category]").join(categoryData.title)
      systemContent = systemContent.split(`[${body.instructionType}]`).join(JSON.stringify(categoryData[body.instructionType]));
      systemContent = systemContent + '\n\n' + formats.format + '\n\n' + formats.instructions;

      let messageRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/${body.instructionType}`);

      // await messageRef.add({
      //   role: "system",
      //   content: systemContent,
      //   timestamp: new Date().getTime(),
      // });

      let sendMessages:any[] = []

      sendMessages.push({
        role: "system",
        content: systemContent,
      })

      let content = agent_instructions.content.split("[role]").join(body.role).split("[category]").join(categoryData.title)
      content = content.split(`[messages]`).join(messageText);

      // await messageRef.add({
      //   role: "user",
      //   content: content,
      //   timestamp: new Date().getTime(),
      // });

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

      const completeMessage = completion.choices[0].message.content;

      await messageRef.add({
        role: "assistant",
        content: completeMessage,
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
      });

      // 7. Retourneer het complete antwoord
      res.status(200).send('ready');
      //res.write(payload);
        
    } catch (error) {
      console.error("Error tijdens streaming:", error);
      res.status(500).send("Error tijdens streaming");
    }
  }
);

exports.closingAI = onRequest(
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

      let content = agent_instructions.content.split('[messages').join(messageText);

      let goalsItems = conversationData['goalsItems'];
      let goals = ''
      if(goalsItems.attitude){
        goals = goals + '- Attitude: An attiude score higher or equal to ' + goalsItems.attitude + '\n\n';
      }
      if(goalsItems.free){
        goals = goals + '- Goal: '+ goalsItems.free+'\n\n';
      }
      if(goalsItems.phases?.length>0){
        
        let phases = []
        phases = await getPreviousMessages(body.userId, body.conversationId,'phases');
        if (!phases || phases.length == 0) {
          //phases = [{content:`no phases found`}];
        }
        else{
          let lastPhase:any = JSON.parse(phases[phases.length-1].content);
          goals = goals + '- Phases: \nGoal: The scores of the phases should be higher or equal to the following scores (in order of the phases of the conversation): ' + goalsItems.phases.join(', ') + '\n';
          goals = goals + 'Actual: ' + lastPhase.element_levels.map((phase:any) => phase.score).join(', ') + '\n\n';
        }
        
        
        
      }
      if(goals == ''){
        goals = 'No goals set for this conversation';
      }
      content = content.split('[goals]').join(goals);

      let messageRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/${body.instructionType}`);

      let sendMessages:any[] = []

      sendMessages.push({
        role: "system",
        content: systemContent,
      })

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

      const completeMessage = completion.choices[0].message.content;

      // await messageRef.add({
      //   role: "system",
      //   content: systemContent,
      //   timestamp: new Date().getTime(),
      // });

      // await messageRef.add({
      //   role: "user",
      //   content: content,
      //   timestamp: new Date().getTime(),
      // });

      await messageRef.add({
        role: "assistant",
        content: completeMessage,
        timestamp: new Date().getTime(),
      });

      messageRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/loading`);

      await messageRef.doc(body.instructionType).set({
        loading: false,
      })

      messageRef = db.collection(`users/${body.userId}/conversations/`);

      await messageRef.doc(body.conversationId).update({
        closed: new Date().getTime(),
      })

      let tokensRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/tokens`);
      await tokensRef.add({
        agent: body.instructionType,
        usage: completion.usage,
        timestamp: new Date().getTime(),
      });

      // 7. Retourneer het complete antwoord
      res.status(200).send('ready');
      //res.write(payload);
        
    } catch (error) {
      console.error("Error tijdens streaming:", error);
      res.status(500).send("Error tijdens streaming");
    }
  }
);

exports.promptCheckerAI = onRequest(
  { cors: config.allowed_cors, region: "europe-west1" },
  async (req: any, res: any) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
  
    const body = req.body;
    if((!body.userId) || (!body.input)){
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
    res.status(200).send('ready');
  }
)

exports.soundToTextAI = onRequest(
  { cors: config.allowed_cors, region: "europe-west1", maxRequestSize: '40mb' },

  async (req:any, res:any) => {
    try {
      const { userId, file } = req.body; // Haal de userId en base64-gecodeerde file op

      if (!userId || !file) {
        res.status(400).send("Missing required fields");
        return;
      }

      const buffer:any = Buffer.from(file, "base64");
      const filePath = path.join("/tmp", `audio-${Date.now()}.webm`);
      fs.writeFileSync(filePath, buffer);

      const fileStream = fs.createReadStream(filePath);
      const whisperResponse = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: fileStream,
        temperature: 0.3,
      });

      const transcription = whisperResponse.text;
      fs.unlinkSync(filePath);
      res.status(200).json({ transcription });
    } catch (error) {
      console.error("Error processing request:", error);
      res.status(500).send("Internal Server Error");
    }
  }

)

// exports.case_promptOud = onRequest(
//   { cors: config.allowed_cors, region: "europe-west1" },
//   async (req: any, res: any) => {
//     res.setHeader("Content-Type", "text/event-stream");
//     res.setHeader("Cache-Control", "no-cache");
//     res.setHeader("Connection", "keep-alive");


//     try {
//       const body = req.body;
//       if((!body.userId) || (!body.content)){
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

//       const [instructions,formats] = await Promise.all([
//         getInstructions('case_prompter'), 
//         getFormats('case_prompter')
//       ]);


//       let systemContent = instructions.systemContent
//       let content = instructions.content.split("[case_data]").join(body.content)
//       content = content + '\n\n' + formats.format + '\n\n' + formats.instructions;
      
//       let sendMessages: any[] = [
//         { role: "system", content: systemContent },
//         { role: "user", content: content },
//       ];

//       const completion = await openai.chat.completions.create({
//         model: openAiModal,
//         messages: sendMessages,
//         temperature: instructions.temperature,
//         max_tokens: instructions.max_tokens,
//       });

//       const completeMessage = completion.choices[0].message.content
//       res.status(200).send({content:completeMessage});
        
//     } catch (error) {
//       console.error("Error tijdens streaming:", error);
//       res.status(500).send("Error tijdens streaming");
//     }
//   }
// );

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
      })
      
      
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
        content: completeMessage,
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
      });

      // 7. Retourneer het complete antwoord
      res.status(200).send('ready');
      //res.write(payload);
        
    } catch (error) {
      console.error("Error tijdens streaming:", error);
      res.status(500).send("Error tijdens streaming");
    }
  }
);

async function initializeConversation(
  categoryId: string,
  caseId: string,
  startAttitude: number,
  instructionType: string,
  userId: string,
  data:any
): Promise<any[]> {
  try {
    const categoryRef = db.doc(`categories/${categoryId}`);
    let caseRef = db.doc(`cases/${caseId}`);
    if(data.trainerId){
      caseRef = db.doc(`cases_trainer/${caseId}`);
      console.log('trainer case');
    }
    console.log('trainerID: ' + data.trainerId);
    const [categorySnap, caseSnap, attitudes, positions, agent_instructions, userData,formats] = await Promise.all([
      categoryRef.get(),                  // Haal category op
      caseRef.get(),                      // Haal case op
      getAllAttitudes(),                  // Haal attitudes op
      getAllPositions(),                  // Haal positions op
      getAgentInstructions(instructionType,categoryId),   // Haal instructions op
      getUserInfo(userId)         ,        // Haal user info op
      getFormats(instructionType)
    ]);

    if (!categorySnap.exists || !caseSnap.exists) {
      throw new Error("Category or Case not found");
    }

    // const categoryData = categorySnap.data();
    const caseData = caseSnap.data();
    const attitudesText = JSON.stringify(attitudes);
    const positionsText = JSON.stringify(positions);
    

    let systemContent = agent_instructions.systemContent;
    systemContent = systemContent.split("[role]").join(caseData.role); 
    systemContent = systemContent.replace("[description]", caseData.description);
    if(caseData.steadfastness){
      systemContent = systemContent.replace("[steadfastness]", caseData.steadfastness.toString());
    }
    systemContent = systemContent.replace("[attitudes]", attitudesText);
    systemContent = systemContent.replace("[current_attitude]", startAttitude.toString());

    systemContent = systemContent.replace("[positions]", positionsText);
    systemContent = systemContent.replace("[current_position]", startAttitude.toString());

    systemContent = systemContent + "\n\n" + formats.format + '\n\n' + formats.instructions;

    if(caseData.casus){
      systemContent = systemContent + "\nDe casus voor de gebruiker is als volgt: " + caseData.casus;
    }

    if(caseData.interest_goals){
      systemContent = systemContent.replace("[interest_goals]", caseData.interest_goals);
    }

    if(agent_instructions.extra_info){
      systemContent = systemContent + "\n\n" + agent_instructions.extra_info;
    }

    

    let userMessage = ''
    if(data?.openingMessage){
      userMessage = data.openingMessage.split("[role]").join(caseData.role).split("[name]").join(userData.displayName);
    }
    if(!userMessage){
      userMessage = agent_instructions.content.split("[role]").join(caseData.role).split("[name]").join(userData.displayName);
    }

    // console.log('userMessage: ' + userMessage);


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
    const snapshot = await db.collection("categories").doc(categoryId).collection('agents').doc(type).get();
    if (!snapshot.exists) {
      console.warn(`Geen instructies gevonden voor type: ${type}`);
      return null;
    }
    return snapshot.data();
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