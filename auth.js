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

// THIS FUNCTION NOW RUNS ONLY WHEN FIREBASE CONFIRMS LOGIN
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        verifySingleSession();
    }
});

function verifySingleSession() {
    const activeUser = localStorage.getItem("activeUserPhone");
    const myLoginTime = localStorage.getItem("myLoginTime");

    if (!activeUser || !myLoginTime) return;
    
    // Ignore login page
    const path = window.location.pathname;
    if (path.includes("login.html") || path === "/" || path === "/index.html") return;

    // Listen for changes
    firebase.database().ref('shops/' + activeUser + '/lastLoginTime').on('value', (snapshot) => {
        const serverTime = snapshot.val();
        
        // If the server time is different from local time, someone else logged in
        if (serverTime && serverTime != myLoginTime) {
            console.log("Session Conflict Detected. Logging out.");
            localStorage.clear();
            firebase.auth().signOut().then(() => {
                alert("Logged out: You are logged in on another device.");
                window.location.href = '/login.html';
            });
        }
    });
}
