import * as functions from 'firebase-functions/v1';

import admin from '../firebase'

exports.updateCourses = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const db = admin.firestore();

    if(change.after.exists){

        let activeCourses = change.after.data().activeCourseIds
        let oldCourses = change.before.data().activeCourseIds

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