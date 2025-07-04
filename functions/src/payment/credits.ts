import admin from '../firebase'
import * as functions from 'firebase-functions/v1';
import * as responder from '../utils/responder'
import moment from 'moment';
import { config } from '../configs/config-basics';
import Stripe from "stripe";
const stripe = new Stripe(config.stripe.live_secret_key);



// exports.buyCredits = functions.region('europe-west1').https.onCall(async (data: any, context: any) => {
//     // Check op authenticatie
//     if (!context.auth) {
//         return new responder.Message('Not authorized', 401);
//     }

//     // Check op het bedrag
//     if (!data.amount) {
//         return new responder.Message('No amount provided', 400);
//     }

//     try {
//         // Haal de gebruiker op
//         const doc = await admin.firestore().collection('users').doc(context.auth.uid).get();
//         let user = doc.data();

//         if (!user) {
//             return new responder.Message('User not found', 404);
//         }

//         // Zet credits op 0 als het ontbreekt
//         if (!user.credits) {
//             user.credits = 0;
//         }

//         // Update de credits
//         user.credits += data.amount;
//         await admin.firestore().collection('users').doc(context.auth.uid).update(user);

//         // Voeg de transactie toe
//         await admin.firestore().collection('users').doc(context.auth.uid).collection('transactions').add({
//             type: 'credit_purchase',
//             amount: data.amount,
//             timestamp: admin.firestore.FieldValue.serverTimestamp(),
//             user: context.auth.uid,
//             status: 'success',
//             paymentMethod: {
//                 type: 'credit card',
//             },
//             valid_until: admin.firestore.Timestamp.fromDate(
//                 new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 30)
//             ),
//         });

//         return new responder.Message('Success');
//     } catch (e) {
//         console.error(e);
//         return new responder.Message('Error', 500);
//     }
// });

exports.creditsBought = functions.region('europe-west1').firestore
  .document('customers/{userId}/payments/{paymentId}')
  .onCreate(async (snap:any, context:any) => {
    console.log('Payment created');
    let payment = snap.data();
    if(payment.status == 'succeeded' && payment.description !== 'Subscription creation' && payment.items?.length > 0 && payment.items[0].price){
        await admin.firestore().collection('processed_payments').doc(context.params.paymentId).set({processed: true});

        const product = await admin.firestore().collection('products').doc(payment.items[0].price.product).get();
        const productData = product.data();

        if(productData.metadata.credits){
            if(productData.metadata.trainingId){
                await addCreditsToTraining(context.params.userId, productData);
            }
            else{
                await addCreditsToUser(context.params.userId, productData);
            }
        }
        else if(productData.metadata.type=='course'){
            await addCourseToUser(context.params.userId, payment.items[0].price.product);
        }
    }
    
  });

  exports.creditsBoughtUpdated = functions.region('europe-west1').firestore
  .document('customers/{userId}/payments/{paymentId}')
  .onUpdate(async (change:any, context:any) => {
    console.log('Payment created');
    let payment = change.after.data();
    if(payment.status == 'succeeded' && payment.description !== 'Subscription creation' && payment.items?.length > 0 && payment.items[0].price){
        const processedPayment = await admin.firestore().collection('processed_payments').doc(context.params.paymentId).get();
        if(processedPayment.exists){
            return;
        }
        await admin.firestore().collection('processed_payments').doc(context.params.paymentId).set({processed: true});

        const product = await admin.firestore().collection('products').doc(payment.items[0].price.product).get();
        const productData = product.data();
        
        if(productData.metadata.credits){
            await addCreditsToUser(context.params.userId, productData);
        }
        else if(productData.metadata.type=='course'){
            await addCourseToUser(context.params.userId, payment.items[0].price.product);
        }

    }
    
  });


  async function addCourseToUser(userId:string, productId:string){
    const courses = await admin.firestore().collection('active_courses').where('stripeProductId', '==', productId).get();
    if(courses.empty){
        return;
    }
    const course = courses.docs[0];
    const courseId = course.id;

    if(!course.exists){
        return;
    }
    const courseData = course.data();
    if(!courseData){
        return;
    }
    const courseItems = await admin.firestore().collection('active_courses').doc(courseId).collection('items').get();

    let courseItemsData:any = [];
    courseItems.forEach((item:any)=>{
        courseItemsData.push(item.data());
    });

    await admin.firestore().collection('users').doc(userId).collection('courses').doc(courseId).set(courseData);
    for(let i=0; i<courseItemsData.length; i++){
        await admin.firestore().collection('users').doc(userId).collection('courses').doc(courseId).collection('items').doc(courseItemsData[i].id).set(courseItemsData[i]);
    }

  }

  async function addCreditsToUser(userId:string,productData:any){
    let obj:any = {
        total: parseInt(productData.metadata.credits),
        amount: parseInt(productData.metadata.credits),
        added:moment().unix(),
        created: moment().unix(),
        expires: moment().add(365, 'days').unix(),
        source: 'payment',
    }
    if(productData.metadata.unlimited){
        obj.type=productData.metadata.unlimited;
        await admin.firestore().collection('users').doc(userId).collection('credits').doc('0').set(obj);
    }
    else{
        await admin.firestore().collection('users').doc(userId).collection('credits').add(obj);
    }
    
  }

  async function addCreditsToTraining(userId:string,productData:any){
    let obj:any = {
        total: parseInt(productData.metadata.credits),
        amount: parseInt(productData.metadata.credits),
        added:moment().unix(),
        created: moment().unix(),
        expires: moment().add(2, 'months').unix(),
        source: 'payment',
    }
    await admin.firestore().collection('trainers').doc(userId).collection('trainings').doc(productData.metadata.trainingId).collection('credits').add(obj);
    if(productData.metadata.publish){
        await admin.firestore().collection('trainers').doc(userId).collection('trainings').doc(productData.metadata.trainingId).update({status: 'published',published: moment().unix()});
    }
    
  }

