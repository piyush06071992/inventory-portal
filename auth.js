// ============================================================================
// GLOBAL SESSION GATEKEEPER & DEVICE CONFLICT MANAGER
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

// Inject CSS styles for the Gatekeeper Modal Overlay
const gatekeeperStyles = document.createElement('style');
gatekeeperStyles.innerHTML = `
    .device-modal-overlay-global { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.95); display: flex; align-items: center; justify-content: center; z-index: 100000; padding: 15px; box-sizing: border-box; font-family: sans-serif; }
    .device-modal-card-global { background: #ffffff; width: 100%; max-width: 420px; border-radius: 20px; padding: 25px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); box-sizing: border-box; border: 4px solid #1e3a8a; }
    .device-modal-card-global h3 { color: #1e3a8a; margin: 15px 0 10px 0; font-weight: 700; font-size: 20px; }
    .device-modal-card-global p { color: #64748b; font-size: 14px; margin-bottom: 15px; line-height: 1.5; }
    .timer-circle-global { width: 70px; height: 70px; border-radius: 50%; background: #f1f5f9; border: 3px solid #b91c1c; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; color: #b91c1c; margin: 15px auto; }
    .modal-btn-row-global { display: flex; gap: 10px; margin-top: 20px; }
    .modal-btn-global { padding: 12px; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; width: 100%; cursor: pointer; }
    .btn-allow-global { background-color: #10b981; color: white; }
    .btn-deny-global { background-color: #ef4444; color: white; }
`;
document.head.appendChild(gatekeeperStyles);

function setupGlobalDeviceListener() {
    const activeUser = sessionStorage.getItem("activeUserPhone");
    const myToken = sessionStorage.getItem("mySessionToken");

    // CRITICAL FIX: If a user is logged in (legacy session) but lacks the new secure token, boot them out to refresh it!
    if (activeUser && !myToken && !window.location.pathname.endsWith("login.html") && window.location.pathname !== "/") {
        sessionStorage.clear();
        window.location.href = '/login.html';
        return;
    }

    if (!activeUser || !myToken) return;
    if (window.location.pathname.endsWith("login.html") || window.location.pathname === "/") return;

    if (activeDatabaseStream) activeDatabaseStream.off();

    activeDatabaseStream = firebase.database().ref('shops/' + activeUser);
    activeDatabaseStream.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // SCENARIO 1: We lost the token battle. A new device took over the active session.
        if (data.activeSessionId && data.activeSessionId !== myToken) {
            activeDatabaseStream.off();
            sessionStorage.clear();
            alert("Session Revoked! Your account successfully logged in from a new device.");
            window.location.href = '/login.html';
            return;
        }

        // SCENARIO 2: Someone is knocking at the door. Show the challenge popup.
        if (data.sessionChallenge && data.sessionChallenge.status === "pending") {
            if (data.activeSessionId === myToken && !globalCountdownInterval) {
                triggerGlobalConflictOverlay(activeUser, data.sessionChallenge.requestingToken);
            }
        } 
        
        // Cleanup if the challenge is dropped
        if (!data.sessionChallenge && document.getElementById('global-device-conflict-modal')) {
            clearInterval(globalCountdownInterval);
            globalCountdownInterval = null;
            document.getElementById('global-device-conflict-modal').remove();
        }
    });
}

function triggerGlobalConflictOverlay(shopPhone, requestingToken) {
    if (document.getElementById('global-device-conflict-modal')) return;

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'global-device-conflict-modal';
    modalOverlay.className = 'device-modal-overlay-global';
    
    modalOverlay.innerHTML = `
        <div class="device-modal-card-global">
            <i class="bi bi-exclamation-triangle-fill" style="font-size: 3.5rem; color: #eab308;"></i>
            <h3>New Login Attempt</h3>
            <p>Another device is trying to log in. If you do not deny this request within 15 seconds, you will be logged out.</p>
            <div class="timer-circle-global" id="global-countdown-timer">15</div>
            <div class="modal-btn-row-global">
                <button class="modal-btn-global btn-deny-global" id="global-btn-deny">DENY ACCESS</button>
                <button class="modal-btn-global btn-allow-global" id="global-btn-allow">ALLOW LOGIN</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalOverlay);

    let secondsLeft = 15;
    
    document.getElementById('global-btn-deny').onclick = () => respondToGlobalConflict('deny', shopPhone, requestingToken);
    document.getElementById('global-btn-allow').onclick = () => respondToGlobalConflict('allow', shopPhone, requestingToken);

    globalCountdownInterval = setInterval(() => {
        secondsLeft--;
        const timerUI = document.getElementById('global-countdown-timer');
        if (timerUI) timerUI.innerText = secondsLeft;

        // TIMEOUT EXPIRED: The active device missed the window. Hand over the keys to the new device!
        if (secondsLeft <= 0) {
            clearInterval(globalCountdownInterval);
            globalCountdownInterval = null;
            
            firebase.database().ref('shops/' + shopPhone).update({
                activeSessionId: requestingToken,
                sessionChallenge: null
            }).then(() => {
                sessionStorage.clear();
                window.location.href = '/login.html';
            });
        }
    }, 1000);
}

function respondToGlobalConflict(resolution, shopPhone, requestingToken) {
    clearInterval(globalCountdownInterval);
    globalCountdownInterval = null;
    
    if (document.getElementById('global-device-conflict-modal')) {
        document.getElementById('global-device-conflict-modal').remove();
    }

    if (resolution === 'allow') {
        // User manually clicked allow. Grant access immediately.
        firebase.database().ref('shops/' + shopPhone).update({
            activeSessionId: requestingToken,
            sessionChallenge: null
        }).then(() => {
            sessionStorage.clear();
            window.location.href = '/login.html';
        });
    } else {
        // User manually rejected. Delete the challenge.
        firebase.database().ref('shops/' + shopPhone + '/sessionChallenge').remove();
    }
}

// Guaranteed execution startup wrapper (Fixes PWA loading misses)
function initGatekeeper() { setTimeout(setupGlobalDeviceListener, 500); }
if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", initGatekeeper); } 
else { initGatekeeper(); }
