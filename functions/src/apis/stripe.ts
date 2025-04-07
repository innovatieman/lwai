import { onRequest } from "firebase-functions/v2/https";
import * as functions from 'firebase-functions/v1';
import admin from '../firebase'
import Stripe from "stripe";
import { config } from '../configs/config-basics';
import * as responder from '../utils/responder'

const stripe = new Stripe(config.stripe.live_secret_key);

exports.syncStripeProducts = onRequest(
    { cors: config.allowed_cors, region: "europe-west1" },
    async (req, res) => {
        return
    // try {
    //   console.log("🔄 Synchroniseren van Stripe-producten...");
  
    //   // 🔥 Haal alle producten uit Stripe (max 100 per request)
    //   const products = await stripe.products.list({ limit: 100 });
  
    //   for (const product of products.data) {
    //     // 🔥 Sla het product op in Firestore
    //     if(product.active){
    //         const productData = {
    //         id: product.id,
    //         name: product.name,
    //         description: product.description || "",
    //         active: product.active,
    //         metadata: product.metadata,
    //         created: product.created,
    //         };
    
    //         await admin.firestore().collection("products").doc(product.id).set(productData, { merge: true });
    //         console.log(`✅ Product opgeslagen: ${product.name}`);
    
    //         // 🔥 Haal alle prijzen op voor dit product
    //         const prices = await stripe.prices.list({ product: product.id });
    
    //         for (const price of prices.data) {
    //         const priceData = {
    //             id: price.id,
    //             currency: price.currency,
    //             amount: price.unit_amount / 100, // Omzetten naar euro/dollar
    //             interval: price.recurring?.interval || "one_time",
    //             active: price.active,
    //             metadata: price.metadata,
    //             created: price.created,
    //         };
    
    //         // 🔥 Sla de prijs op als subdocument in de `prices` subcollectie
    //         await admin.firestore().collection("products").doc(product.id).collection("prices").doc(price.id).set(priceData);
    //         //   console.log(`   💰 Prijs opgeslagen: ${price.id} (${price.amount} ${price.currency}/${price.interval})`);
    //         }
    //     }
    //   }
  
    //   res.status(200).send("🔄 Synchronisatie voltooid!");
    // } catch (error) {
    //   console.error("❌ Fout bij synchroniseren:", error);
    //   res.status(500).send("Interne fout bij synchroniseren.");
    // }
});


exports.createStripePortalSession = functions.region('europe-west1').https.onCall(async (data, context) => {
    // ✅ Optioneel: check of gebruiker is ingelogd
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Je moet ingelogd zijn');
    }

    const customerRef = admin.firestore().collection('customers').doc(context.auth.uid);
    const customerSnap = await customerRef.get();
    const customer = customerSnap.data();
    console.log('customer', customer);

    // const { customerId } = customer.stripeCustomerId
  
    if (!customer?.stripeCustomerId) {
      throw new functions.https.HttpsError('invalid-argument', 'customerId ontbreekt');
    }
  
    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customer.stripeCustomerId,
        return_url: 'https://conversation.alicialabs.com/account/credits', // pas aan naar je frontend
      });
  
      return { url: portalSession.url };
    } catch (error: any) {
      console.error('Stripe portal error:', error);
      throw new functions.https.HttpsError('internal', 'Stripe portal sessie kon niet worden aangemaakt');
    }
  });


exports.createCustomerId = functions.region('europe-west1').https.onCall(async (data, context) =>{

    if (!context.auth) {
        return new responder.Message('Not authorized', 401);
      }
    try{
      const customerRef = admin.firestore().collection('customers').doc(context.auth.uid);
      const customerSnap = await customerRef.get();
      const customer = customerSnap.data();
      if(customer?.stripeCustomerId){
        return new responder.Message({stripeId: customer.stripeCustomerId}, 200);
      }
      const customerStripe = await stripe.customers.create({ email: context.auth.token.email });
      await customerRef.set({ stripeId: customerStripe.id, email: context.auth.token.email });
      return new responder.Message({stripeId: customerStripe.id}, 200);
    }
    catch (error: any) {
        console.error('Stripe customer error:', error);
        throw new functions.https.HttpsError('internal', 'Stripe customer kon niet worden aangemaakt');
      }

})