exports.expireCredits = functions.region('europe-west1').runWith({memory:'1GB'})
    .pubsub.schedule('5 1/4 * * *')
    .timeZone('Europe/Amsterdam')
    .onRun(async (context) => {
        try {
            const now = moment().unix();

            const creditsSnap = await admin.firestore()
                .collectionGroup('credits')
                .where('expires', '<=', now).where('total','!=', 0)
                .get();

            if (creditsSnap.empty) {
                return new responder.Message('No credits to expire', 200);
            }

            const batch = admin.firestore().batch();

            //log length of creditsSnap
            creditsSnap.forEach((creditDoc: any) => {
                batch.update(creditDoc.ref, { total: 0 }); // Alleen de velden die je wijzigt!
            });

            await batch.commit();


            const creditsMinusSnap = await admin.firestore()
                .collectionGroup('credits')
                .where('total','<', 0)
                .get();

            if (creditsMinusSnap.empty) {
                return new responder.Message('No credits to expire', 200);
            }

            const batchMinus = admin.firestore().batch();

            //log length of creditsSnap
            creditsMinusSnap.forEach((creditDoc: any) => {
                batchMinus.update(creditDoc.ref, { total: 0 }); // Alleen de velden die je wijzigt!
            });

            await batchMinus.commit();



            return null

        } catch (error) {
            console.error('Error expiring credits:', error);
            throw new functions.https.HttpsError('internal', 'Error while expiring credits');
        }
  });

