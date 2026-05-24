// GLOBAL ONE-DEVICE ENFORCER (FOOLPROOF)
const firebaseConfig = {
    apiKey: "AIzaSyBuYDgbmycHMjHGupeoZV2lvv_Z0n7WyoY",
    authDomain: "business-saarthi.firebaseapp.com",
    databaseURL: "https://business-saarthi-default-rtdb.firebaseio.com",
    projectId: "business-saarthi",
    storageBucket: "business-saarthi.firebasestorage.app",
    messagingSenderId: "556256084111",
    appId: "1:556256084111:web:14e841b0e7bfff653170fa"
};

// Initialize only if not initialized
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// THE FOOLPROOF LISTENER
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        console.log("Auth Debug: User is logged in. Starting tracker...");
        verifySingleSession();
    }
});

function verifySingleSession() {
    const activeUser = localStorage.getItem("activeUserPhone");
    const myLoginTime = localStorage.getItem("myLoginTime");

    if (!activeUser || !myLoginTime) {
        console.log("Auth Debug: No local storage data found.");
        return;
    }

    // Ignore login pages
    if (window.location.pathname.includes("login.html") || window.location.pathname === "/") return;

    // Start the listener
    firebase.database().ref('shops/' + activeUser + '/lastLoginTime').on('value', (snapshot) => {
        const serverTime = snapshot.val();
        console.log("Auth Debug: Server Time is", serverTime, "Local Time is", myLoginTime);
        
        if (serverTime && serverTime != myLoginTime) {
            console.log("Auth Debug: TIMESTAMPS DON'T MATCH. LOGGING OUT.");
            localStorage.clear();
            firebase.auth().signOut().then(() => {
                window.location.href = '/login.html';
            });
        }
    });
}
