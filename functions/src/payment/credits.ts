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
    const userCredits = await admin.firestore().collection('users').doc(userId).collection('credits').doc('credits').get();
    let creditsData = userCredits.data();
    let currentCredits = 0;
    if(creditsData?.total){
        currentCredits = creditsData.total;
    }
    
    await admin.firestore().collection('users').doc(userId).collection('credits').doc('credits').update({
        total: currentCredits + parseInt(productData.metadata.credits)
    });
  }