const { onRequest } = require("firebase-functions/v2/https");
// const fs = require("fs");
// const path = require("path");
// import * as responder from '../utils/responder'
import * as functions from 'firebase-functions/v1';
// const Imap = require("imap");
// const { simpleParser } = require("mailparser");
// const querystring = require('querystring');
// import { db } from "../firebase";
import openai from '../configs/config-openai';
// import { config } from '../configs/config-basics';
import sharp from "sharp";
import axios from "axios";
import admin from '../firebase'
// import * as Busboy from "busboy";
// import * as moment from 'moment';

const storage = admin.storage();
const openAiModal = 'gpt-4o';
const username_wp = 'blogwriter'
const password_wp = 'IJqh jaxT fcaO 8fWA rruK 7Uu4'

const allowedSenders = [
    "maarten@inspiratiereizen.nl","maarten@maartenoosterhoff.nl",
    "florian.bekkers@videadvies.nl",
    "mark.nierop@innovatieman.nl","mark@teamsupporter.nl"
]

// const linkedInOrganizationUrn = "urn:li:organization:5583111"

// const linkedInHeaders = {
//     "Content-Type": "application/json",
//     "X-Restli-Protocol-Version": "2.0.0",
//     "Linkedin-Version": 202411,
//     "authorization": "Bearer " + 'AQXEa6U_NE8H5NoZUd-mGMVRkCrtMn6-KCIx7CbLo3p1EZe3tjghDdLglmA8-eAvDkFrXANqP1NBazTtghNdW2UYBQr7hiS7Z1TAalL1LKWjr1e9jQauBz6CowGNOfi_aaT2E5fPg61SZJZqyxXyXMw80BL7ohQ8CBvkmJysL2kxpRjGglcCkizLz9f60bXJ-AsFoiNJKm-esgnqNalNHIp0LajPSQCCqukcmVFL4__LN6CazrOSIiQsbRZcJ3rZemGdS9PvHcW6EPL6lwnfKCo8047_tdvdR1rGPMaOHq0IQfLNMIKCa_Q4-3Lb_1WVN80Sn7gDYREZoPeGRNQl_oAQWvGKEw',
// }

// const linkedInToken = 'AQXEa6U_NE8H5NoZUd-mGMVRkCrtMn6-KCIx7CbLo3p1EZe3tjghDdLglmA8-eAvDkFrXANqP1NBazTtghNdW2UYBQr7hiS7Z1TAalL1LKWjr1e9jQauBz6CowGNOfi_aaT2E5fPg61SZJZqyxXyXMw80BL7ohQ8CBvkmJysL2kxpRjGglcCkizLz9f60bXJ-AsFoiNJKm-esgnqNalNHIp0LajPSQCCqukcmVFL4__LN6CazrOSIiQsbRZcJ3rZemGdS9PvHcW6EPL6lwnfKCo8047_tdvdR1rGPMaOHq0IQfLNMIKCa_Q4-3Lb_1WVN80Sn7gDYREZoPeGRNQl_oAQWvGKEw'
const db = admin.firestore();


