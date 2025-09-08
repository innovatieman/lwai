// functions/src/createCheckoutSession.ts

import admin from '../firebase'
import * as functions from 'firebase-functions/v1';
import { config } from '../configs/config-basics';
import Stripe from "stripe";
const stripe = new Stripe(config.stripe.live_secret_key);


// exports.createCheckoutSession = functions.region('europe-west1').runWith({ memory: '1GB' }).https
// .onCall(async (data, context) => {
//     if (!context.auth) {
//         throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
//     }

//     const { organisationId, stripeProductIds, successPath, cancelPath, metadata } = data;
//     const userId = context.auth.uid;

//     const customerId = organisationId ? organisationId : userId;

//     const customerRef = admin.firestore().collection('customers').doc(customerId);
//     const customerSnap = await customerRef.get();
//     let stripeId = customerSnap.data()?.stripeCustomerId;

//     if (!stripeId) {
//         let customerName = context.auth.token.email
//         if(organisationId){
//             const orgSnap = await admin.firestore().collection('trainers').doc(organisationId).get();
//             if (orgSnap.exists) {
//                 customerName = orgSnap.data()?.name || customerName;
//             }
//         }
//         const customerMetadata = organisationId ? { organisationId } : { userId };

//         const stripeCustomer = await stripe.customers.create({
//             name: customerName,
//             metadata: customerMetadata,
//         });

//         stripeId = stripeCustomer.id;

//         let customerData: any = { stripeId: stripeId };
//         if(organisationId){
//             customerData['organisationId'] = organisationId;
//         }
//         if(context.auth.token.email){
//             customerData['email'] = context.auth.token.email;
//         }
//         // Sla op in Firestore
//         await customerRef.set(customerData, { merge: true });
//     }

//     // 2. Als er geen organisationId is → gebruik standaard flow
//     if (!organisationId) {

//         if (!Array.isArray(stripeProductIds)) {
//             throw new functions.https.HttpsError('invalid-argument', 'stripeProductId must be an array for users');
//         }

//         const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

//         for (const productId of stripeProductIds) {
//             const pricesSnap = await admin
//             .firestore()
//             .collection(`products/${productId}/prices`)
//             .limit(1)
//             .get();

//             if (pricesSnap.empty) {
//                 throw new functions.https.HttpsError('not-found', `No price found for product ${productId}`);
//             }

//             const stripePriceId = pricesSnap.docs[0].id;

//             line_items.push({
//                 price: stripePriceId,
//                 quantity: 1
//             });
//         }

//         let objMetadata: any = { userId };
//         if(metadata){
//             objMetadata = { ...objMetadata, ...metadata };
//         }

//         const session = await stripe.checkout.sessions.create({
//             line_items,
//             mode: 'payment',
//             customer: stripeId,
//             success_url: `${successPath}`,
//             cancel_url: `${cancelPath}`,
//             metadata: {
//                 ...objMetadata
//             },
//             automatic_tax: { enabled: true }
//         });

//         return { url: session.url };
//     }

//     // 3. Anders → aangepaste prijs op basis van organisatie
//     const employeesSnap = await admin
//     .firestore()
//     .collection(`trainers/${organisationId}/employees`)
//     .get();

//     const numEmployees = employeesSnap.size;

//     const productId = stripeProductIds[0];

// // Probeer eerst elearning
// const elearningSnap = await admin
//     .firestore()
//     .collection('elearnings')
//     .where('stripeProductId', '==', productId)
//     .limit(1)
//     .get();

// let stripePriceId: string | null = null;
// let minPrice:number | undefined = undefined;
// let maxPrice:number | undefined = undefined; // Maximaal €500
// if (!elearningSnap.empty) {
//     const elearningData = elearningSnap.docs[0].data();
//     stripePriceId = elearningData.stripePriceId;

//     if (!stripePriceId) {
//         throw new functions.https.HttpsError('failed-precondition', `No stripePriceId found in elearning for ${productId}`);
//     }
//     minPrice = elearningData.price_elearning_org_min ? (elearningData.price_elearning_org_min * 100) : 0;
//     maxPrice = elearningData.price_elearning_org_max ? (elearningData.price_elearning_org_max * 100) : 50000;
// } else {
//     // Geen elearning → check products collection
//     const priceSnap = await admin
//         .firestore()
//         .collection(`products/${productId}/prices`)
//         .limit(1)
//         .get();

