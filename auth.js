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

function setupGlobalDeviceListener() {
    setInterval(() => {
        const activeUser = sessionStorage.getItem("activeUserPhone");
        const myToken = sessionStorage.getItem("mySessionToken");

        if (!activeUser || !myToken || globalCountdownInterval) return;
        if (window.location.pathname.includes("login.html")) return;

        firebase.database().ref('shops/' + activeUser).once('value').then((snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            // Scenario A: Force immediate eviction if current session key token changed on database
            if (data.activeSessionId && data.activeSessionId !== myToken) {
                sessionStorage.clear();
                alert("Session Disconnected! Access revoked because this account signed in from another device.");
                window.location.href = '/login.html';
                return;
            }

            // Scenario B: Handle an active request challenge coming from an external machine
            if (data.sessionChallenge && data.sessionChallenge.status === "pending") {
                if (data.activeSessionId === myToken) {
                    triggerGlobalConflictOverlay(activeUser);
                }
            }
        });
    }, 2000); // Swapped tracking check interval pacing up to 2 seconds for aggressive responsiveness
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
            <p>A secondary device is trying to access your workspace. If you do not deny this request within 15 seconds, this terminal session will automatically transfer access control to them.</p>
            <div class="timer-circle-global" id="global-countdown-timer">15</div>
            <div class="modal-btn-row-global">
                <button class="modal-btn-global btn-deny-global" id="global-btn-deny">DENY ACCESS</button>
                <button class="modal-btn-global btn-allow-global" id="global-btn-allow">ALLOW LOGIN</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalOverlay);

    let totalSecondsLeft = 15; // Set precisely back to 15 seconds
    
    document.getElementById('global-btn-deny').onclick = () => respondToGlobalConflict('deny', shopPhone);
    document.getElementById('global-btn-allow').onclick = () => respondToGlobalConflict('allow', shopPhone);

    globalCountdownInterval = setInterval(() => {
        totalSecondsLeft--;
        
        const timerUI = document.getElementById('global-countdown-timer');
        if (timerUI) timerUI.innerText = totalSecondsLeft;

        if (totalSecondsLeft <= 0) {
            clearInterval(globalCountdownInterval);
            globalCountdownInterval = null;
            
            if(document.getElementById('global-device-conflict-modal')) {
                document.getElementById('global-device-conflict-modal').remove();
            }
            
            // 15-Second Timeout: Automatically allow incoming request to claim access rights
            firebase.database().ref('shops/' + shopPhone + '/sessionChallenge').once('value').then((snap) => {
                const chal = snap.val();
                if (chal && chal.status === "pending") {
                    firebase.database().ref('shops/' + shopPhone).update({
                        activeSessionId: chal.requestingToken,
                        sessionChallenge: null
                    }).then(() => {
                        sessionStorage.clear();
                        window.location.href = '/login.html';
                    });
                }
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
        firebase.database().ref('shops/' + shopPhone + '/sessionChallenge').once('value').then((snap) => {
            const chal = snap.val();
            if (chal) {
                firebase.database().ref('shops/' + shopPhone).update({
                    activeSessionId: chal.requestingToken,
                    sessionChallenge: null
                }).then(() => {
                    sessionStorage.clear();
                    window.location.href = '/login.html';
                });
            }
        });
    } else {
        // Clear challenge path state to signify rejection to the requesting client
        firebase.database().ref('shops/' + shopPhone + '/sessionChallenge').remove();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    setupGlobalDeviceListener();
});