exports.handleAiInboundEmail = onRequest(
    { region: 'europe-west1', maxInstances: 1, timeoutSeconds: 60 },
    async (req:any, res:any) => {
      try {
        if (req.method !== 'POST') {
          res.status(405).send('Method Not Allowed');
          return;
        }

        const body = req.body.toString()
        const boundary = 'xYzZY';

          const parts = body.split(`--${boundary}`);
          const fields:any = {};

        parts.forEach((part:any) => {
            const lines = part.split('\r\n');
            let fieldName:any = null;
            let fieldValue = '';
  
            lines.forEach((line:any) => {
              if (line.startsWith('Content-Disposition: form-data; name="')) {
                fieldName = line.match(/name="([^"]+)"/)[1];
              } else if (line === '') {
                // Lege regel, begin van de waarde
              } else if (fieldName) {
                fieldValue += line;
              }
            });
  
            if (fieldName) {
              fields[fieldName] = fieldValue;
            }
        });

        // check if from is allowed
        if(!fields.from){
            console.log('[SendGrid] Ongeldig afzender:', fields.from);
            res.status(200).send('OK');
            return;
        }
        let allowed = false
        for(let i=0;i<allowedSenders.length;i++){
            if(fields.from.toLowerCase().indexOf(allowedSenders[i])!==-1){
                allowed = true;
                break;
            }
        }

        if(fields.to&&fields.to.substring(0,8)=='trainer_'){
            await db.collection("mails_to_trainers").add({
                from: fields.from || null,
                to: fields.to || null,
                subject: fields.subject || null,
                date: Date.now(),
                email: fields.email || null,
            });
            console.log('[SendGrid] Mail to trainer opgeslagen:', fields.to);
            res.status(200).send('OK');
            return;
        }

        if(!allowed){
            console.log('[SendGrid] Ongeldig afzender:', fields.from);
            res.status(200).send('OK');
            return;
        }

        if(!fields.to || (fields.to.indexOf('social_writer@ai-inbound.alicialabs.com')===-1 && fields.to.indexOf('innovation@ai-inbound.alicialabs.com')===-1)){
            console.log('[SendGrid] Ongeldig e-mailadres:', fields.to);
            res.status(200).send('OK');
            return;
        }

        if(fields.to=='social_writer@ai-inbound.alicialabs.com'){
            await db.collection("social_writer_emails").add({
                from: fields.from || null,
                to: fields.to || null,
                subject: fields.subject || null,
                date: Date.now(),
                email: fields.email || null,
            });
        }

        else if(fields.to=='innovation@ai-inbound.alicialabs.com'){
            await db.collection("innovation_emails").add({
                from: fields.from || null,
                to: fields.to || null,
                subject: fields.subject || null,
                date: Date.now(),
                email: fields.email || null,
            });
        }

        res.status(200).send('OK');
      } catch (err) {
        console.error('[SendGrid] Fout:', err);
        res.status(200).send('OK');
        // res.status(500).send('Error');
      }
    }
  );
  

  exports.convertSocialEmails = functions.region('europe-west1')
  .runWith({memory:'1GB'}).firestore
  .document('social_writer_emails/{emailId}')
  .onCreate(async (change, context) => {
    let email = change.data();
    if (!email) return null;
    if(!email.email){return null;}
    
    let agentInfo:any = await getagentInfo('converter');

    let messages = setMessages(agentInfo.systemContent, email.email);
    let temperature = agentInfo.temperature;

    // let messages = setMessages('converter', email.email);
    // let temperature = 0.2;
    let response = await streamOpenAi(messages, temperature);
    if (response && response.choices && response.choices.length > 0) {
        const responseData = response.choices[0].message.content.split('```json').join('').split('```').join('');
        const jsonResponse = JSON.parse(responseData);
        jsonResponse.from = email.from;
        jsonResponse.to = email.to;
        jsonResponse.date = email.date;
        if(email.subject){
            jsonResponse.subject = email.subject;
        }

        await db.collection("socials_to_write").add(jsonResponse);
        await db.collection("social_writer_emails").doc(change.id).delete();
    }

    return null;
  })

  exports.convertInnovationEmails = functions.region('europe-west1')
  .runWith({memory:'1GB'}).firestore
  .document('innovation_emails/{emailId}')
  .onCreate(async (change, context) => {
    let email = change.data();
    if (!email) return null;
    if(!email.email){return null;}
    
    let agentInfo:any = await getagentInfo('converter');

    let messages = setMessages(agentInfo.systemContent, email.email);
    let temperature = agentInfo.temperature;

    // let messages = setMessages('converter', email.email);
    // let temperature = 0.2;
    let response = await streamOpenAi(messages, temperature);
    if (response && response.choices && response.choices.length > 0) {
        const responseData = response.choices[0].message.content.split('```json').join('').split('```').join('');
        const jsonResponse = JSON.parse(responseData);
        jsonResponse.from = email.from;
        jsonResponse.to = email.to;
        jsonResponse.date = email.date;
        if(email.subject){
            jsonResponse.subject = email.subject;
        }

        await db.collection("innovation_to_process").add(jsonResponse);
        await db.collection("innovation_emails").doc(change.id).delete();
    }

    return null;
  })

  exports.allocateSocialEmails = functions.region('europe-west1')
  .runWith({memory:'1GB'}).firestore
  .document('socials_to_write/{emailId}')
  .onCreate(async (change, context) => {
    let email = change.data();
    if (!email) return null;
    
    if(!email.text){return null}
    let agentInfo:any = await getagentInfo('allocator');

    let messages = setMessages(agentInfo.systemContent, email.text);
    let temperature = agentInfo.temperature;

    // let messages = setMessages('allocator', email.text);
    // let temperature = 0.6;
    let response = await streamOpenAi(messages, temperature);
    if (response && response.choices && response.choices.length > 0) {
        const responseData = response.choices[0].message.content.split('```json').join('').split('```').join('')
        const jsonResponse = JSON.parse(responseData);
        jsonResponse.from = email.from;
        jsonResponse.to = email.to;
        jsonResponse.date = email.date;
        if(email.subject){
            jsonResponse.subject = email.subject;
        }
        jsonResponse.status = 'new';

        await db.collection("socials_in_action").add(jsonResponse);
        await db.collection("socials_to_write").doc(change.id).delete();
    }

    return null;
  })

  exports.allocateSInnovationEmails = functions.region('europe-west1')
  .runWith({memory:'1GB'}).firestore
  .document('innovation_to_process/{emailId}')
  .onCreate(async (change, context) => {
    let email = change.data();
    if (!email) return null;
    
    if(!email.text){return null}
    let agentInfo:any = await getagentInfo('innovation_allocator');

    let messages = setMessages(agentInfo.systemContent, email.text);
    let temperature = agentInfo.temperature;

    // let messages = setMessages('allocator', email.text);
    // let temperature = 0.6;
    let response = await streamOpenAi(messages, temperature);
    if (response && response.choices && response.choices.length > 0) {
        const responseData = response.choices[0].message.content.split('```json').join('').split('```').join('')
        const jsonResponse = JSON.parse(responseData);
        jsonResponse.from = email.from;
        jsonResponse.to = email.to;
        jsonResponse.date = email.date;
        if(email.subject){
            jsonResponse.subject = email.subject;
        }
        jsonResponse.status = 'new';

        await db.collection("innovation_in_action").add(jsonResponse);
        await db.collection("innovation_to_process").doc(change.id).delete();
    }

    return null;
  })

  exports.createSocials = functions.region('europe-west1')
  .runWith({memory:'4GB'}).firestore
  .document('socials_in_action/{socialId}')
  .onWrite(async (change, context) => {
    let newData = change.after.data();
    let oldData = change.before.data();
    if (!newData && !oldData) return null;
    if (!newData) return null;
    let newSocial:boolean = true

    if(newData.status!='new' || oldData?.status=='new'){
        newSocial = false;
    }
    let messages:any = []
    let response :any = null
    let output:any = null
    if(newSocial){
        if(newData.medium?.toLowerCase()=='blog'){
            console.log('Blog writer')

            let agentInfo:any = await getagentInfo('blog_writer');

            messages = setMessages(agentInfo.systemContent, newData.prompt);
            let temperature = agentInfo.temperature;
            response = await streamOpenAi(messages, temperature);
            try{

                if (response && response.choices && response.choices.length > 0) {
                    const responseData = response.choices[0].message.content.split('```json').join('').split('```').join('')
                    const jsonResponse = JSON.parse(responseData);
                    jsonResponse.status = 'text created';
                    output = jsonResponse;
                }
            }
            catch (error){
                console.log('Error:', error);
                console.log('Response:', response.choices[0].message.content)
                output = {
                    status: 'error',
                }
            }
        }
        else if(newData.medium?.toLowerCase()=='linkedin'){
            console.log('LinkedIn writer')

            let agentInfo:any = await getagentInfo('linkedin_writer');

            messages = setMessages(agentInfo.systemContent, newData.prompt);
            let temperature = agentInfo.temperature;
            response = await streamOpenAi(messages, temperature);
            try{

                if (response && response.choices && response.choices.length > 0) {
                    let responseData = response.choices[0].message.content.split('```json').join('').split('```').join('').trim()
                    if(responseData.substring(0, 1)!='{'){
                        let firstAccolade = responseData.indexOf('{');
                        responseData = responseData.substring(firstAccolade);
                    }
                    const jsonResponse = JSON.parse(responseData);
                    jsonResponse.status = 'text created';
                    output = jsonResponse;
                }
            }
            catch (error){
                console.log('Error:', error);
                console.log('Response:', response.choices[0].message.content)
                output = {
                    status: 'error',
                }
            }
        }
    }
    else{
        if(change.after.data().medium.toLowerCase()=='blog'){
            if(change.after.data().status=='text created' && change.before.data().status!=='text created'){
                if(!change.after.data().image){
                    let agentInfo:any = await getagentInfo('image_creator_blog');
                    let image = await createImage(change.after.data().english_summary, agentInfo.systemContent);
                    let imageUrl = await saveImage(image);
                    output = {
                        status: 'image created',
                        image: imageUrl,
                    }
                }
                else{
                    output = {
                        status: 'image created',
                    }
                }
            }
            else if(change.after.data().status=='image created' && change.before.data().status!=='image created'){
                let content = change.after.data().content;
                content = content.replace(/<h3>/g, '<h3 style="font-family: Arial, sans-serif;font-size: 18px; margin-top:20px;">');
                content = `<img src="${change.after.data().image}" style="width: 100%; height: auto; max-width: 600px; margin: 0 auto; display: block;" alt="Blog Image;margin-bottom:30px" />` + content;
                content = `<h2 style="font-family: Arial, sans-serif;font-size: 22px; margin-top:20px;">${change.after.data().title}</h2>` + content;

                sendVerification(change.after.data().medium, content, 'mark@innovatieman.nl', 'Mark', change.after.id);
                output = {
                    status: 'verification pending',
                }
                
            }
            else if(change.after.data().status=='verification successful' && change.before.data().status!=='verification successful'){
                
                let url = 'https://alicialabs.com/wp-json/mijnplugin/v1/post-blog';
                // 'Authorization Basic auth

                let headers =  {
                    "Content-Type": "application/json",
                    "Authorization": "Basic " + Buffer.from(`${username_wp}:${password_wp}`).toString("base64"),
                }
                
                let data = {
                    "title": change.after.data().title,
                    "content": change.after.data().content,
                    "author": 1,
                    "featured_image": change.after.data().image,
                    "categories": [6],
                    "excerpt": change.after.data().summary,
                  }

                response = await postApi(url, data, headers);
                output = {
                    status: 'posted',
                    post_url: response.link,
                }
            }
        }
        else if(change.after.data().medium.toLowerCase()=='linkedin'){
            if(change.after.data().status=='text created' && change.before.data().status!=='text created'){
                if(!change.after.data().image){
                    let agentInfo:any = await getagentInfo('image_creator_linkedin');
                    let image = await createImage(change.after.data().content, agentInfo.systemContent);
                    let imageUrl = await saveImage(image);
                    output = {
                        status: 'image created',
                        image: imageUrl,
                    }
                }
                else{
                    output = {
                        status: 'image created',
                    }
                }
            }
            else if(change.after.data().status=='image created' && change.before.data().status!=='image created'){
                let content = change.after.data().content;
                content = content.replace(/<h3>/g, '<h3 style="font-family: Arial, sans-serif;font-size: 18px; margin-top:20px;">');
                content = `<img src="${change.after.data().image}" style="width: 100%; height: auto; max-width: 600px; margin: 0 auto; display: block;" alt="Blog Image;margin-bottom:30px" />` + content;
                content = `<h2 style="font-family: Arial, sans-serif;font-size: 22px; margin-top:20px;">${change.after.data().title}</h2>` + content;

                sendVerification(change.after.data().medium, content, 'mark@innovatieman.nl', 'Mark', change.after.id);
                output = {
                    status: 'verification pending',
                }
                
            }
            // else if(change.after.data().status=='verification successful' && change.before.data().status!=='verification successful'){
                

            //     let initialResponseLinkedIn = await linkedInInitialize(linkedInHeaders);
            //     let uploadUrl = linkedUploadImage(linkedInHeaders, initialResponseLinkedIn.value.uploadUrl, change.after.data().image);


            //     let url = 'https://api.linkedin.com/v2/ugcPosts';
            //     // 'Authorization Basic auth

            //     let headers =  {
            //         "Content-Type": "application/json",
            //         "Authorization": "Bearer " + process.env.LINKEDIN_TOKEN,
            //         "Linkedin-Version": 202411
            //     }
                
            //     let data = {
            //         "author": "urn:li:person:nMYeZe8_Kk",
            //         "lifecycleState": "PUBLISHED",
            //         "specificContent": {
            //             "com.linkedin.ugc.ShareContent": {
            //                 "shareCommentary": {
            //                     "text": change.after.data().title + '\n\n' + change.after.data().content
            //                 },
            //                 "shareMediaCategory": "ARTICLE",
            //                 "media": [
            //                     {
            //                         "status": "READY",
            //                         "description": {
            //                             "text": "Official LinkedIn Blog - Your source for insights and information about LinkedIn."
            //                         },
            //                         "originalUrl": "https://blog.linkedin.com/",
            //                         "title": {
            //                             "text": "Official LinkedIn Blog"
            //                         }
            //                     }
            //                 ]
            //             }
            //         },
            //         "visibility": {
            //             "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            //         }
            //     }

            //     // response = await postApi(url, data, headers);
            //     // output = {
            //     //     status: 'posted',
            //     //     post_url: response.link,
            //     // }
            // }
        }
    }


    if(output){
        await db.collection("socials_in_action").doc(change.after.id).update(output)
    }
    

    return null;
  })

  exports.createInnovation = functions.region('europe-west1')
  .runWith({memory:'4GB'}).firestore
  .document('innovation_in_action/{socialId}')
  .onWrite(async (change, context) => {
    let newData = change.after.data();
    let oldData = change.before.data();
    if (!newData && !oldData) return null;
    if (!newData) return null;
    let newItem:boolean = true

    if(newData.status!='new' || oldData?.status=='new'){
        newItem = false;
    }
    let messages:any = []
    let response :any = null
    let output:any = null
    if(newItem){
        if(newData.fase?.toLowerCase()=='moddergooien'){
            console.log('Moddergooien')

            let agentInfo:any = await getagentInfo('mud_thrower');

            messages = setMessages(agentInfo.systemContent, newData.prompt);
            let temperature = agentInfo.temperature;
            response = await streamOpenAi(messages, temperature);
            try{

                if (response && response.choices && response.choices.length > 0) {
                    const responseData = response.choices[0].message.content.split('```json').join('').split('```').join('')
                    const jsonResponse = JSON.parse(responseData);
                    jsonResponse.status = 'mud thrown';
                    output = jsonResponse;
                }
            }
            catch (error){
                console.log('Error:', error);
                console.log('Response:', response.choices[0].message.content)
                output = {
                    status: 'error',
                }
            }
        }
        // else if(newData.fase?.toLowerCase()=='linkedin'){
        //     console.log('LinkedIn writer')

        //     let agentInfo:any = await getagentInfo('linkedin_writer');

        //     messages = setMessages(agentInfo.systemContent, newData.prompt);
        //     let temperature = agentInfo.temperature;
        //     response = await streamOpenAi(messages, temperature);
        //     try{

        //         if (response && response.choices && response.choices.length > 0) {
        //             const responseData = response.choices[0].message.content.split('```json').join('').split('```').join('')
        //             const jsonResponse = JSON.parse(responseData);
        //             jsonResponse.status = 'text created';
        //             output = jsonResponse;
        //         }
        //     }
        //     catch (error){
        //         console.log('Error:', error);
        //         console.log('Response:', response.choices[0].message.content)
        //         output = {
        //             status: 'error',
        //         }
        //     }
        // }
    }
    else{
        if(change.after.data().fase.toLowerCase()=='moddergooien'){
            if(change.after.data().status=='mud thrown' && change.before.data().status!=='mud thrown'){
                if(!change.after.data().image){
                    let agentInfo:any = await getagentInfo('image_creator_blog');
                    let image = await createImage(change.after.data().english_summary, agentInfo.systemContent);
                    let imageUrl = await saveImage(image);
                    output = {
                        status: 'image created',
                        image: imageUrl,
                    }
                }
                else{
                    output = {
                        status: 'image created',
                    }
                }
            }
            else if(change.after.data().status=='image created' && change.before.data().status!=='image created'){
                let content = change.after.data().content;
                content = content.replace(/<h3>/g, '<h3 style="font-family: Arial, sans-serif;font-size: 18px; margin-top:20px;">');
                content = `<img src="${change.after.data().image}" style="width: 100%; height: auto; max-width: 600px; margin: 0 auto; display: block;" alt="Blog Image;margin-bottom:30px" />` + content;
                content = `<h2 style="font-family: Arial, sans-serif;font-size: 22px; margin-top:20px;">${change.after.data().title}</h2>` + content;

                sendVerification(change.after.data().medium, content, 'mark@innovatieman.nl', 'Mark', change.after.id);
                output = {
                    status: 'verification pending',
                }
                
            }
            else if(change.after.data().status=='verification successful' && change.before.data().status!=='verification successful'){
                
                let url = 'https://alicialabs.com/wp-json/mijnplugin/v1/post-blog';
                // 'Authorization Basic auth

                let headers =  {
                    "Content-Type": "application/json",
                    "Authorization": "Basic " + Buffer.from(`${username_wp}:${password_wp}`).toString("base64"),
                }
                
                let data = {
                    "title": change.after.data().title,
                    "content": change.after.data().content,
                    "author": 1,
                    "featured_image": change.after.data().image,
                    "categories": [6],
                    "excerpt": change.after.data().summary,
                  }

                response = await postApi(url, data, headers);
                output = {
                    status: 'posted',
                    post_url: response.link,
                }
            }
        }
        else if(change.after.data().medium.toLowerCase()=='linkedin'){
            if(change.after.data().status=='text created' && change.before.data().status!=='text created'){
                if(!change.after.data().image){
                    let agentInfo:any = await getagentInfo('image_creator_linkedin');
                    let image = await createImage(change.after.data().content, agentInfo.systemContent);
                    let imageUrl = await saveImage(image);
                    output = {
                        status: 'image created',
                        image: imageUrl,
                    }
                }
                else{
                    output = {
                        status: 'image created',
                    }
                }
            }
            else if(change.after.data().status=='image created' && change.before.data().status!=='image created'){
                let content = change.after.data().content;
                content = content.replace(/<h3>/g, '<h3 style="font-family: Arial, sans-serif;font-size: 18px; margin-top:20px;">');
                content = `<img src="${change.after.data().image}" style="width: 100%; height: auto; max-width: 600px; margin: 0 auto; display: block;" alt="Blog Image;margin-bottom:30px" />` + content;
                content = `<h2 style="font-family: Arial, sans-serif;font-size: 22px; margin-top:20px;">${change.after.data().title}</h2>` + content;

                sendVerification(change.after.data().medium, content, 'mark@innovatieman.nl', 'Mark', change.after.id);
                output = {
                    status: 'verification pending',
                }
                
            }
            // else if(change.after.data().status=='verification successful' && change.before.data().status!=='verification successful'){
                

            //     let initialResponseLinkedIn = await linkedInInitialize(linkedInHeaders);
            //     let uploadUrl = linkedUploadImage(linkedInHeaders, initialResponseLinkedIn.value.uploadUrl, change.after.data().image);


            //     let url = 'https://api.linkedin.com/v2/ugcPosts';
            //     // 'Authorization Basic auth

            //     let headers =  {
            //         "Content-Type": "application/json",
            //         "Authorization": "Bearer " + process.env.LINKEDIN_TOKEN,
            //         "Linkedin-Version": 202411
            //     }
                
            //     let data = {
            //         "author": "urn:li:person:nMYeZe8_Kk",
            //         "lifecycleState": "PUBLISHED",
            //         "specificContent": {
            //             "com.linkedin.ugc.ShareContent": {
            //                 "shareCommentary": {
            //                     "text": change.after.data().title + '\n\n' + change.after.data().content
            //                 },
            //                 "shareMediaCategory": "ARTICLE",
            //                 "media": [
            //                     {
            //                         "status": "READY",
            //                         "description": {
            //                             "text": "Official LinkedIn Blog - Your source for insights and information about LinkedIn."
            //                         },
            //                         "originalUrl": "https://blog.linkedin.com/",
            //                         "title": {
            //                             "text": "Official LinkedIn Blog"
            //                         }
            //                     }
            //                 ]
            //             }
            //         },
            //         "visibility": {
            //             "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            //         }
            //     }

            //     // response = await postApi(url, data, headers);
            //     // output = {
            //     //     status: 'posted',
            //     //     post_url: response.link,
            //     // }
            // }
        }
    }


    if(output){
        await db.collection("socials_in_action").doc(change.after.id).update(output)
    }
    

    return null;
  })

