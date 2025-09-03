// functions/src/index.ts

import admin from '../firebase'
import * as functions from 'firebase-functions/v1';
import { config } from '../configs/config-basics';
import Stripe from "stripe";
const stripe = new Stripe(config.stripe.test_secret_key);

exports.createInvoiceFromFirestore = functions.region('europe-west1').runWith({ memory: '1GB' }).firestore
  .document('invoices/{invoiceId}')
  .onCreate(async (snap, context) => {
    const invoiceData = snap.data();
    const invoiceId = context.params.invoiceId;

    if (!invoiceData) return null;

    const {
      trainerId,
      email,
      name,
      address,
      items,
      tax_percent,
    } = invoiceData;

    if (!trainerId || !email || !items || !Array.isArray(items)) {
      console.error('Missing required invoice data');
      return null;
    }

    // 1. Zoek of maak een customer op basis van de trainerId
    let customerId: string;

    const trainerDoc = await admin.firestore().collection('trainers').doc(trainerId).get();
    const trainerData = trainerDoc.data();

    if (trainerData?.stripeCustomerId) {
      customerId = trainerData.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email,
        name,
        address,
        metadata: { trainerId },
      });

      customerId = customer.id;

      // Sla het customerId op in de trainer
      await trainerDoc.ref.update({ stripeCustomerId: customerId });
    }

    // 2. Maak invoice items
   await Promise.all(
    items.map(item =>
        stripe.invoiceItems.create({
        customer: customerId,
        description: item.description,
        amount: item.amount,
        currency: item.currency || 'eur',
        })
    )
    );

    // 🔁 Voeg hier korte vertraging toe
    // await new Promise(resolve => setTimeout(resolve, 1000)); // 1 seconde wachten


    let preview;
    for (let attempt = 0; attempt < 5; attempt++) {
    preview = await stripe.invoices.retrieveUpcoming({ customer: customerId });
    if (preview.lines.data.length > 0) break;
    await new Promise(res => setTimeout(res, 500)); // 0.5s tussenpogingen
    }
    // 3. Maak de invoice aan
    const invoice = await stripe.invoices.create({
        customer: customerId,
        pending_invoice_items_behavior: 'include',
        collection_method: 'send_invoice',
        days_until_due: 14,
        auto_advance: true,
        metadata: { firestore_invoice_id: invoiceId },
        custom_fields: [
            {
            name: 'o.v.v.',
            value: 'Kostenplaats 12345',
            }
        ]
    });

    // 4. (Optioneel) BTW toevoegen
    // Stripe no longer supports 'tax_percent'; use 'default_tax_rates' with tax rate IDs
    if (tax_percent) {
      // You need to create tax rates in your Stripe dashboard and store their IDs.
      // For example, you might map tax_percent to a tax rate ID:
      // const taxRateId = getTaxRateIdForPercent(tax_percent);
      // await stripe.invoices.update(invoice.id, {
      //   default_tax_rates: [taxRateId],
      // });
    //   console.warn('tax_percent is set, but Stripe API requires tax rate IDs. Please configure tax rates in Stripe and update this code to use default_tax_rates.');
    }

    // 5. Finaliseer en verstuur de invoice
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
    // const sentInvoice = await stripe.invoices.sendInvoice(invoice.id);

    // 6. Sla de hosted_invoice_url en invoice_id op in Firestore
    await snap.ref.update({
      stripeInvoiceId: finalized.id,
      invoiceUrl: finalized.hosted_invoice_url,
      status: finalized.status,
    });

    return null;
  });