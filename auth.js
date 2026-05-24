// GLOBAL ONE-DEVICE ENFORCER
const firebaseConfig = {
    apiKey: "AIzaSyBuYDgbmycHMjHGupeoZV2lvv_Z0n7WyoY",
    authDomain: "business-saarthi.firebaseapp.com",
    databaseURL: "https://business-saarthi-default-rtdb.firebaseio.com",
    projectId: "business-saarthi",
    storageBucket: "business-saarthi.firebasestorage.app",
    messagingSenderId: "556256084111",
    appId: "1:556256084111:web:14e841b0e7bfff653170fa"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

function verifySingleSession() {
    const activeUser = localStorage.getItem("activeUserPhone");
    const myLoginTime = localStorage.getItem("myLoginTime");

    // 1. Debugging check: See if variables are loaded
    console.log("Auth Debug - Active User:", activeUser);
    console.log("Auth Debug - My Login Time:", myLoginTime);

    if (!activeUser || !myLoginTime) {
        console.log("Auth Debug: No user or login time found in storage.");
        return;
    }
    
    // Ignore login pages
    const path = window.location.pathname;
    if (path.includes("login.html") || path === "/" || path === "/index.html") return;

    // 2. Debugging check: Log the exact database path being queried
    const dbPath = 'shops/' + activeUser + '/lastLoginTime';
    console.log("Auth Debug - Checking Database Path:", dbPath);

    firebase.database().ref(dbPath).on('value', (snapshot) => {
        const serverTime = snapshot.val();
        
        // Check if data actually exists
        if (!snapshot.exists()) {
            console.log("Auth Debug: Path exists in database, but no data found (lastLoginTime is empty).");
            return;
        }

        console.log("Auth Debug - Server Time:", serverTime);
        
        // Strict comparison
        if (serverTime && serverTime != myLoginTime) {
            console.log("Auth Debug: Mismatch found! Logging out.");
            localStorage.clear();
            firebase.auth().signOut().then(() => {
                alert("Logged out: You are logged in on another device.");
                window.location.href = '/login.html';
            });
        }
    });
}

// Start the check after a short delay
setTimeout(verifySingleSession, 500);