async function streamOpenAi(messages:any, temperature:any) {
return await openai.chat.completions.create({
    model: openAiModal,
    messages: messages,
    temperature: temperature,
    max_tokens: 16000,
    stream: false,
});
}


async function createImage(summary:string,systemContent:string){
    // let prompt = `
    // Create a modern, clean, and minimalist digital illustration that visually represents the blog story: “[SUMMARY]”. The image should subtly reflect the concept of practicing conversations with AI conversation partners, showing elements of human-AI interaction, learning, or personal growth. Use a light, futuristic aesthetic with white space and soft blue, purple, or pink accents. Optionally include abstract speech bubbles, digital lines, or subtle AI motifs. Avoid cliché robot imagery. The image must be visually appealing for both blog and social media use.
    // `
    let prompt = systemContent.replace('[CONTENT]', summary)
    
    const completion = await openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        quality: 'standard',
        n: 1,
        size: "1024x1024",
      });

      const imageUrl = completion.data[0].url;
      return imageUrl
}

async function getagentInfo(agent:string){
    let agentsContent:any = await db.collection('social_agents').doc(agent).get();
    if(!agentsContent.exists){
        console.log('Agent not found');
        return null;
    }
    agentsContent = agentsContent.data();
    if(!agentsContent){
        console.log('Agent not found');
        return null;
    }
    return agentsContent;
}