exports.buyTrainerCredits = functions.region('europe-west1').runWith({memory:'1GB'}).https.onCall(async (data, context) => {
    if (!context.auth) {
      return new responder.Message('Not authorized', 401);
    }
    
    const uid = context.auth.uid;
    const participants = data.participants;
  
    if (!participants || typeof participants !== 'number') {
        return new responder.Message('Invalid number of participants', 400);
    }

    let extraPricePerCase = 200;
    let price = 10000;

    let type = 'chat'
    if(data.type){
        type = data.type;
    }
    let credits = 0;
    let conversations = 1;
    if(data.conversations){
        conversations = data.conversations;
    }
    if(data.unlimited){
        credits = 1000000;
    }
    else{
        credits = participants * conversations * 350;
    }

    if(type=='chat'){
        if(!data.unlimited&&conversations > 10){
            price = price + ((conversations - 10) * extraPricePerCase);
        }
        if(data.unlimited){
            let pricePerPerson = 1000;
            price = price + (pricePerPerson * participants);
        }
    }
  
    try {
      // 🔄 Ophalen van bestaande Stripe klant
        const customerRef = admin.firestore().collection('customers').doc(uid);
        const customerDoc = await customerRef.get();
        const customerData = customerDoc.data();
        let stripeCustomerId = customerData?.stripeCustomerId;

    if(!stripeCustomerId){
        const customerStripe = await stripe.customers.create({ email: context.auth.token.email });
        await customerRef.set({ stripeCustomerId: customerStripe.id, email: context.auth.token.email });
        stripeCustomerId = customerStripe.id;
    }


    const session = await admin.firestore()
    .collection('customers')
    .doc(uid)
    .collection('checkout_sessions')
    .add({
        mode: 'payment',
        customer: stripeCustomerId,
        line_items: [{
            price_data: {
                currency: 'eur',
                product_data: {
                    name: 'Trainer Credits',
                    description: `${participants} participants`
                },
                unit_amount: price
            },
            quantity: 1
        }],
        metadata: {
            uid: uid,
            participants: participants.toString(),
            moduleId: data.moduleId,
            credits: credits,
            conversations: conversations | 1,
            type: type,
            unlimited: data.unlimited || false,
        },
        success_url: 'https://conversation.alicialabs.com/modules?success=true&module='+data.moduleId,
        cancel_url: 'https://conversation.alicialabs.com/modules?success=false&module='+data.moduleId,
        invoice_creation: {
            enabled: true
        },
        payment_intent_data:{
            setup_future_usage: 'off_session'
        }
    });

    const sessionId = session.id;
    return new responder.Message({ sessionId }, 200);


    } catch (error) {
        console.error('Error fetching customer data:', error);
        throw new functions.https.HttpsError('internal', 'Fout bij het ophalen van klantgegevens.');
    }
});

