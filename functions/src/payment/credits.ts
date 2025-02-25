import admin from '../firebase'
import * as functions from 'firebase-functions/v1';
import * as responder from '../utils/responder'

exports.buyCredits = functions.region('europe-west1').https.onCall(async (data: any, context: any) => {
    // Check op authenticatie
    if (!context.auth) {
        return new responder.Message('Not authorized', 401);
    }

    // Check op het bedrag
    if (!data.amount) {
        return new responder.Message('No amount provided', 400);
    }

    try {
        // Haal de gebruiker op
        const doc = await admin.firestore().collection('users').doc(context.auth.uid).get();
        let user = doc.data();

        if (!user) {
            return new responder.Message('User not found', 404);
        }

        // Zet credits op 0 als het ontbreekt
        if (!user.credits) {
            user.credits = 0;
        }

        // Update de credits
        user.credits += data.amount;
        await admin.firestore().collection('users').doc(context.auth.uid).update(user);

        // Voeg de transactie toe
        await admin.firestore().collection('users').doc(context.auth.uid).collection('transactions').add({
            type: 'credit_purchase',
            amount: data.amount,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            user: context.auth.uid,
            status: 'success',
            paymentMethod: {
                type: 'credit card',
            },
            valid_until: admin.firestore.Timestamp.fromDate(
                new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 30)
            ),
        });

        return new responder.Message('Success');
    } catch (e) {
        console.error(e);
        return new responder.Message('Error', 500);
    }
});

exports.creditsBought = functions.region('europe-west1').firestore
  .document('customers/{userId}/payments/{paymentId}')
  .onCreate(async (snap:any, context:any) => {
    console.log('Payment created');
    let payment = snap.data();
    if(payment.status == 'succeeded' && payment.description !== 'Subscription creation' && payment.items?.length > 0 && payment.items[0].price){
        await admin.firestore().collection('processed_payments').doc(context.params.paymentId).set({processed: true});
        const user = await admin.firestore().collection('users').doc(context.params.userId).get();
        let userData = user.data();
        let currentCredits = 0;
        if(userData?.credits){
            currentCredits = userData.credits;
        }

        const product = await admin.firestore().collection('products').doc(payment.items[0].price.product).get();
        const productData = product.data();

        console.log('Product data', JSON.stringify(productData));

        await admin.firestore().collection('users').doc(context.params.userId).update({
            credits: currentCredits + parseInt(productData.metadata.credits)
        });
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
        const user = await admin.firestore().collection('users').doc(context.params.userId).get();
        let userData = user.data();
        let currentCredits = 0;
        if(userData?.credits){
            currentCredits = userData.credits;
        }

        const product = await admin.firestore().collection('products').doc(payment.items[0].price.product).get();
        const productData = product.data();

        await admin.firestore().collection('users').doc(context.params.userId).update({
            credits: currentCredits + parseInt(productData.metadata.credits)
        });
    }
    
  });