function setMessages(systemContent:string,content:string){

    let messages = [
        {
            role: "system",
            content: systemContent
        },
        {
            role: "user",
            content: content
        }
    ]
    return messages;

}

async function postApi(url:string, data:any, headers:any) {
    try {
        const response = await axios.post(url, data, { headers });
        return response.data;
    } catch (error) {
        console.error('Error in postApi:', error);
        throw error;
    }
}

async function saveImage(imageUrl:string){

    let imageData:any
    imageData = await axios.get(imageUrl, { responseType: 'arraybuffer' });

    const imageBuffer = Buffer.from(imageData.data, "binary");
    const webpBuffer = await sharp(imageBuffer).webp().toBuffer();
    const fileName = `temp-social-images/${Date.now()}.webp`;
    const bucket = storage.bucket('lwai-3bac8.firebasestorage.app');
    const file = bucket.file(fileName);

    await file.save(webpBuffer, {
    metadata: {
        contentType: "image/webp",
    },
    });

    await file.makePublic();

    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
}

function sendVerification(medium:string,content:string,email:string,displayName:string,id:string){

    let buttons:string = ''
    buttons = `
    <a href="https://conversation.alicialabs.com/verifysocial/${id}/success" style="background-color: #2dd55b; color: black; padding: 10px 20px; text-align: center; text-decoration: none; display: block;border-radius:16px font-size: 16px; margin: 4px 2px; cursor: pointer;">Akkoord, Plaats hem maar</a><br>
    <a href="https://conversation.alicialabs.com/verifysocial/${id}/rebuild_photo" style="background-color: #ffc409; color: black; padding: 10px 20px; text-align: center; text-decoration: none; display: block;border-radius:16px font-size: 16px; margin: 4px 2px; cursor: pointer;">Tekst goed, foto niet</a><br>
    <a href="https://conversation.alicialabs.com/verifysocial/${id}/rebuild_text" style="background-color: #ffc409; color: black; padding: 10px 20px; text-align: center; text-decoration: none; display: block;border-radius:16px font-size: 16px; margin: 4px 2px; cursor: pointer;">Tekst niet goed, foto wel</a><br>
    <a href="https://conversation.alicialabs.com/verifysocial/${id}/rebuild" style="background-color: #f44336; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: block;border-radius:16px font-size: 16px; margin: 4px 2px; cursor: pointer;">Maak helemaal op nieuw</a><br>
    <a href="https://conversation.alicialabs.com/verifysocial/${id}/edit" style="background-color: white; border:solid 1px black; color: black; padding: 10px 20px; text-align: center; text-decoration: none; display: block;border-radius:16px font-size: 16px; margin: 4px 2px; cursor: pointer;">Ik wil zelf iets aanpassen</a><br>
    <a href="https://conversation.alicialabs.com/verifysocial/${id}/cancel" style="background-color: #2f2f2f; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: block;border-radius:16px font-size: 16px; margin: 4px 2px; cursor: pointer;">Laat maar zitten</a><br>
    `
    const emailData = {
        to: email,
        template: 'check_social',
        language: 'nl',
        data: {
            name: displayName,
            medium: medium,
            content: content.split('\n').join('<br>'),
            buttons: buttons,
        }
      };
    
      admin.firestore().collection('emailsToProcess').add(emailData);
}