exports.publishTraining = functions.region('europe-west1').runWith({memory:'1GB'}).https.onCall(async (data, context) => {
    if (!context.auth) {
      return new responder.Message('Not authorized', 401);
    }
    
    const uid = context.auth.uid;
    const trainingId = data.trainingId;
    const trainerId = data.trainerId || context.auth.token.trainerId;
    const extra = data.extra;
    const trainingRef = admin.firestore().collection('trainers').doc(trainerId).collection('trainings').doc(trainingId);
    const trainingDoc = await trainingRef.get();
    const trainingData = trainingDoc.data();
    if(!trainingData){
        return new responder.Message('Training not found', 404);
    }
    if(trainingData.status !== 'concept'){ 
        return new responder.Message('Training is not in concept', 400);
    }
    const participants = trainingData.amount_participants;
    let type_credits = trainingData.type_credits;
    if(!type_credits){
        type_credits = 'unlimited';
    }
    if (!participants || typeof participants !== 'number') {
        return new responder.Message('Invalid number of participants', 400);
    }

    const trainingPrice = (extra ? countExtraCostsTraining(trainingData,extra) : countCostsTraining(trainingData));
    trainingPrice.totalCosts;
  
    try {
      // 🔄 Ophalen van bestaande Stripe klant
        const customerRef = admin.firestore().collection('customers').doc(uid);
        const customerDoc = await customerRef.get();
        const customerData = customerDoc.data();
        let stripeCustomerId = customerData?.stripeCustomerId;

    if(!stripeCustomerId){
        const customerStripe = await stripe.customers.create({ email: context.auth.token.email });
        await customerRef.set({ stripeCustomerId: customerStripe.id, email: context.auth.token.email });
        stripeCustomerId = customerStripe.id;
    }

    //get trainer data
    const trainerRef = admin.firestore().collection('trainers').doc(trainerId);
    const trainerDoc = await trainerRef.get();
    const trainerData = trainerDoc.data();
    let invoice_redirect:boolean = false
    if(!trainerData){
        return new responder.Message('Trainer not found', 404);
    }
    if(!trainerData.admins.includes(uid)){
        return new responder.Message('You are not allowed to publish this training', 403);
    }

    if(trainerData.invoice_redirect){
        invoice_redirect = true;
    }

    if(!invoice_redirect){
        const session = await admin.firestore()
        .collection('customers')
        .doc(uid)
        .collection('checkout_sessions')
        .add({
            mode: 'payment',
            customer: stripeCustomerId,
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: 'AliciaLabs Credits - '+ trainingData.title,
                        description: `${participants} participants`
                    },
                    unit_amount: trainingPrice.totalCostsPlusTax
                },
                quantity: 1,
            }],
            metadata: {
                uid: uid,
                participants: participants.toString(),
                trainingId: trainingId,
                credits: trainingPrice.credits,
                conversations: trainingPrice.totalConversations || 1,
                type: trainingData.type || 'chat',
                type_credits: type_credits,
                unlimited: type_credits=='unlimited' || false,
                publish: true,
            },
            success_url: 'https://conversation.alicialabs.com/trainer?success=true&training='+trainingId,
            cancel_url: 'https://conversation.alicialabs.com/modules?success=false&training='+trainingId,
            automatic_tax: { enabled: true },
            tax_code:"txcd_10000000",
            allow_promotion_codes: true,
            invoice_creation: {
                enabled: true
            },
            payment_intent_data:{
                setup_future_usage: 'off_session'
            }
        });

        const sessionId = session.id;
        return new responder.Message({ sessionId }, 200);
    }

    else{
        let publishDate = moment().unix();
        if(trainingData.published){
            publishDate = trainingData.published;
        }
        let amount_participants = trainingData.amount_participants;
        if(extra && extra.amount_participants){
            amount_participants = amount_participants + extra.amount_participants;
        }
        let updateObject:any = {
            status: 'published',
            published: publishDate,
            amount_participants: amount_participants,
        }
        let amount_period = trainingData.amount_period;
        if(amount_period && extra && extra.amount_period){
            amount_period = amount_period + extra.amount_period;
        }
        if(amount_period){
            updateObject.amount_period = amount_period;
        }
        if(extra && extra.expected_conversations){
            updateObject.expected_conversations = trainingData.expected_conversations + extra.expected_conversations;
        }
        await trainingRef.update(updateObject);
        admin.firestore().collection('emailsToProcess').add({
            template: 'free',
            to: 'alicia@innovatieman.nl',
            language: 'nl',
            data: {
                name: 'Mark',
                content: {
                    body:'Beste Mark, <br> De training '+trainingData.title+' van trainer '+trainerData.name+' is gepubliceerd. <br> De klant heeft gekozen voor een factuur. <br><br>Kosten: €'+(trainingPrice.totalCostsPlusTax/100)+' incl. BTW<br><br> Met vriendelijke groet, <br> AliciaLabs',
                    subject: 'Factuur voor training '+trainingData.title + 'sturen',
                },
                subject: 'Factuur voor training '+trainingData.title + 'sturen',

            }
        })
        if(!extra){
            await admin.firestore().collection('trainers').doc(trainerId).collection('trainings').doc(trainingId)
            .collection('credits').add({
                total: trainingPrice.credits,
                amount: type_credits=='unlimited' ? 1000000 :  trainingPrice.credits,
                added:moment().unix(),
                created: moment().unix(),
                expires: trainingPrice.expires,
                participants: trainingData.amount_participants,
                credits: trainingPrice.credits,
                conversations: trainingPrice.totalConversations || 1,
                type: trainingData.type || 'chat',
                type_credits: type_credits,
                unlimited: type_credits=='unlimited' || false,
            });
        }
        else{
            await admin.firestore().collection('trainers').doc(trainerId).collection('trainings').doc(trainingId)
            .collection('credits').add({
                total: trainingPrice.credits,
                amount: type_credits=='unlimited' ? 1000000 :  trainingPrice.credits,
                added:moment().unix(),
                created: moment().unix(),
                expires: trainingPrice.expires,
                participants: trainingData.amount_participants + extra.amount_participants,
                credits: trainingPrice.credits,
                conversations: trainingPrice.totalConversations || 1,
                type: trainingData.type || 'chat',
                type_credits: type_credits,
                unlimited: type_credits=='unlimited' || false,
            });
        }
    }

    // const sessionId = session.id;
    return new responder.Message({ send_invoice:true, invoice_redirect }, 200);


    } catch (error) {
        console.error('Error fetching customer data:', error);
        throw new functions.https.HttpsError('internal', 'Fout bij het ophalen van klantgegevens.');
    }
});

exports.publishTrainingOrganisation = functions.region('europe-west1').runWith({memory:'1GB'}).https.onCall(async (data, context) => {
    if (!context.auth) {
      return new responder.Message('Not authorized', 401);
    }
    try {
        const trainingId = data.trainingId;
        const trainerId = data.trainerId;
        const trainingRef = admin.firestore().collection('trainers').doc(trainerId).collection('trainings').doc(trainingId);
        const trainingDoc = await trainingRef.get();
        const trainingData = trainingDoc.data();
        if(!trainingData){
            return new responder.Message('Training not found', 404);
        }
        if(trainingData.status !== 'concept'){ 
            return new responder.Message('Training is not in concept', 400);
        }
        await admin.firestore().collection('trainers').doc(trainerId).collection('trainings').doc(trainingId).update({status: 'published',publishType:'organisation',published: moment().unix()});
        return new responder.Message('Training published', 200);
    } catch (error) {
        console.error('Error fetching customer data:', error);
        return new responder.Message('Error fetching customer data', 500);
    }
        
});