//     if (priceSnap.empty) {
//         throw new functions.https.HttpsError('not-found', `No price found in product ${productId}`);
//     }

//     stripePriceId = priceSnap.docs[0].id;
// }
//     if (!stripePriceId) {
//         throw new functions.https.HttpsError('failed-precondition', `No stripePriceId found for product ${productId}`);
//     }
    

//     // 5. Haal perEmployeePrice op uit products/{productId}/prices/{priceId}
//     const priceDocSnap = await admin
//     .firestore()
//     .doc(`products/${stripeProductIds[0]}/prices/${stripePriceId}`)
//     .get();

//     if (!priceDocSnap.exists) {
//         throw new functions.https.HttpsError('not-found', 'Price document not found in product');
//     }

//     const priceData = priceDocSnap.data();
//     const perEmployeePrice = priceData?.unit_amount;

//     if (!perEmployeePrice || typeof perEmployeePrice !== 'number') {
//         throw new functions.https.HttpsError('invalid-argument', 'Invalid perEmployee price in Firestore');
//     }

//     let calculatedAmount = numEmployees * perEmployeePrice;
//     if(minPrice !== undefined && maxPrice !== undefined){
//         calculatedAmount = Math.max(minPrice, Math.min(maxPrice, calculatedAmount));
//     }

//     const dynamicPrice = await stripe.prices.create({
//         unit_amount: calculatedAmount,
//         currency: 'eur',
//         product: 'prod_Swu7QT8iI8cQBb',
//         nickname: `Custom price for org ${organisationId} - ${Date.now()}`
//     });

//     let objMetadata: any = { userId, organisationId, employees: numEmployees.toString() };
//     if(metadata){
//         objMetadata = { ...objMetadata, ...metadata };
//     }

//     const session = await stripe.checkout.sessions.create({
//         line_items: [{
//             price: dynamicPrice.id,
//             quantity: 1
//         }],
//         mode: 'payment',
//         customer: stripeId,
//         success_url: `${successPath}`,
//         cancel_url: `${cancelPath}`,
//         metadata: {
//             ...objMetadata
//         },
//         automatic_tax: { enabled: true }
//     });

//     return { url: session.url };
// });

