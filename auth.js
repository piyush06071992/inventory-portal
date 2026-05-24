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

    if (!activeUser || !myLoginTime) return;
    if (window.location.pathname.endsWith("login.html") || window.location.pathname === "/") return;

    // Stream the authorized timestamp from the database
    firebase.database().ref('shops/' + activeUser + '/lastLoginTime').on('value', (snapshot) => {
        const serverTime = snapshot.val();
        
        // If the server time is different than what we have locally, someone else logged in!
        if (serverTime && serverTime != myLoginTime) {
            localStorage.clear();
            firebase.auth().signOut();
            alert("Logged out: You are logged in on another device.");
            window.location.href = '/login.html';
        }
    });
}

// Start the check after a short delay
setTimeout(verifySingleSession, 500);
