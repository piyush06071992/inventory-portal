// auth.js - CENTRAL CONFIG AND SECURITY ENFORCER

const firebaseConfig = {
    apiKey: "AIzaSyBuYDgbmycHMjHGupeoZV2lvv_Z0n7WyoY",
    authDomain: "business-saarthi.firebaseapp.com",
    databaseURL: "https://business-saarthi-default-rtdb.firebaseio.com",
    projectId: "business-saarthi",
    storageBucket: "business-saarthi.firebasestorage.app",
    messagingSenderId: "556256084111",
    appId: "1:556256084111:web:14e841b0e7bfff653170fa"
};

// 1. Initialize Firebase centrally
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// 2. The One-Device Security Logic
function verifySingleSession() {
    const activeUser = localStorage.getItem("activeUserPhone");
    const myLoginTime = localStorage.getItem("myLoginTime");

    if (!activeUser || !myLoginTime) return;
    
    // Do not run the logout check on the login page itself
    if (window.location.pathname.includes("login.html")) return;

    firebase.database().ref('shops/' + activeUser + '/lastLoginTime').on('value', (snapshot) => {
        const serverTime = snapshot.val();
        
        if (serverTime && serverTime != myLoginTime) {
            localStorage.clear();
            firebase.auth().signOut().then(() => {
                alert("Logged out: You are logged in on another device.");
                window.location.href = '/login.html';
            });
        }
    });
}

// 3. Start the monitor automatically when the page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verifySingleSession);
} else {
    verifySingleSession();
}