function countCostsTraining(trainingItem:any){

    if(!trainingItem.expected_conversations || trainingItem.expected_conversations<1){
      trainingItem.expected_conversations = 1
    }
    if(!trainingItem.amount_participants || trainingItem.amount_participants<1){
      trainingItem.amount_participants = 1
    }
    if(!trainingItem.type_credits){
      trainingItem.type_credits = 'unlimited'
    }
    let costs:any= {}
    costs.basicCosts = 10000
    costs.extraCostsPerConversation = 200
    if(trainingItem.type_credits != 'credits'){
        costs.unlimitedCostsperParticipant = 1000
        if(trainingItem.type && trainingItem.type!='chat'){
            if(trainingItem.amount_participants > 30){
                costs.unlimitedCostsperParticipant = 2000
            }
            else if(trainingItem.amount_participants > 20){
                costs.unlimitedCostsperParticipant = 2500
            }
            else{
                costs.unlimitedCostsperParticipant = 3000
            }
        }
        costs.extraCosts = costs.unlimitedCostsperParticipant * trainingItem.amount_participants
        costs.extraCostsPerConversation = 0
        costs.extraConversations = 0
    }
    else{
      // costs.extraCosts = (trainingItem.amount_participants * trainingItem.expected_conversations) - 10
      if(costs.extraCosts < 0){
        costs.extraCosts = 0
      }
      costs.unlimitedCosts = 0
      costs.extraConversations = (trainingItem.amount_participants * trainingItem.expected_conversations) - 10
      costs.totalConversations = (trainingItem.amount_participants * trainingItem.expected_conversations)
      if(costs.extraConversations < 0){
        costs.extraConversations = 0
      }
      costs.extraCosts = costs.extraConversations * costs.extraCostsPerConversation
    }

    costs.expires = moment().add(1, 'year').unix()
     if(trainingItem.type_credits!='credits'){
        costs.expires = moment().add(2, 'months').unix()
     }

    if(trainingItem.type_credits!='credits' && trainingItem.amount_period>2){
      costs.extraPeriod = (trainingItem.amount_period - 2) 
      costs.extraPeriodCosts = (trainingItem.amount_period - 2) * (10 / 2) * trainingItem.amount_participants
      costs.expires = moment().add((2 + trainingItem.amount_period), 'months').unix()
    }

    costs.totalCosts = costs.basicCosts + costs.extraCosts + costs.extraPeriodCosts

    costs.tax = costs.totalCosts * 0.21
    costs.totalCostsPlusTax = costs.totalCosts + costs.tax
    // credits = participants * conversations * 350;
    costs.credits = trainingItem.amount_participants * trainingItem.expected_conversations * 350;
    if(trainingItem.type_credits == 'unlimited'){
      costs.credits = 1000000;
    }

    return costs
  }


