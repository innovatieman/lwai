import admin from '../firebase'
import * as functions from 'firebase-functions/v1';
import * as responder from '../utils/responder'

const db = admin.firestore()
exports.get_public_info = functions.region('europe-west1').https.onCall((data:any,context:any)=>{
    if(!context.auth){
      return new responder.Message('Not authorized',401)
    }
    if(!data.type){
        return new responder.Message('No type provided',400)
    }
    if(data.type=='public_info'){
        if(data.collection&&data.document,data.field){
            return fieldIsAuthorized(data.collection,data.document,data.field,data.subCollection,data.subDoc)
            .then(async (result)=>{
                if(!result){
                    return new responder.Message('Not authorized',401)
                }
                
                if(data.subCollection&&data.subDoc){
                    const docRef = admin.firestore().collection(data.collection).doc(data.document).collection(data.subCollection).doc(data.subDoc)
                    let docData = await docRef.get()
                    if(!docData.exists){
                        return new responder.Message('Document not found',404)
                    }
                    let doc = docData.data()
                    if(!doc[data.field]&&data.field!='all'){
                        return new responder.Message('Field not found',404)
                    }
                    if(data.field=='all'){
                        return new responder.Message(doc)
                    }
                    return new responder.Message(doc[data.field])
                }
                else{
                  const docRef = admin.firestore().collection(data.collection).doc(data.document)
                  let docData = await docRef.get()
                  if(!docData.exists){
                      return new responder.Message('Document not found',404)
                  }
                  let doc = docData.data()
                  if(!doc[data.field]&&data.field!='all'){
                      return new responder.Message('Field not found',404)
                  }
                  if(data.field=='all'){
                      return new responder.Message(doc)
                  }
                  return new responder.Message(doc[data.field])
                }
            })
        }
        else{
            return new responder.Message('No collection, document or field provided',400)
        }
    }
    else{
        return new responder.Message('Type not recognized',400)
    }
})


async function fieldIsAuthorized(collection:string,doc:string,field:string,subCollection?:string,subDoc?:string){
    

    const docRef = admin.firestore().collection('public_info').doc(collection)
    const docData = await docRef.get()
    if(!docData.exists){
        return false
    }
    const docFields = docData.data()

    if(subCollection&&subDoc){
        if(docFields?.subcollections){
            if(docFields?.subcollections[subCollection]&&docFields?.subcollections[subCollection][subDoc]){
                if(docFields?.subcollections[subCollection][subDoc]?.includes(field)){
                    return true
                }
                if(docFields?.subcollections[subCollection][subDoc]?.includes('all')){
                    return true
                }
            }
            if(docFields?.subcollections[subCollection].all){
                if(docFields?.subcollections[subCollection]['all']?.includes(field)){
                    return true
                }
                if(docFields?.subcollections[subCollection]['all']?.includes('all')){
                    return true
                }
            }


        }
    }
    else if(docFields?.documents[doc]?.includes(field)){
        return true
    }
    else if(docFields?.documents['all']?.includes(field)){
        return true
    }
    return false

}

exports.getConversationsByDateRange = functions.region('europe-west1').https.onCall(
  async (data, context) => {

    const user = await db.collection('users').doc(context.auth?.uid).get()
      if(!user.exists){
        console.log("User not found")
          return new responder.Message('Admin not found',404)
      }
      const userData = user.data()
      if(!userData?.isAdmin){
          console.log("Admin not found")
          return new responder.Message('Not authorized',403)
      }

    const { startDate, endDate } = data;

    if (!startDate || !endDate) {
      return new responder.Message("Both startDate and endDate are required.",500)
    }

    const start = Number(startDate);
    const end = Number(endDate);

    if (isNaN(start) || isNaN(end)) {
      return new responder.Message("startDate and endDate must be valid Unix timestamps (in milliseconds).",500)
    }

    try {
      const results: {
        documentId: string;
        parentId: string;
        content: any;
      }[] = [];

      // Get all users
      const usersSnapshot = await db.collection("users").get();

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;

        const conversationsSnapshot = await db
          .collection("users")
          .doc(userId)
          .collection("conversations")
          .where("closed", ">=", start)
          .where("closed", "<=", end)
          .get();

        conversationsSnapshot.forEach((doc) => {
          const data = doc.data();
          results.push({
            documentId: doc.id,
            parentId: userId,
            content: data,
          });
        });
      }

      return new responder.Message(results,200)

    } catch (error) {
      console.error("Error fetching conversations:", error);
      return new responder.Message("Error fetching conversations: " + error,500)
    }
  }
);

exports.admin_all_open_conversations = functions.region('europe-west1').runWith({ memory: '1GB' }).https.onCall(async (data:any,context:any)=>{
    if(!context.auth){
        return new responder.Message('Not authorized',401)
    }

    let user = await admin.firestore().collection('users').doc(context.auth.uid).get()
    if(!user.exists){
        return new responder.Message('User not found',404)
    }
    let userData = user.data()
    if(!userData?.isAdmin){
        return new responder.Message('User not authorized',401)
    }

    try {
        const snapshot = await admin.firestore().collectionGroup('conversations').where('closed', '==', false).limit(2).get();
        const conversations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return new responder.Message(conversations,200);
    } catch (error) {
        console.error('Error fetching open conversations:', error);
        return new responder.Message('Failed to fetch open conversations',500);
    }
});


