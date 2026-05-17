// Firebase Configuration for Business Saarthi
const firebaseConfig = {
  apiKey: "AIzaSyBuYDgbmycHMjHGupeoZV2lvv_Z0n7WyoY",
  authDomain: "business-saarthi.firebaseapp.com",
  projectId: "business-saarthi",
  storageBucket: "business-saarthi.firebasestorage.app",
  messagingSenderId: "556256084111",
  appId: "1:556256084111:web:b06208d94c5f5cae3170fa"
};

// Initialize Firebase globally using the compatibility layer instance
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully on Business Saarthi Portal.");
}
