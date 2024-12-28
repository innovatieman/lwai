const { onRequest } = require("firebase-functions/v2/https");
import { db } from "../firebase";
import openai from '../configs/config-openai';
import { config } from '../configs/config-basics';
// import { ChatCompletionMessageParam } from 'openai/resources';

// exports.test4 = onRequest(
//   { cors: config.allowed_cors, region: "europe-west1" },
//   async (req:any, res:any) => {
//     res.setHeader("Content-Type", "text/event-stream");
//     res.setHeader("Cache-Control", "no-cache");
//     res.setHeader("Connection", "keep-alive");

//     try {
//       const { prompt } = req.body;

//       if (!prompt) {
//         res.status(400).send("Missing 'prompt' in request body");
//         return;
//       }

//       let system_role_content = "je bent aardig";

//       let messages:ChatCompletionMessageParam[] = [
//         { role: "system", content: system_role_content },
//         { role: "user", content: prompt },
//       ];

//       const stream = await openai.chat.completions.create({
//         model: "gpt-4-turbo",
//         messages: messages,
//         temperature: 0.7,
//         max_tokens: 512,
//         stream: true,
//       });

//       for await (const chunk of stream) {
//         const payload = chunk.choices[0]?.delta?.content;
//         if (payload) {
//           res.write(payload); 
//         }
//       }
//       res.end();
//     } catch (error) {
//       console.error("Error tijdens streaming:", error);
//       res.status(500).send("Error tijdens streaming");
//     }
//   }
// );


exports.chatAI = onRequest( 
  { cors: config.allowed_cors, region: "europe-west1" },
  async (req: any, res: any) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");


    try {
      // const { prompt, userId, conversationId, categoryId, caseId, instructionType, attitude } = req.body;
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
        messages = await initializeConversation(body.categoryId, body.caseId, body.attitude, body.instructionType, body.userId);
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

      // 5. Start streaming OpenAI-antwoord
      const stream = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: messages,
        temperature: 0.7,
        max_tokens: 3000,
        stream: true,
      });
      
      let completeMessage = '';
      for await (const chunk of stream) {
        const payload = chunk.choices[0]?.delta?.content;
        if (payload) {
          res.write(payload);
          completeMessage = completeMessage + payload;
        }
      }
      res.end();
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
      
    } catch (error) {
      console.error("Error tijdens streaming:", error);
      res.status(500).send("Error tijdens streaming");
    }
  }
);


