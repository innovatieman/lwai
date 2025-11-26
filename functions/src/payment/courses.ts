// import admin from '../firebase'
import * as functions from 'firebase-functions/v1';
import { config } from '../configs/config-basics';

const Stripe = require("stripe");

const stripe = new Stripe(config.stripe.live_secret_key);

exports.createStripeProductElearning = functions.region("europe-west1")
  .runWith({ memory: '1GB' })
  .firestore
  .document("elearnings/{elearningId}")
  .onCreate(async (snap, context) => {
    const elearningData = snap.data();

    try {
      // Stap 1: Maak het product aan in Stripe
      let metadata:any = {
        type: 'elearning',
        trainerId: elearningData.trainerId,
        trainingId: elearningData.originalTrainingId,
      };
      if(elearningData.credits_included){
        metadata['free_credits'] = elearningData.credits_included_value?.value || 1000000;
      };
        
      const product = await stripe.products.create({
        name: elearningData.title,  // Gebruik de titel van de training
        description: elearningData.trainer?.name || "",
        metadata:metadata
      });

      // console.log(`elearningData`, JSON.stringify(elearningData, null, 2));
      // Stap 2: Maak een prijs aan in Stripe (optioneel)
      const price = await stripe.prices.create({
        unit_amount: elearningData.price_elearning * 100, // Prijs omzetten naar centen
        currency: "eur", // Pas aan naar de juiste valuta
        product: product.id,
        tax_behavior: 'exclusive'
      });

      // Stap 3: Sla de Stripe-product-ID en prijs-ID op in Firestore
      await snap.ref.update({
        stripeProductId: product.id,
        stripePriceId: price.id,
      });

      console.log(`Stripe product aangemaakt: ${product.id} met prijs: ${price.id}`);
    } catch (error) {
      console.error("Fout bij het aanmaken van Stripe-product:", error);
    }
  });

exports.createStripeProduct = functions.region("europe-west1")
  .firestore
  .document("active_courses/{courseId}")
  .onCreate(async (snap, context) => {
    const courseData = snap.data();

    try {
      // Stap 1: Maak het product aan in Stripe
      const product = await stripe.products.create({
        name: courseData.title,  // Gebruik de titel van de training
        description: courseData.description || "Geen beschrijving beschikbaar",
        metadata:{
            type: 'course',
            trainerId: courseData.trainerId,
        }
      });

      // Stap 2: Maak een prijs aan in Stripe (optioneel)
      const price = await stripe.prices.create({
        unit_amount: courseData.price * 100, // Prijs omzetten naar centen
        currency: "eur", // Pas aan naar de juiste valuta
        product: product.id,
      });

      // Stap 3: Sla de Stripe-product-ID en prijs-ID op in Firestore
      await snap.ref.update({
        stripeProductId: product.id,
        stripePriceId: price.id,
      });

      console.log(`Stripe product aangemaakt: ${product.id} met prijs: ${price.id}`);
    } catch (error) {
      console.error("Fout bij het aanmaken van Stripe-product:", error);
    }
  });


exports.updateStripeProductPrice = functions.region("europe-west1")
  .runWith({ memory: '1GB' })
  .firestore
  .document("elearnings/{elearningId}")
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Controleer of de prijs is gewijzigd
    if (beforeData.price_elearning !== afterData.price_elearning) {
      try {
        const oldPriceId = beforeData.stripePriceId;

        // Nieuwe prijs aanmaken
        const newPrice = await stripe.prices.create({
          unit_amount: afterData.price_elearning * 100,
          currency: "eur",
          product: afterData.stripeProductId,
          tax_behavior: 'exclusive',
        });

        // Optioneel: oude prijs deactiveren
        if (oldPriceId) {
          await stripe.prices.update(oldPriceId, { active: false });
        }

        // Nieuwe prijs-ID opslaan
        await change.after.ref.update({
          stripePriceId: newPrice.id,
        });

      } catch (error) {
        console.error("Fout bij bijwerken Stripe-prijs:", error);
      }
    }

    if(beforeData.status !== afterData.status && afterData.status=='closed'){
      try{
        const productId = afterData.stripeProductId;
        if(productId){
          await stripe.products.update(productId, { active: false });
        }
      } catch (error) {
        console.error("Fout bij het sluiten van Stripe-product:", error);
      }
    }
  });