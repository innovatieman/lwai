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
            await addCreditsToUser(context.params.userId, productData);
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

    // 🔢 Bereken prijs per deelnemer, bijv. €5 per persoon
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