// async function linkedInInitialize(headers:any){
//     let url = 'https://api.linkedin.com/rest/images?action=initializeUpload';

//     const response = await axios.post(url, {
//         "initializeUploadRequest": {
//               "owner": "urn:li:organization:5583111"
//         }
//       }, { headers });
//     return response.data;
// }

// async function linkedUploadImage(headers:any,uploadUrl:string, image:any){
//     // Download en direct uploaden
//     let imageResponse = await axios({
//         method: "get",
//         url: image,
//         responseType: "stream",
//     })
     
//     let uploadResponse = await axios.put(uploadUrl, imageResponse.data, {
//         headers: headers
//     });

//     return uploadResponse;
// }

// async function linkedInFinalUpload(headers:any,content:string,assetUrn:string){
//     let url = 'https://api.linkedin.com/rest/posts';
//     let obj:any = {
//         author: linkedInOrganizationUrn,
//         commentary: content,
//         visibility: "PUBLIC",
//         distribution: {
//           feedDistribution: "MAIN_FEED",
//           targetEntities: [],
//           thirdPartyDistributionChannels: [],
//         },
//         lifecycleState: "PUBLISHED",
//         isReshareDisabledByAuthor: false,
//         content: {
//           media: [
//             {
//               status: "READY",
//               media: assetUrn,
//               title: {
//                 text: "Afbeelding bij bericht",
//               },
//             },
//           ],
//         },
//       }
    

//     const response = await axios.post(url, obj, { headers });
//     return response.data;
// }