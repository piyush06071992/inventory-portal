// auth.js - CENTRAL CONFIG AND SECURITY ENFORCER
// 0. Security Enforcer: Hide page only if NOT on login page
if (!window.location.pathname.includes("login.html")) {
    document.write('<style>body { display: none !important; }</style>');
}

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
// UNIVERSAL MIDNIGHT & SUBSCRIPTION GUARD
function verifySessionIntegrity() {
    // 1. If we are already on the login page, stop the guard immediately to prevent a loop
    if (window.location.pathname.includes("login.html")) return;

    const activePhone = localStorage.getItem("activeUserPhone");
    if (!activePhone) return (window.location.href = '/login.html');

    firebase.database().ref('shops/' + activePhone).once('value').then((snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const now = new Date();
        const lockoutDate = new Date(data.lockoutEndsAt);

        // 1. Midnight Logout: Clear session if date has changed since last access
        const lastAccess = localStorage.getItem("lastAccessDate");
        const today = now.toDateString();
        
        if (lastAccess && lastAccess !== today) {
            localStorage.clear();
            sessionStorage.clear();
            alert("Session expired at midnight. Please login again.");
            return (window.location.href = '/login.html');
        }
        localStorage.setItem("lastAccessDate", today);

      // 2. Subscription Expiry Guard
        if (data.paymentStatus !== "PAID" && now > lockoutDate) {
            return (window.location.href = '/billing.html');
        }

        // IF ALL CHECKS PASS: Show the page
        document.querySelector('style').remove(); 
        document.body.style.display = 'block';
    });
}
verifySessionIntegrity();
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