function countExtraCostsTraining(trainingItem:any,extraCostsOptions:any){

    if(!extraCostsOptions.expected_conversations || extraCostsOptions.expected_conversations<1){
      extraCostsOptions.expected_conversations = 0
    }
    if(!extraCostsOptions.amount_participants || extraCostsOptions.amount_participants<1){
      extraCostsOptions.amount_participants = 0
    }
    if(!extraCostsOptions.type_credits){
      extraCostsOptions.type_credits = 'unlimited'
    }
    let costs:any= {}
    costs.basicCosts = 0
    costs.extraCostsPerConversation = 2
    costs.extraPeriodCosts = 0
    if(trainingItem.type_credits != 'credits'){
      costs.extraCosts = 10 * extraCostsOptions.amount_participants
      costs.extraCostsPerConversation = 0
      costs.extraConversations = 0
    }
    else{
      // costs.extraCosts = (trainingItem.amount_participants * trainingItem.expected_conversations) - 10
      if(costs.extraCosts < 0){
        costs.extraCosts = 0
      }
      costs.unlimitedCosts = 0
      if(extraCostsOptions.expected_conversations<1 && extraCostsOptions.amount_participants<1){
        costs.extraConversations = 0
      }
      else if(extraCostsOptions.expected_conversations<1){
        costs.extraConversations = (extraCostsOptions.amount_participants * trainingItem.expected_conversations)
      }
      else if(extraCostsOptions.amount_participants<1){
        costs.extraConversations = (trainingItem.amount_participants * extraCostsOptions.expected_conversations)
      }
      else{
        costs.extraConversations = ((trainingItem.amount_participants + extraCostsOptions.amount_participants) * (extraCostsOptions.expected_conversations + trainingItem.expected_conversations)) - (trainingItem.amount_participants * trainingItem.expected_conversations)
      }
      costs.extraCosts = costs.extraConversations * costs.extraCostsPerConversation
    }

    if(trainingItem.type_credits!='credits' && extraCostsOptions.amount_period){
      costs.extraPeriod = (extraCostsOptions.amount_period) 
      costs.extraPeriodCosts = (extraCostsOptions.amount_period) * (10 / 2) * (trainingItem.amount_participants + extraCostsOptions.amount_participants)
    }

    costs.totalCosts = costs.basicCosts + costs.extraCosts + costs.extraPeriodCosts
    costs.tax = costs.totalCosts * 0.21
    costs.totalCostsPlusTax = costs.totalCosts + costs.tax

    costs.expires = trainingItem.expires;
    
    if(trainingItem.type_credits!='credits' && extraCostsOptions.amount_period){
      costs.expires = moment.unix(trainingItem.published).add((trainingItem.amount_period + extraCostsOptions.amount_period), 'months').unix()
    }

    costs.totalCosts = costs.basicCosts + costs.extraCosts + costs.extraPeriodCosts

    costs.tax = costs.totalCosts * 0.21
    costs.totalCostsPlusTax = costs.totalCosts + costs.tax
    // credits = participants * conversations * 350;
    costs.credits = trainingItem.amount_participants * trainingItem.expected_conversations * 350;
    if(trainingItem.type_credits == 'unlimited'){
      costs.credits = 1000000;
    }

    return costs
  }
//   exports.createFlexibleCheckoutSession = functions.region('europe-west1').runWith({memory:'1GB'}).https.onCall(async (data, context) => {
//     if (!context.auth) {
//       return new responder.Message('Not authorized', 401);
//     }
    
//     const uid = context.auth.uid;
//     const participants = data.participants;
  
//     if (!participants || typeof participants !== 'number') {
//         return new responder.Message('Invalid number of participants', 400);
//     }
  
//     // 🔢 Bereken prijs per deelnemer, bijv. €5 per persoon
//     const prijsPerPersoonInCenten = 500;
//     const totaalBedrag = prijsPerPersoonInCenten * participants;
  
//     try {
//       // 🔄 Ophalen van bestaande Stripe klant
//         const customerRef = admin.firestore().collection('customers').doc(uid);
//         const customerDoc = await customerRef.get();
//         const customerData = customerDoc.data();
//         let stripeCustomerId = customerData?.stripeCustomerId;

//     if(!stripeCustomerId){
//         const customerStripe = await stripe.customers.create({ email: context.auth.token.email });
//         await customerRef.set({ stripeCustomerId: customerStripe.id, email: context.auth.token.email });
//         stripeCustomerId = customerStripe.id;
//     }


//     const session = await admin.firestore()
//     .collection('customers')
//     .doc(uid)
//     .collection('checkout_sessions')
//     .add({
//         mode: 'payment',
//         customer: stripeCustomerId,
//         line_items: [{
//             price_data: {
//                 currency: 'eur',
//                 product_data: {
//                     name: 'Trainer Credits',
//                     description: `${participants} participants`
//                 },
//                 unit_amount: totaalBedrag
//             },
//             quantity: 1
//         }],
//         metadata: {
//             uid: uid,
//             participants: participants.toString()
//         },
//         success_url: 'https://conversation.alicialabs.com/modules?success=true&module='+data.moduleId,
//         cancel_url: 'https://conversation.alicialabs.com/modules?success=false&module='+data.moduleId,
//         invoice_creation: {
//             enabled: true
//         },
//         payment_intent_data:{
//             setup_future_usage: 'off_session'
//         }
//     });

//     const sessionId = session.id;
//     return new responder.Message({ sessionId }, 200);


//     } catch (error) {
//         console.error('Error fetching customer data:', error);
//         throw new functions.https.HttpsError('internal', 'Fout bij het ophalen van klantgegevens.');
//     }
// })