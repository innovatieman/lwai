import { onRequest } from "firebase-functions/v2/https";
import admin from '../firebase'
import Stripe from "stripe";
import { config } from '../configs/config-basics';

// Vervang met jouw Stripe Secret Key
const stripe = new Stripe(config.stripe.test_secret_key);

exports.stripeWebhookSubscriptions = onRequest(
{ cors: config.allowed_cors, region: "europe-west1" },
async (req: any, res: any) => {

    const sig = req.headers["stripe-signature"] as string;
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, config.stripe.test_secret_webhook_subscriptions);
    } catch (err:any) {
        console.error("❌ Fout bij webhook-verificatie:", err);
        return res.status(400).send(`Webhook error: ${err.message}`);
    }

    console.log(`✅ Ontvangen Stripe event: ${event.type}`);

    if (event.type.startsWith("customer.subscription")) {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId; // Zorg dat je userId opslaat in metadata!
    
        if (!userId) {
          console.error("❌ Geen userId gevonden in subscription metadata.");
          return res.status(400).send("Geen userId gevonden.");
        }
        // Haal product ID op uit de eerste subscription item
        const priceId = subscription.items.data[0]?.price.id || null;
        const productId = subscription.items.data[0]?.price.product as string;

        if (!productId) {
            console.error("❌ Geen product gevonden in subscription.");
            return res.status(400).send("Geen product gevonden.");
        }
      
        // 🔥 Haal de volledige productinformatie op inclusief metadata
        const product = await stripe.products.retrieve(productId);
        const price = await stripe.prices.retrieve(priceId);

        const subscriptionData = {
            id: subscription.id,
            status: subscription.status, // "active", "canceled", "past_due", "trialing"
            priceId: priceId,
            productId: productId,
            productName: product.name,
            type: product.metadata?.access || "unknown_type", // 🔥 Metadata ophalen van product
            paid_subscription: true,
            created: subscription.created,
            current_period_end: subscription.current_period_end, // UNIX timestamp
            canceled_at: subscription.canceled_at || null,
            interval: price.recurring?.interval || "month",
            amount: price.unit_amount / 100,
            currency: price.currency,
            credits: product.metadata?.credits || 0, // 🔥 Metadata ophalen van product
        };
    
        console.log(`🔄 Updaten abonnement voor gebruiker ${userId}:`, subscriptionData);
    
        await admin.firestore().collection("users").doc(userId)
          .collection("subscriptions")
          .doc(subscription.id)
          .set(subscriptionData, { merge: true });
    
        return res.status(200).send("Subscription updated.");
    }

    res.status(200).send("Event ontvangen");
});