exports.conversationAIDirect = onRequest(
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
        return res.status(400).send("No previous messages found");
      }

      const categoryRef = db.doc(`categories/${body.categoryId}`);

      const [instructions, categorySnap] = await Promise.all([
        getInstructions(body.instructionType), 
        categoryRef.get(), 
      ]);

    if (!categorySnap.exists) {
      throw new Error("Category not found");
    }

      const categoryData = categorySnap.data();


      let content = instructions.content.split("[role]").join(body.role).split("[category]").join(categoryData.title);
      content = content.split('[message]').join(cleanReactionMessage(messages[messages.length-1].content));
      content = content + '\n\n' + instructions.format;
      // content = content + '\n\n' + JSON.stringify(messagesToConversationString(messages,body.role));

      // res.write(content+'\n\n');

      let messageRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/${body.instructionType}`);
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
          role: "user",
          content: content,
        })
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: sendMessages,
        temperature: 0.7,
        max_tokens: 3000,
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
      let messages = []
      messages = await getPreviousMessages(body.userId, body.conversationId,'facts');
      if (!messages) {
        messages = [{content:'no facts found'}];
      }

      let messageText = '';
      for(let i = 0; i < messages.length; i++){
        messageText = messageText + messages[i].content + '\n\n';
      }


      const categoryRef = db.doc(`categories/${body.categoryId}`);

      const [instructions, categorySnap] = await Promise.all([
        getInstructions(body.instructionType), 
        categoryRef.get(), 
      ]);

      if (!categorySnap.exists) {
        throw new Error("Category not found");
      }

      const categoryData = categorySnap.data();


      let content = instructions.content.split("[role]").join(body.role).split("[category]").join(categoryData.title)
      content = content.split('[facts]').join(messageText);
      content = content + '\n\n' + instructions.format;


      // messageRef.add({
      //   role: "user",
      //   content: content,
      //   timestamp: new Date().getTime(),
      // });

      let sendMessages:any[] = []

      sendMessages.push({
        role: "user",
        content: content,
      })

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: sendMessages,
        temperature: 0.7,
        max_tokens: 500,
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

      const [instructions, categorySnap] = await Promise.all([
        getInstructions(body.instructionType), 
        categoryRef.get(), 
      ]);

      if (!categorySnap.exists) {
        throw new Error("Category not found");
      }

      const categoryData = categorySnap.data();


      let systemContent = instructions.systemContent.split("[role]").join(body.role).split("[category]").join(categoryData.title)
      systemContent = systemContent.split(`[${body.instructionType}]`).join(JSON.stringify(categoryData[body.instructionType]));
      systemContent = systemContent.split(`[feedback]`).join(JSON.stringify(feedback));
      systemContent = systemContent + '\n\n' + instructions.format;

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

      let content = instructions.content.split("[role]").join(body.role).split("[category]").join(categoryData.title)
      content = content.split(`[conversation]`).join(messageText);


      sendMessages.push({
        role: "user",
        content: content,
      })

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: sendMessages,
        temperature: 0.2,
        max_tokens: 1000,
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

      const [instructions, categorySnap] = await Promise.all([
        getInstructions(body.instructionType), 
        categoryRef.get(), 
      ]);

      if (!categorySnap.exists) {
        throw new Error("Category not found");
      }

      const categoryData = categorySnap.data();


      let systemContent = instructions.systemContent.split("[role]").join(body.role).split("[category]").join(categoryData.title)
      systemContent = systemContent.split(`[${body.instructionType}]`).join(JSON.stringify(categoryData[body.instructionType]));
      systemContent = systemContent + '\n\n' + instructions.format;

      let messageRef = db.collection(`users/${body.userId}/conversations/${body.conversationId}/${body.instructionType}`);

      await messageRef.add({
        role: "system",
        content: systemContent,
        timestamp: new Date().getTime(),
      });

      let sendMessages:any[] = []

      sendMessages.push({
        role: "system",
        content: systemContent,
      })

      let content = instructions.content.split("[role]").join(body.role).split("[category]").join(categoryData.title)
      content = content.split(`[conversation]`).join(messageText);

      await messageRef.add({
        role: "user",
        content: content,
        timestamp: new Date().getTime(),
      });

      sendMessages.push({
        role: "user",
        content: content,
      })

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: sendMessages,
        temperature: 0.2,
        max_tokens: 1000,
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
  userId: string
): Promise<any[]> {
  try {
    const categoryRef = db.doc(`categories/${categoryId}`);
    const caseRef = db.doc(`cases/${caseId}`);

    const [categorySnap, caseSnap, attitudes, instructions, userData] = await Promise.all([
      categoryRef.get(),                  // Haal category op
      caseRef.get(),                      // Haal case op
      getAllAttitudes(),                  // Haal attitudes op
      getInstructions(instructionType),   // Haal instructions op
      getUserInfo(userId)                 // Haal user info op
    ]);

    if (!categorySnap.exists || !caseSnap.exists) {
      throw new Error("Category or Case not found");
    }

    const categoryData = categorySnap.data();
    const caseData = caseSnap.data();
    const attitudesText = JSON.stringify(attitudes);
    

    let systemContent = categoryData.systemContent;
    systemContent = systemContent.split("[role]").join(caseData.role); 
    systemContent = systemContent.replace("[description]", caseData.description);
    if(caseData.steadfastness){
      systemContent = systemContent.replace("[steadfastness]", caseData.steadfastness.toString());
    }
    systemContent = systemContent.replace("[attitudes]", attitudesText);
    systemContent = systemContent.replace("[current_attitude]", startAttitude.toString());
    systemContent = systemContent + '\n\n' + instructions.format;

    if(caseData.casus){
      systemContent = systemContent + "\nDe casus is als volgt: " + caseData.casus;
    }

    if(categoryData.extra_info){
      systemContent = systemContent + "\n\n" + categoryData.extra_info;
    }

    let userMessage = caseData.openingMessage.split("[role]").join(caseData.role).split("[name]").join(userData.displayName);
    if(!userMessage){
      userMessage = categoryData.openingMessage.split("[role]").join(caseData.role).split("[name]").join(userData.displayName);
    }
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

async function getInstructions(type: string): Promise<{ [key: string]: any } | null> {
  // console.log('instructions' + type)
  try {
    const snapshot = await db.collection("instructions").doc(type).get();
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

async function checkUserSubscription(userId: string): Promise<boolean> {
  try {
    const subscriptionRef = db.collection(`users/${userId}/subscriptions`);
    const snapshot = await subscriptionRef.get();
    if (snapshot.empty) return false;

    // Controleer op specifieke abonnementsvoorwaarden
    const validSubscriptions = snapshot.docs.filter((doc) => {
      const data = doc.data();
      return data.status=='active' && (data.type === "premium" || data.type === "trial"); // Pas dit aan naar jouw logica
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
  cleanMessageArr.splice(0,1);
  let reaction = cleanMessageArr.join(', reaction:');
  return reaction;
}