// exports.admin_get_conversation = functions.region('europe-west1').https.onCall(async (data:any,context:any)=>{
//     if(!context.auth){
//         return {error:'Not authorized',code:401}
//     }

//     let user = await admin.firestore().collection('users').doc(context.auth.uid).get()
//     if(!user.exists){
//         return new responder.Message('User not found',404)
//     }
//     let userData = user.data()
//     if(!userData?.isAdmin){
//         return new responder.Message('User not authorized',401)
//     }

//     if(!data.conversationId){
//         return new responder.Message('No conversationId provided',400)
//     }
//     return admin.firestore().collectionGroup('conversations').where('conversationId','==',data.conversationId).get()
//     .then(async (snap)=>{
//         if(snap.empty){
//             return new responder.Message('No conversation found',404)
//         }
//         let conversation = snap.docs[0].data()

//         let parent = snap.docs[0].ref.parent.parent
//         if(!parent){
//             return new responder.Message('No parent found',404)
//         }
//         let parentData = await parent.get()
//         if(!parentData.exists){
//             return new responder.Message('Parent not found',404)
//         }
//         let parentDoc = parentData.data()
//         conversation.user = parentDoc

//         return new responder.Message(conversation)
//     })
// })

exports.admin_get_conversation = functions.region('europe-west1').https.onCall(async (data, context) => {
    if (!context.auth) {
      return { error: 'Not authorized', code: 401 };
    }
  
    // Controleer of de gebruiker bestaat
    const userSnapshot = await admin.firestore().collection('users').doc(context.auth.uid).get();
    if (!userSnapshot.exists) {
      return { error: 'User not found', code: 404 };
    }
    const userData = userSnapshot.data();
    if (!userData?.isAdmin) {
      return { error: 'User not authorized', code: 401 };
    }
  
    // Controleer op conversationId
    if (!data.conversationId) {
      return { error: 'No conversationId provided', code: 400 };
    }
  
    // Zoek het document in de collectionGroup "conversations" op basis van document-ID
    try {
      // Query met collectionGroup
      const snapshot = await admin.firestore().collectionGroup('conversations').get();
      const conversationDoc = snapshot.docs.find(doc => doc.id === data.conversationId);
  
      if (!conversationDoc) {
        return { error: 'No conversation found with the given ID', code: 404 };
      }
  
      const conversation = conversationDoc.data();
  
      // Haal de parent van het document op
      const parentRef = conversationDoc.ref.parent.parent;
      if (!parentRef) {
        return { error: 'No parent found for the conversation', code: 404 };
      }
  
      const parentSnapshot = await parentRef.get();
      if (!parentSnapshot.exists) {
        return { error: 'Parent not found', code: 404 };
      }
  
      const parentData = parentSnapshot.data();
      conversation.user = parentData;
  
      return { success: true, data: conversation };
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return { error: 'Failed to fetch conversation', code: 500 };
    }
  });

exports.admin_get_all_conversations_from_user = functions.region('europe-west1').https.onCall(async (data, context) => {
    if (!context.auth) {
      return { error: 'Not authorized', code: 401 };
    }
  
    // Controleer of de gebruiker bestaat
    const userSnapshot = await admin.firestore().collection('users').doc(context.auth.uid).get();
    if (!userSnapshot.exists) {
      return { error: 'User not found', code: 404 };
    }
    const userData = userSnapshot.data();
    if (!userData?.isAdmin) {
      return { error: 'User not authorized', code: 401 };
    }
  
    // Controleer op userId
    if (!data.email) {
      return { error: 'No userId provided', code: 400 };
    }
  
    // Zoek alle documenten in de collectionGroup "conversations" op basis van userId
    try {
      //
      // get user met email
        const userSnapshot = await admin.firestore().collection('users').where('email', '==', data.email.toLowerCase()).get();
        if (userSnapshot.empty) {
            return { error: 'User not found', code: 404 };
        }
        let id = userSnapshot.docs[0].id;

        const snapshot = await admin.firestore().collection('users').doc(id).collection('conversations').get();
        // get de doc data en Id
        const conversations = snapshot.docs.map(doc => {
            return { id: doc.id, data: doc.data() };
        })

        return { success: true, data: conversations };
    } catch (error) {
        console.error('Error fetching conversations:', error);
        return { error: 'Failed to fetch conversations', code: 500 };
    }

    
  });

exports.admin_get_all_offers_from_all_users = functions.region('europe-west1').https.onCall(async (data, context) => {
    if (!context.auth) {
      return { error: 'Not authorized', code: 401 };
    }

    // check if admin
    const userSnapshot = await admin.firestore().collection('users').doc(context.auth.uid).get();
    if (!userSnapshot.exists) {
      return { error: 'User not found', code: 404 };
    }
    const userData = userSnapshot.data();
    if (!userData?.isAdmin) {
      return { error: 'User not authorized', code: 401 };
    }
    // get all documents in the groupcollection "offers"
    try {
        const snapshot = await admin.firestore().collectionGroup('offers').get();
        // get de doc data en Id
        const offers = snapshot.docs.map(doc => {
            return { id: doc.id, data: doc.data(), userId: doc.ref.parent.parent?.id};
        })

        return { success: true, data: offers };
    }
    catch (error) {
        console.error('Error fetching offers:', error);
        return { error: 'Failed to fetch offers', code: 500 };
    }

})