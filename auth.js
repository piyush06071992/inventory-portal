// auth.js - CENTRAL CONFIG AND SECURITY ENFORCER

// 0. Security Enforcer: Hide page only if NOT on login, registration, OR billing page
const isPublicPage = window.location.pathname.includes("login.html") || 
                     window.location.pathname.includes("index.html") || 
                     window.location.pathname.includes("billing.html") ||
                     window.location.pathname === "/";

if (!isPublicPage) {
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

// 2. UNIVERSAL SECURITY & SUBSCRIPTION MONITOR (FIRESTORE)
function initializeSecurityMonitor() {
    if (isPublicPage) return;

    const activePhone = localStorage.getItem("activeUserPhone");
    const myLoginTime = localStorage.getItem("myLoginTime");

    if (!activePhone || !myLoginTime) {
        window.location.replace('/login.html');
        return;
    }

    const db = firebase.firestore();

    // One powerful real-time listener for the company document
    db.collection('companies').doc(activePhone).onSnapshot((doc) => {
        if (!doc.exists) {
            // Account deleted or doesn't exist
            forceLogout("Account not found. Please log in again.");
            return;
        }

        const data = doc.data();
        const now = new Date();

        // A. Midnight Check
        const lastAccess = localStorage.getItem("lastAccessDate");
        const today = now.toDateString();
        
        if (lastAccess && lastAccess !== today) {
            forceLogout("Session expired at midnight. Please login again.");
            return;
        }
        localStorage.setItem("lastAccessDate", today);

        // B. Subscription Expiry Guard
        const lockoutDate = new Date(data.lockoutEndsAt);
        if (data.paymentStatus !== "PAID" && now > lockoutDate) {
            window.location.replace('/billing.html');
            return;
        }

        // C. Multi-Device Single Session Check
        if (data.lastLoginTime && data.lastLoginTime !== myLoginTime) {
            forceLogout("SECURITY ALERT: You are logged in on another device.");
            return;
        }

        // D. IF ALL CHECKS PASS: Reveal the page
        const styleTag = document.querySelector('style');
        if (styleTag) styleTag.remove(); 
        document.body.style.display = 'block';

    }, (error) => {
        console.error("Security Monitor Error: ", error);
        // Fallback: If permissions fail, send back to login
        window.location.replace('/login.html');
    });
}

// Helper function to handle clean logouts
function forceLogout(message) {
    localStorage.clear();
    sessionStorage.clear();
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().signOut().then(() => {
            alert(message);
            window.location.replace('/login.html');
        }).catch(() => {
            window.location.replace('/login.html');
        });
    } else {
        alert(message);
        window.location.replace('/login.html');
    }
}

// 3. Start the monitor automatically when the page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSecurityMonitor);
} else {
    initializeSecurityMonitor();
}
