import * as functions from 'firebase-functions/v1';
import * as responder from '../utils/responder'
import admin from '../firebase'

exports.updateCourse = functions.region('europe-west1')
  .runWith({memory:'1GB'}).firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const db = admin.firestore();

    if(change.after.exists){

        let activeCourses = change.after.data().activeCourseIds
        let oldCourses:any = []
        if(change.before.data()){
            oldCourses = change.before.data().activeCourseIds
        }

        if(activeCourses && oldCourses){
            let newCourses = activeCourses.filter((course:any) => !oldCourses.includes(course))
            let removedCourses = oldCourses.filter((course:any) => !activeCourses.includes(course))

            if(newCourses.length > 0){
                newCourses.forEach((courseId:any) => {
                    let courseRef = db.collection('active_courses').doc(courseId)
                    courseRef.get().then(doc => {
                        if(doc.exists){
                            let course:any = doc.data()
                            course.status = 'active'
                            db.collection(`users/${userId}/courses`).doc(courseId).set(course)
                        }
                    })
                })
            }

            if(removedCourses.length > 0){
                removedCourses.forEach((courseId:any) => {
                    db.collection(`users/${userId}/courses`).doc(courseId).update({
                        status: 'removed'
                    })
                })
            }
        }
        else if(activeCourses && !oldCourses){
            activeCourses.forEach((courseId:any) => {
                let courseRef = db.collection('active_courses').doc(courseId)
                courseRef.get().then(doc => {
                    if(doc.exists){
                        let course:any = doc.data()
                        course.status = 'active'
                        db.collection(`users/${userId}/courses`).doc(courseId).set(course)
                    }
                })
            })
        }

    }

    return null;
  });

exports.enlistCourse = functions.region('europe-west1').https.onCall(async (data,context)=>{
    if(!context.auth){
        return new responder.Message('Not signed in',401)
    }
    //check if course exists
    const db = admin.firestore();
    let courseRef = db.collection('active_courses').doc(data.courseId)
    let course = await courseRef.get()
    if(!course.exists){
        return new responder.Message('Course not found',404)
    }
    //check if user is already enrolled
    let userRef = db.collection(`users`).doc(context.auth.uid)
    let user = await userRef.get()
    if(user.exists){
        let userCourses = user.data().activeCourseIds
        if(userCourses.includes(data.courseId)){
            return new responder.Message('Already enrolled',400)
        }
    }
    //enroll user
    let userCourses = user.data().activeCourseIds || []
    userCourses.push(data.courseId)
    userRef.update({
        activeCourseIds: userCourses
    })
    return new responder.Message('Enrolled',200)
})