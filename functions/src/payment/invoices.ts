// functions/src/index.ts

import admin from '../firebase'
import * as functions from 'firebase-functions/v1';
import { config } from '../configs/config-basics';
import Stripe from "stripe";
const stripe = new Stripe(config.stripe.live_secret_key, {
  apiVersion: '2025-02-24.acacia',
});

  exports.createTaxRate = functions.region('europe-west1').runWith({ memory: '1GB' }).firestore
  .document('taxRates/{taxRateId}')
  .onCreate(async (snap, context) => {
    const taxRateData = snap.data();
    
    const taxRate = await stripe.taxRates.create({
      display_name: taxRateData.display_name || 'BTW',
      percentage: taxRateData.percentage || 21,
      inclusive: taxRateData.inclusive || false,
      country: taxRateData.country || 'NL',
    });
    console.log('taxRate:', taxRate);

    await snap.ref.update({
      stripeTaxRateId: taxRate.id,
    });
  });


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
        payment_settings: {
          payment_method_types: [
            'card',             // Dekt Visa, Mastercard, Amex, Diners Club
            'ideal',            // iDEAL
            'paypal',           // PayPal
            'bancontact',       // Bancontact
            'eps',              // EPS
            'customer_balance'  // Bankoverschrijving
          ],
        },
        pending_invoice_items_behavior: 'include',
        collection_method: 'send_invoice',
        days_until_due: 14,
        default_tax_rates: ['txr_1SDMzTBO4NSBi4kfeOYSAXyQ'],
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

exports.createInvoiceElearnings = functions.region('europe-west1').runWith({ memory: '1GB' }).firestore
  .document('invoices_elearnings/{invoiceId}')
  .onCreate(async (snap, context) => {
    const invoiceData = snap.data();
    const invoiceId = context.params.invoiceId;

    if (!invoiceData) return null;

    const {
      email,
      name,
      address,
      items,
      userId,
      reference,
      description,
      footer,
    } = invoiceData;

    if ( !email || !items || !Array.isArray(items)) {
      console.error('Missing required invoice data');
      return null;
    }

    // 1. Zoek of maak een customer op basis van de trainerId
    let customerId: string;

    const customerDoc = await admin.firestore().collection('customers').doc(userId).get();
    const customerData = customerDoc.data();

    // console.log('customerData',JSON.stringify(customerData))


    if(customerData?.stripeCustomerId){
    // if(invoiceData.customerId){
      customerId = customerData.stripeCustomerId;
      // customerId = invoiceData.customerId;

      await stripe.customers.update(customerId,{
        email,
        name,
        address,
        metadata: { userId },
        preferred_locales: ['nl'],
      });

    } else {
      const customer = await stripe.customers.create({
        email,
        name,
        address,
        metadata: { userId },
        preferred_locales: ['nl'],
      });

      customerId = customer.id;

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


    let preview;
    for (let attempt = 0; attempt < 5; attempt++) {
    preview = await stripe.invoices.retrieveUpcoming({ customer: customerId });
    if (preview.lines.data.length > 0) break;
    await new Promise(res => setTimeout(res, 500)); // 0.5s tussenpogingen
    }
    
    const taxRateRef = await admin.firestore().collection('taxRates').where('country', '==', (address.country || 'NL')).where('inclusive', '==', false).limit(1).get();
    const taxRateData = !taxRateRef.empty ? taxRateRef.docs[0].data() : null;
    let taxRateId = taxRateData?.stripeTaxRateId || null;
    if(!taxRateId){
      taxRateId = 'txr_1SERzwBO4NSBi4kfaVmCMi6x'; // Standaard NL excl.21%
    }

    let invoiceItem:any = {
      customer: customerId,
      payment_settings: {
        payment_method_types: [
          'card',             // Dekt Visa, Mastercard, Amex, Diners Club
          'ideal',            // iDEAL
          'paypal',           // PayPal
          'bancontact',       // Bancontact
          'eps',              // EPS
          'customer_balance'  // Bankoverschrijving
        ],
      },
      pending_invoice_items_behavior: 'include',
      collection_method: 'send_invoice',
      days_until_due: 14,
      default_tax_rates: [taxRateId],
      auto_advance: true,
      metadata: { firestore_invoice_id: invoiceId, userId : userId || '' },
    }
    if(reference){
      invoiceItem.custom_fields = [
          {
          name: 'Reference',
          value: reference,
          }
      ]
    }
    if(description){
      invoiceItem.description = description;
    }
    if(footer){
      invoiceItem.footer = footer;
    }

    // Maak de invoice aan
    const invoice = await stripe.invoices.create(invoiceItem);

    // 5. Finaliseer en verstuur de invoice
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
    await stripe.invoices.sendInvoice(invoice.id);

    // 6. Sla de hosted_invoice_url en invoice_id op in Firestore
    await snap.ref.update({
      stripeInvoiceId: finalized.id,
      invoiceUrl: finalized.hosted_invoice_url,
      status: finalized.status,
    });

    const userRef = await admin.firestore().collection('users').where('email', '==', email).get();
    if(!userRef.empty){
      const userId = userRef.docs[0].id;
      // Sla de invoice ook op in de subcollectie van de user
      await admin.firestore().collection('users').doc(userId).collection('elearning_invoices').doc(invoiceId).create({
        stripeInvoiceId: finalized.id,
        invoiceUrl: finalized.hosted_invoice_url,
        status: finalized.status,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return null;
  });