// ============================================================================
// GLOBAL SESSION GATEKEEPER & DEVICE CONFLICT MANAGER
// Runs continuously on all pages to ensure single-device authorization
// ============================================================================

let globalCountdownInterval = null;
let activeDatabaseStream = null;

// Dynamically inject Bootstrap Icons for the warning modal UI if missing
if (!document.querySelector('link[href*="bootstrap-icons"]')) {
    const iconLink = document.createElement('link');
    iconLink.rel = 'stylesheet';
    iconLink.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css';
    document.head.appendChild(iconLink);
}

// Dynamically inject the CSS styles for the Gatekeeper Modal Overlay
const gatekeeperStyles = document.createElement('style');
gatekeeperStyles.innerHTML = `
    .device-modal-overlay-global {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(15, 23, 42, 0.9); display: flex; align-items: center; justify-content: center;
        z-index: 100000; padding: 15px; box-sizing: border-box; font-family: sans-serif;
    }
    .device-modal-card-global {
        background: #ffffff; width: 100%; max-width: 420px; border-radius: 20px; padding: 25px;
        text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); box-sizing: border-box;
        border: 4px solid #1e3a8a;
    }
    .device-modal-card-global h3 { color: #1e3a8a; margin: 15px 0 10px 0; font-weight: 700; font-size: 20px; }
    .device-modal-card-global p { color: #64748b; font-size: 14px; margin-bottom: 15px; line-height: 1.5; }
    .timer-circle-global {
        width: 70px; height: 70px; border-radius: 50%; background: #f1f5f9; border: 3px solid #b91c1c;
        display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700;
        color: #b91c1c; margin: 15px auto;
    }
    .modal-btn-row-global { display: flex; gap: 10px; margin-top: 20px; }
    .modal-btn-global { padding: 12px; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; width: 100%; cursor: pointer; }
    .btn-allow-global { background-color: #10b981; color: white; }
    .btn-deny-global { background-color: #ef4444; color: white; }
`;
document.head.appendChild(gatekeeperStyles);

// Initialize the real-time global listener
function setupGlobalDeviceListener() {
    const activeUser = sessionStorage.getItem("activeUserPhone");
    const myToken = sessionStorage.getItem("mySessionToken");

    // Do not run the global listener if the user isn't logged in, or if they are on the login page itself
    if (!activeUser || !myToken) return;
    if (window.location.pathname.endsWith("login.html") || window.location.pathname === "/") return;

    // Clear any duplicate streams to prevent memory leaks during page navigation
    if (activeDatabaseStream) activeDatabaseStream.off();

    // Bind a live, continuous stream to the user's master shop profile node
    activeDatabaseStream = firebase.database().ref('shops/' + activeUser);
    
    activeDatabaseStream.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // ==============================================================================
        // SCENARIO 1: FORCED EVICTION
        // The active token on the server no longer matches this browser's token.
        // This means a new device successfully logged in. Kick this device out immediately!
        // ==============================================================================
        if (data.activeSessionId && data.activeSessionId !== myToken) {
            activeDatabaseStream.off();
            sessionStorage.clear();
            alert("Session Revoked! Your account has successfully logged in from another device.");
            window.location.href = '/login.html';
            return;
        }

        // ==============================================================================
        // SCENARIO 2: INCOMING LOGIN CHALLENGE
        // Another device is trying to log in right now and sent a challenge request.
        // ==============================================================================
        if (data.sessionChallenge && data.sessionChallenge.status === "pending") {
            // CRITICAL CHECK: Only show the popup if THIS device is the currently authorized master device!
            if (data.activeSessionId === myToken && !globalCountdownInterval) {
                triggerGlobalConflictOverlay(activeUser);
            }
        } 
        
        // Cleanup: If the challenge node vanishes (e.g., the other device gave up or it timed out), remove the popup UI
        if (!data.sessionChallenge && document.getElementById('global-device-conflict-modal')) {
            clearInterval(globalCountdownInterval);
            globalCountdownInterval = null;
            document.getElementById('global-device-conflict-modal').remove();
        }
    });
}

// Function to construct and display the 15-second warning UI
function triggerGlobalConflictOverlay(shopPhone) {
    if (document.getElementById('global-device-conflict-modal')) return;

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'global-device-conflict-modal';
    modalOverlay.className = 'device-modal-overlay-global';
    
    modalOverlay.innerHTML = `
        <div class="device-modal-card-global">
            <i class="bi bi-exclamation-triangle-fill" style="font-size: 3.5rem; color: #eab308;"></i>
            <h3>New Login Attempt</h3>
            <p>Another device is trying to log in. If you do not deny this request within 15 seconds, you will be logged out and they will be granted access.</p>
            <div class="timer-circle-global" id="global-countdown-timer">15</div>
            <div class="modal-btn-row-global">
                <button class="modal-btn-global btn-deny-global" id="global-btn-deny">DENY ACCESS</button>
                <button class="modal-btn-global btn-allow-global" id="global-btn-allow">ALLOW LOGIN</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalOverlay);

    let secondsLeft = 15;
    
    // Wire up the dynamic action buttons
    document.getElementById('global-btn-deny').onclick = () => respondToGlobalConflict('deny', shopPhone);
    document.getElementById('global-btn-allow').onclick = () => respondToGlobalConflict('allow', shopPhone);

    // Start the countdown timer loop
    globalCountdownInterval = setInterval(() => {
        secondsLeft--;
        const timerUI = document.getElementById('global-countdown-timer');
        if (timerUI) timerUI.innerText = secondsLeft;

        // TIMEOUT EXPIRED
        if (secondsLeft <= 0) {
            clearInterval(globalCountdownInterval);
            globalCountdownInterval = null;
            
            // Allow the new device to take control by updating the challenge status
            firebase.database().ref('shops/' + shopPhone + '/sessionChallenge').update({
                status: "allowed"
            });
            // Note: We don't need to manually clear sessionStorage here. 
            // Updating the status to "allowed" will trigger the new device to update the activeSessionId.
            // Once the activeSessionId changes, SCENARIO 1 (Forced Eviction) will automatically kick this device out!
        }
    }, 1000);
}

// Function to handle the user clicking Allow or Deny
function respondToGlobalConflict(resolution, shopPhone) {
    clearInterval(globalCountdownInterval);
    globalCountdownInterval = null;
    
    if (document.getElementById('global-device-conflict-modal')) {
        document.getElementById('global-device-conflict-modal').remove();
    }

    if (resolution === 'allow') {
        // Approve the new device
        firebase.database().ref('shops/' + shopPhone + '/sessionChallenge').update({
            status: "allowed"
        });
    } else {
        // Reject the new device by deleting the pending challenge from the database
        firebase.database().ref('shops/' + shopPhone + '/sessionChallenge').remove();
    }
}

// Mount the global listener automatically once the webpage finishes rendering
document.addEventListener("DOMContentLoaded", () => {
    // Add a slight delay to ensure Firebase initializes completely before we try to stream data
    setTimeout(setupGlobalDeviceListener, 600);
});
