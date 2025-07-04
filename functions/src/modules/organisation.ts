import * as functions from 'firebase-functions/v1';
import { db } from '../firebase'
import * as responder from '../utils/responder'
import admin from '../firebase'

exports.uploadLogo = functions
  .region('europe-west1')
  .runWith({ memory: '1GB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      return { error: 'Not authorized', code: 401 };
    }

    if(!data?.trainerId){
      return { error: 'No Input', code: 400 };
    }

    const trainerRef = db.collection('trainers').doc(data.trainerId);
    const trainerDoc = await trainerRef.get();
    if (!trainerDoc.exists) {
      return { error: 'Trainer not found', code: 404 };
    }
    const trainerData = trainerDoc.data();
    if (!trainerData) {
      return { error: 'Trainer data not found', code: 404 };
    }
    if (!trainerData.admins.includes(context.auth.uid)) {
      return { error: 'Not authorized to upload logo', code: 403 };
    }
    if (!data.logo || typeof data.logo !== 'string') {
      return { error: 'Invalid logo data', code: 400 };
    }
    const logoUrl = data.logo;
    const updatedData = {
      logo: logoUrl,
    };
    await trainerRef.update(updatedData);
    return new responder.Message('Logo updated successfully', 200)
  });


exports.requestFromTrainerAdmin = functions
  .region('europe-west1')
  .runWith({ memory: '1GB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      return { error: 'Not authorized', code: 401 };
    }

    if(!data?.trainerId){
      return { error: 'No Input', code: 400 };
    }

    const trainerRef = db.collection('trainers').doc(data.trainerId);
    const trainerDoc = await trainerRef.get();
    if (!trainerDoc.exists) {
      return { error: 'Trainer not found', code: 404 };
    }
    const trainerData = trainerDoc.data();
    if (!trainerData) {
      return { error: 'Trainer data not found', code: 404 };
    }
    if (!trainerData.admins.includes(context.auth.uid)) {
      return { error: 'Not authorized to make request', code: 403 };
    }
    if (!data.request || typeof data.request !== 'string') {
      return { error: 'Invalid request data', code: 400 };
    }
    
    const senderRef = db.collection('users').doc(context.auth.uid);
    const senderDoc = await senderRef.get();
    if (!senderDoc.exists) {
      return { error: 'Sender not found', code: 404 };
    }
    const senderData = senderDoc.data();
    if (!senderData) {
      return { error: 'Sender data not found', code: 404 };
    }

    let request = data.request.trim().split('\n').join('<br>');

    const mailObj = {
      template:'free',
      language:'nl',
      to: 'alicia@innovatieman.nl',
      subject: `Verzoek van ${trainerData.name}`,
      data:{
        subject: `Verzoek van ${trainerData.name}`,
        content: `${request}<br><br>Afzender: ${senderData.displayName} (${context.auth.token.email})`,
        replyTo: context.auth.token.email,
      }
    }
    await db.collection('emailsToProcess').add(mailObj);
    return new responder.Message('Request sent successfully', 200)
  });


exports.searchNewAdmin = functions
  .region('europe-west1')
  .runWith({ memory: '1GB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      return { error: 'Not authorized', code: 401 };
    }

    if(!data?.trainerId){
      return { error: 'No Input', code: 400 };
    }

    const trainerRef = db.collection('trainers').doc(data.trainerId);
    const trainerDoc = await trainerRef.get();
    if (!trainerDoc.exists) {
      return { error: 'Trainer not found', code: 404 };
    }
    const trainerData = trainerDoc.data();
    if (!trainerData) {
      return { error: 'Trainer data not found', code: 404 };
    }
    if (!trainerData.admins.includes(context.auth.uid)) {
      return { error: 'Not authorized to make request', code: 403 };
    }
    if (!data.email || typeof data.email !== 'string') {
      return { error: 'Invalid admin data', code: 400 };
    }
    
    let newAdmin:any;
    try {
      newAdmin = await admin.auth().getUserByEmail(data.email)
      if (!newAdmin) {
        return new responder.Message('User not found', 404)
      }
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return new responder.Message('User not found', 404)
    }

    const newAdminRef = db.collection('users').doc(newAdmin.uid);
    const newAdminDoc = await newAdminRef.get();
    if (!newAdminDoc.exists) {
      return { error: 'New admin user not found', code: 404 };
    }
    const newAdminData = newAdminDoc.data();

    let newAdminObj = {
      uid: newAdmin.uid,
      email: newAdmin.email,
      displayName: newAdminData?.displayName || 'Unknown User',
    }
    
    return new responder.Message(newAdminObj, 200)
  });

exports.addNewAdmin = functions
  .region('europe-west1')
  .runWith({ memory: '1GB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      return { error: 'Not authorized', code: 401 };
    }

    if(!data?.trainerId){
      return { error: 'No Input', code: 400 };
    }

    const trainerRef = db.collection('trainers').doc(data.trainerId);
    const trainerDoc = await trainerRef.get();
    if (!trainerDoc.exists) {
      return { error: 'Trainer not found', code: 404 };
    }
    const trainerData = trainerDoc.data();
    if (!trainerData) {
      return { error: 'Trainer data not found', code: 404 };
    }
    if (!trainerData.admins.includes(context.auth.uid)) {
      return { error: 'Not authorized to make request', code: 403 };
    }
    if (!data.email || typeof data.email !== 'string' || !data.uid) {
      return { error: 'Invalid admin data', code: 400 };
    }
    
    let newAdmin:any;
    try {
      newAdmin = await admin.auth().getUserByEmail(data.email)
      if (!newAdmin) {
        return new responder.Message('User not found', 404)
      }
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return new responder.Message('User not found', 404)
    }

    const newAdminRef = db.collection('users').doc(newAdmin.uid);
    const newAdminDoc = await newAdminRef.get();
    if (!newAdminDoc.exists) {
      return { error: 'New admin user not found', code: 404 };
    }
    const newAdminData = newAdminDoc.data();

    await trainerRef.update({
      admins: admin.firestore.FieldValue.arrayUnion(newAdmin.uid),
    });

     await trainerRef.update({
      adminsList: admin.firestore.FieldValue.arrayUnion({
        uid: newAdmin.uid,
        email: newAdmin.email,
        displayName: newAdminData?.displayName || 'Unknown User'
      })
    })
    
    return new responder.Message('admin_added', 200)
  });

exports.deleteAdmin = functions
  .region('europe-west1')
  .runWith({ memory: '1GB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      return { error: 'Not authorized', code: 401 };
    }

    if(!data?.trainerId){
      return { error: 'No Input', code: 400 };
    }

    const trainerRef = db.collection('trainers').doc(data.trainerId);
    const trainerDoc = await trainerRef.get();
    if (!trainerDoc.exists) {
      return { error: 'Trainer not found', code: 404 };
    }
    const trainerData = trainerDoc.data();
    if (!trainerData) {
      return { error: 'Trainer data not found', code: 404 };
    }
    if (!trainerData.admins.includes(context.auth.uid)) {
      return { error: 'Not authorized to make request', code: 403 };
    }
    if (!data.uid || typeof data.uid !== 'string') {
      return { error: 'Invalid admin data', code: 400 };
    }

    const adminToRemove = trainerData.adminsList.find((a: any) => a.uid === data.uid);

    if (adminToRemove) {
      await trainerRef.update({
        admins: admin.firestore.FieldValue.arrayRemove(data.uid),
        adminsList: admin.firestore.FieldValue.arrayRemove(adminToRemove)
      });
    } else {
      console.log('Admin not found in adminsList:', data.uid);
    }

    return new responder.Message('admin_deleted', 200)
  });
