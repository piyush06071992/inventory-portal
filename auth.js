// Global Session Listener and Device Gatekeeper Engine
let globalCountdownInterval = null;

// Ensure Bootstrap Icons are loaded for the warning symbols across all pages
if (!document.querySelector('link[href*="bootstrap-icons"]')) {
    const iconLink = document.createElement('link');
    iconLink.rel = 'stylesheet';
    iconLink.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css';
    document.head.appendChild(iconLink);
}

// Inject Dynamic CSS styles required for the multi-device gatekeeper modal safely onto any page
const gatekeeperStyles = document.createElement('style');
gatekeeperStyles.innerHTML = `
    .device-modal-overlay-global {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(15, 23, 42, 0.9); display: flex; align-items: center; justify-content: center;
        z-index: 100000; padding: 15px; box-sizing: border-box; font-family: sans-serif;
    }
    .device-modal-card-global {
        background: #ffffff; width: 100%; max-width: 400px; border-radius: 20px; padding: 25px;
        text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); box-sizing: border-box;
        border: 4px solid #1e3a8a;
    }
    .device-modal-card-global h3 { color: #1e3a8a; margin: 15px 0 10px 0; font-weight: 700; font-size: 20px; }
    .device-modal-card-global p { color: #64748b; font-size: 14px; margin-bottom: 15px; line-height: 1.5; }
    .timer-circle-global {
        width: 60px; height: 60px; border-radius: 50%; background: #f1f5f9; border: 3px solid #b91c1c;
        display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700;
        color: #b91c1c; margin: 15px auto;
    }
    .modal-btn-row-global { display: flex; gap: 10px; margin-top: 20px; }
    .modal-btn-global { padding: 12px; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; width: 100%; cursor: pointer; }
    .btn-allow-global { background-color: #10b981; color: white; }
    .btn-deny-global { background-color: #ef4444; color: white; }
`;
document.head.appendChild(gatekeeperStyles);

function setupGlobalDeviceListener() {
    setInterval(() => {
        const activeUser = sessionStorage.getItem("activeUserPhone");
        const myToken = sessionStorage.getItem("mySessionToken");

        // Skip tracking if the user isn't actively authenticated on this screen instance
        if (!activeUser || !myToken || globalCountdownInterval) return;

        // Skip checking if we are currently standing on the login view itself
        if (window.location.pathname.includes("login.html")) return;

        firebase.database().ref('shops/' + activeUser).once('value').then((snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            // Scenario A: Another session token took authority over the node pointer
            if (data.activeSessionId && data.activeSessionId !== myToken) {
                sessionStorage.clear();
                alert("Session Disconnected! Access revoked because this account signed in from another device.");
                window.location.href = '/login.html';
                return;
            }

            // Scenario B: Incoming secondary device login detected -> Intercept current session page
            if (data.sessionChallenge && data.sessionChallenge.status === "pending") {
                // Secure Check: Only trigger alert modal if this device is the authorized owner token
                if (data.activeSessionId === myToken) {
                    triggerGlobalConflictOverlay(activeUser);
                }
            }
        });
    }, 3000);
}

function triggerGlobalConflictOverlay(shopPhone) {
    if (document.getElementById('global-device-conflict-modal')) return;

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'global-device-conflict-modal';
    modalOverlay.className = 'device-modal-overlay-global';
    
    modalOverlay.innerHTML = `
        <div class="device-modal-card-global">
            <i class="bi bi-exclamation-triangle-fill" style="font-size: 3.5rem; color: #eab308;"></i>
            <h3>Another Device Login Attempt</h3>
            <p>A second machine is attempting to log in using your account credentials. Do you want to allow them access?</p>
            <div class="timer-circle-global" id="global-countdown-timer">15</div>
            <div class="modal-btn-row-global">
                <button class="modal-btn-global btn-deny-global" id="global-btn-deny">DENY ACCESS</button>
                <button class="modal-btn-global btn-allow-global" id="global-btn-allow">ALLOW</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalOverlay);

    let durationLeft = 15;
    
    document.getElementById('global-btn-deny').onclick = () => respondToGlobalConflict('deny', shopPhone);
    document.getElementById('global-btn-allow').onclick = () => respondToGlobalConflict('allow', shopPhone);

    globalCountdownInterval = setInterval(() => {
        durationLeft--;
        const timerUI = document.getElementById('global-countdown-timer');
        if (timerUI) timerUI.innerText = durationLeft;

        if (durationLeft <= 0) {
            clearInterval(globalCountdownInterval);
            globalCountdownInterval = null;
            
            if(document.getElementById('global-device-conflict-modal')) {
                document.getElementById('global-device-conflict-modal').remove();
            }
            
            // Timeout condition: Force current device session logout, ceding control to new device
            sessionStorage.clear();
            firebase.database().ref('shops/' + shopPhone + '/sessionChallenge').update({
                status: "allowed"
            }).then(() => {
                window.location.href = '/login.html';
            });
        }
    }, 1000);
}

function respondToGlobalConflict(resolution, shopPhone) {
    clearInterval(globalCountdownInterval);
    globalCountdownInterval = null;
    
    if (document.getElementById('global-device-conflict-modal')) {
        document.getElementById('global-device-conflict-modal').remove();
    }

    if (resolution === 'allow') {
        firebase.database().ref('shops/' + shopPhone + '/sessionChallenge').update({
            status: "allowed"
        }).then(() => {
            sessionStorage.clear();
            window.location.href = '/login.html';
        });
    } else {
        firebase.database().ref('shops/' + shopPhone + '/sessionChallenge').update({
            status: "denied"
        });
    }
}

// Automatically mount background runtime listener processes once page elements mount safely
document.addEventListener("DOMContentLoaded", () => {
    setupGlobalDeviceListener();
});
