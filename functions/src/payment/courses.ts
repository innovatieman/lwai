// import admin from '../firebase'
import * as functions from 'firebase-functions/v1';
import { config } from '../configs/config-basics';

const Stripe = require("stripe");

// Vervang met jouw Stripe Secret Key
const stripe = new Stripe(config.stripe.test_secret_key);

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