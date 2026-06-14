// MASTER DASHBOARD REGISTRY
// Update this list to automatically change buttons across the Owner Dashboard, Staff Dashboard, and Permission Matrix.
const DASHBOARD_REGISTRY = {
    pos: { label: "SALE POINT (POS)", icon: "bi-cart-dash-fill", color: "color-emerald", url: "/sale-point.html" },
    manageStock: { label: "Manage Stock", icon: "bi-box-seam-fill", color: "color-indigo", isModal: true, modalId: "stock-menu-modal" },
    suppliers: { label: "Suppliers", icon: "bi-truck", color: "color-purple", url: "/suppliers.html" },
    businessDetails: { label: "Business Details", icon: "bi-gear-wide-connected", color: "color-orange", url: "/business-details.html" },
    manageBranches: { label: "Manage Branches", icon: "bi-diagram-3-fill", color: "color-teal", url: "/manage-branches.html" },
    manageStaff: { label: "Manage Staff", icon: "bi-people-fill", color: "color-teal", url: "/manage-staff.html" },
    expenses: { label: "Expenses", icon: "bi-wallet2", color: "color-red", url: "/expenses.html" },
    financeReports: { label: "Finance Reports", icon: "bi-bar-chart-line-fill", color: "color-emerald", url: "/finance-reports.html" },
    udhaarKhata: { label: "Udhaar Khata", icon: "bi-journal-bookmark-fill", color: "color-slate", url: "/udhaar-khata.html" }
};// auth.js - CENTRAL CONFIG AND SECURITY ENFORCER

// 0. Security Enforcer: Hide page only if NOT on login, registration, OR billing page
const isPublicPage = window.location.pathname.includes("login.html") || 
                     window.location.pathname.includes("index.html") || 
                     window.location.pathname.includes("billing.html") ||
                     window.location.pathname === "/";

if (!isPublicPage) {
    // Safely injects the hiding style without wiping the document
    const style = document.createElement('style');
    style.id = 'security-style-tag';
    style.innerHTML = 'body { display: none !important; }';
    document.head.appendChild(style);
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

    // THE FIX: Wait for Firebase to securely attach the token BEFORE querying the database
    firebase.auth().onAuthStateChanged((user) => {
        const db = firebase.firestore();

        // One powerful real-time listener for the company document
        db.collection('companies').doc(activePhone).onSnapshot((doc) => {
            if (!doc.exists) {
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

            // D. IF ALL CHECKS PASS: Reveal the page safely
            const styleTag = document.getElementById('security-style-tag');
            if (styleTag) styleTag.remove(); 
            document.body.style.display = 'block';

        }, (error) => {
            console.error("Security Monitor Error: ", error);
            // Fallback: If permissions genuinely fail, send back to login
            window.location.replace('/login.html');
        });
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
