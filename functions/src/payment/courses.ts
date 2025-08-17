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
      const product = await stripe.products.create({
        name: elearningData.title,  // Gebruik de titel van de training
        description: elearningData.description || "Geen beschrijving beschikbaar",
        metadata:{
            type: 'elearning',
            trainerId: elearningData.trainerId,
            trainingId: elearningData.originalTrainingId,
        }
      });

      console.log(`elearningData`, JSON.stringify(elearningData, null, 2));
      // Stap 2: Maak een prijs aan in Stripe (optioneel)
      const price = await stripe.prices.create({
        unit_amount: elearningData.price_elearning * 100, // Prijs omzetten naar centen
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