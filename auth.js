// This file now only holds the LOGIC. No initialization here.
function verifySingleSession() {
    const activeUser = localStorage.getItem("activeUserPhone");
    const myLoginTime = localStorage.getItem("myLoginTime");

    if (!activeUser || !myLoginTime) return;
    if (window.location.pathname.includes("login.html")) return;

    // Use window.firebase because it will be loaded by the HTML
    window.firebase.database().ref('shops/' + activeUser + '/lastLoginTime').on('value', (snapshot) => {
        const serverTime = snapshot.val();
        if (serverTime && serverTime != myLoginTime) {
            localStorage.clear();
            window.firebase.auth().signOut().then(() => {
                alert("Logged out: You are logged in on another device.");
                window.location.href = '/login.html';
            });
        }
    });
}
