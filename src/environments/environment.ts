// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  useEmulators: false,
  log_on:true,
  verificationUrl:'http://localhost:8100/verify',
  version: '1.4.23',

  firebase :{
    apiKey: "AIzaSyDc7k8O277P-27n7igbMnYtu8iiJUEk0TE",
    authDomain: "lwai-3bac8.firebaseapp.com",
    projectId: "lwai-3bac8",
    storageBucket: "lwai-3bac8.firebasestorage.app",
    messagingSenderId: "760085742751",
    appId: "1:760085742751:web:3da8b69a0df737e8978eaa",
    measurementId: "G-M9BVQYHLYZ"
  },
  
  // firebase: {
  //   apiKey: "demo-project", // Vervang door je eigen API-sleutel
  //   authDomain: "localhost", // Geen echte authDomain nodig voor emulators
  //   projectId: "lwai-3bac8",
  //   storageBucket: "lwai-3bac8.firebasestorage.app",
  //   messagingSenderId: "760085742751",
  //   appId: "1:760085742751:web:3da8b69a0df737e8978eaa",
  // },  

  emulators: {
    firestore: { host: "localhost", port: 8080 },
    auth: { host: "http://localhost", port: 9099 },
    functions: { host: "localhost", port: 5001 },
    hosting: { host: "localhost", port: 5002 },
  },
  


  // firebase :{
  //   apiKey: "AIzaSyDc7k8O277P-27n7igbMnYtu8iiJUEk0TE",
  //   authDomain: "lwai-3bac8.firebaseapp.com",
  //   // authDomain: "localhost",
  //   projectId: "lwai-3bac8",
  //   storageBucket: "lwai-3bac8.firebasestorage.app",
  //   messagingSenderId: "760085742751",
  //   appId: "1:760085742751:web:3da8b69a0df737e8978eaa",
  //   measurementId: "G-M9BVQYHLYZ"
  // },

};