exports.createCheckoutSession = functions.region('europe-west1').runWith({ memory: '1GB' }).https
.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
  }

  const { organisationId, stripeProductIds, successPath, cancelPath, metadata } = data;
  const userId = context.auth.uid;

  // 🟢 Voor org: gebruik dummy user
  let customerId = userId;
  let stripeId: string | null = null;

  if (organisationId) {
    const dummyEmail = `trainer_${organisationId}@ai-inbound.alicialabs.com`;

    let dummyUser;
    try {
      dummyUser = await admin.auth().getUserByEmail(dummyEmail);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        dummyUser = await admin.auth().createUser({
          email: dummyEmail,
          password: Math.random().toString(36).slice(-10),
          displayName: `Trainer ${organisationId}`,
        });
      } else {
        throw new functions.https.HttpsError('internal', 'Kon dummy user niet aanmaken');
      }
    }

    customerId = dummyUser.uid;

    const customerRef = admin.firestore().collection('customers').doc(customerId);
    const customerSnap = await customerRef.get();

    stripeId = customerSnap.data()?.stripeCustomerId;

    if (!stripeId) {
      const orgSnap = await admin.firestore().collection('trainers').doc(organisationId).get();
      const customerName = orgSnap.exists ? (orgSnap.data()?.name || dummyEmail) : dummyEmail;

      const stripeCustomer = await stripe.customers.create({
        email: dummyEmail,
        name: customerName,
        metadata: {
          organisationId,
          type: 'organisation'
        }
      });

      stripeId = stripeCustomer.id;

      await customerRef.set({
        stripeCustomerId: stripeId,
        email: dummyEmail,
        organisationId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  } else {
    // 🟢 Normale user: standaard logica
    const customerRef = admin.firestore().collection('customers').doc(customerId);
    const customerSnap = await customerRef.get();
    stripeId = customerSnap.data()?.stripeCustomerId;

    if (!stripeId) {
      const stripeCustomer = await stripe.customers.create({
        email: context.auth.token.email,
        metadata: { userId }
      });

      stripeId = stripeCustomer.id;

      await customerRef.set({
        stripeCustomerId: stripeId,
        email: context.auth.token.email,
        userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  }

  // 🟢 Nu verder met bestaande flow
  if (!organisationId) {
    if (!Array.isArray(stripeProductIds)) {
      throw new functions.https.HttpsError('invalid-argument', 'stripeProductId must be an array for users');
    }

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const productId of stripeProductIds) {
      const pricesSnap = await admin.firestore().collection(`products/${productId}/prices`).limit(1).get();

      if (pricesSnap.empty) {
        throw new functions.https.HttpsError('not-found', `No price found for product ${productId}`);
      }

      const stripePriceId = pricesSnap.docs[0].id;
      line_items.push({ price: stripePriceId, quantity: 1 });
    }

    let objMetadata: any = { userId };
    if (metadata) objMetadata = { ...objMetadata, ...metadata };

    const session = await stripe.checkout.sessions.create({
        line_items,
        mode: 'payment',
        customer: stripeId,
        customer_update: {
            address: 'auto',
            shipping: 'auto',
        },
        success_url: `${successPath}`,
        cancel_url: `${cancelPath}`,
        metadata: objMetadata,
        automatic_tax: { enabled: true }
    });

    return { url: session.url };
  }

  // 🟢 Organisatie flow
  const employeesSnap = await admin.firestore().collection(`trainers/${organisationId}/employees`).get();
  const numEmployees = employeesSnap.size;

  const productId = stripeProductIds[0];

  // const elearningSnap = await admin.firestore()
  //   .collection('elearnings')
  //   .where('stripeProductId', '==', productId)
  //   .limit(1)
  //   .get();

  let stripePriceId: string | null = null;
  // let minPrice: number | undefined = undefined;
  // let maxPrice: number | undefined = undefined;

  // if (!elearningSnap.empty) {
  //   const elearningData = elearningSnap.docs[0].data();
  //   stripePriceId = elearningData.stripePriceId;
  //   // minPrice = elearningData.price_elearning_org_min ? (elearningData.price_elearning_org_min * 100) : 0;
  //   // maxPrice = elearningData.price_elearning_org_max ? (elearningData.price_elearning_org_max * 100) : 50000;
  // } else {
    const priceSnap = await admin.firestore().collection(`products/${productId}/prices`).limit(1).get();
    if (priceSnap.empty) throw new functions.https.HttpsError('not-found', `No price found in product ${productId}`);
    stripePriceId = priceSnap.docs[0].id;
  // }

  if (!stripePriceId) {
    throw new functions.https.HttpsError('failed-precondition', `No stripePriceId found for product ${productId}`);
  }

  // const priceDocSnap = await admin.firestore().doc(`products/${productId}/prices/${stripePriceId}`).get();
  // if (!priceDocSnap.exists) throw new functions.https.HttpsError('not-found', 'Price document not found in product');

  // const priceData = priceDocSnap.data();
  // const perEmployeePrice = priceData?.unit_amount;
  // if (!perEmployeePrice || typeof perEmployeePrice !== 'number') {
  //   throw new functions.https.HttpsError('invalid-argument', 'Invalid perEmployee price in Firestore');
  // }

  // let calculatedAmount = numEmployees * perEmployeePrice;
  // if (minPrice !== undefined && maxPrice !== undefined) {
  //   calculatedAmount = Math.max(minPrice, Math.min(maxPrice, calculatedAmount));
  // }

  // const dynamicPrice = await stripe.prices.create({
  //   unit_amount: calculatedAmount,
  //   currency: 'eur',
  //   product: productId,
  //   nickname: `Price for org ${organisationId} - ${Date.now()}`
  // });

  let objMetadata: any = { userId, organisationId, employees: numEmployees.toString() };
  if (metadata) objMetadata = { ...objMetadata, ...metadata };

  const session = await stripe.checkout.sessions.create({
    line_items: [{ price: stripePriceId, quantity: 1 }],
    mode: 'payment',
    customer: stripeId,
    customer_update: {
        address: 'auto',
        shipping: 'auto'
    },
    success_url: `${successPath}`,
    cancel_url: `${cancelPath}`,
    metadata: objMetadata,
    automatic_tax: { enabled: true }
  });

  return { url: session.url };
});