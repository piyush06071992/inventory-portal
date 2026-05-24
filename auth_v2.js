// ============================================================================
// GLOBAL SESSION GATEKEEPER - SOFT LOCK EDITION (v2)
// ============================================================================

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

let globalCountdownInterval = null;
let activeDatabaseStream = null;

if (!document.querySelector('link[href*="bootstrap-icons"]')) {
    const iconLink = document.createElement('link');
    iconLink.rel = 'stylesheet';
    iconLink.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css';
    document.head.appendChild(iconLink);
}

const gatekeeperStyles = document.createElement('style');
gatekeeperStyles.innerHTML = `
    .device-modal-overlay-global { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.95); display: flex; align-items: center; justify-content: center; z-index: 100000; padding: 15px; box-sizing: border-box; font-family: sans-serif; backdrop-filter: blur(4px); }
    .device-modal-card-global { background: #ffffff; width: 100%; max-width: 420px; border-radius: 20px; padding: 25px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); box-sizing: border-box; border: 4px solid #1e3a8a; }
    .device-modal-card-global h3 { color: #1e3a8a; margin: 15px 0 10px 0; font-weight: 700; font-size: 20px; }
    .device-modal-card-global p { color: #64748b; font-size: 14px; margin-bottom: 15px; line-height: 1.5; }
    .timer-circle-global { width: 70px; height: 70px; border-radius: 50%; background: #f1f5f9; border: 3px solid #b91c1c; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; color: #b91c1c; margin: 15px auto; }
    .modal-btn-row-global { display: flex; gap: 10px; margin-top: 20px; }
    .modal-btn-global { padding: 12px; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; width: 100%; cursor: pointer; }
    .btn-allow-global { background-color: #10b981; color: white; }
    .btn-deny-global { background-color: #ef4444; color: white; }
    .btn-reclaim-global { background-color: #3b82f6; color: white; width: 100%; padding: 14px; margin-top: 10px; border-radius: 10px; border: none; font-weight: bold; font-size: 16px; cursor: pointer; }
`;
document.head.appendChild(gatekeeperStyles);

function generateUniqueTokenId() { return 'session_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36); }

function setupGlobalDeviceListener() {
    const activeUser = localStorage.getItem("activeUserPhone");
    const myToken = localStorage.getItem("mySessionToken");

    if (!activeUser || !myToken) return;
    if (window.location.pathname.endsWith("login.html") || window.location.pathname === "/") return;

    if (activeDatabaseStream) activeDatabaseStream.off();

    activeDatabaseStream = firebase.database().ref('shops/' + activeUser);
    activeDatabaseStream.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // SCENARIO 1: SOFT LOCK (Data Protection)
        // Another device logged in. Freeze the screen, but DO NOT refresh or delete data.
        if (data.activeSessionId && data.activeSessionId !== myToken) {
            triggerSoftLockOverlay(activeUser);
            return;
        }

        // If we regained the token (Reclaimed), remove the Soft Lock overlay
        if (data.activeSessionId === myToken && document.getElementById('global-soft-lock-modal')) {
            document.getElementById('global-soft-lock-modal').remove();
        }

        // SCENARIO 2: Challenge Popup (New device trying to enter)
        if (data.sessionChallenge && data.sessionChallenge.status === "pending") {
            if (data.activeSessionId === myToken && !globalCountdownInterval) {
                triggerGlobalConflictOverlay(activeUser, data.sessionChallenge.requestingToken);
            }
        } 
        
        // Cleanup challenge modal
        if (!data.sessionChallenge && document.getElementById('global-device-conflict-modal')) {
            clearInterval(globalCountdownInterval);
            globalCountdownInterval = null;
            document.getElementById('global-device-conflict-modal').remove();
        }
    });
}

function triggerSoftLockOverlay(shopPhone) {
    if (document.getElementById('global-soft-lock-modal')) return;

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'global-soft-lock-modal';
    modalOverlay.className = 'device-modal-overlay-global';
    
    modalOverlay.innerHTML = `
        <div class="device-modal-card-global">
            <i class="bi bi-pause-circle-fill" style="font-size: 3.5rem; color: #3b82f6;"></i>
            <h3>Workspace Paused</h3>
            <p>You are currently logged in and working on another device. <br><br><b>Don't worry, your unsaved data here is safe!</b> Click below to reclaim this session and resume working.</p>
            <button class="btn-reclaim-global" onclick="reclaimSession('${shopPhone}')">Reclaim Workspace</button>
        </div>
    `;
    document.body.appendChild(modalOverlay);
}

window.reclaimSession = function(shopPhone) {
    // Generate a fresh token, save it locally, and push it to the server. 
    // This makes THIS device the master again, automatically triggering the Soft Lock on the other device!
    const newToken = generateUniqueTokenId();
    localStorage.setItem("mySessionToken", newToken);
    
    firebase.database().ref('shops/' + shopPhone).update({
        activeSessionId: newToken,
        sessionChallenge: null
    });
}

function triggerGlobalConflictOverlay(shopPhone, requestingToken) {
    if (document.getElementById('global-device-conflict-modal')) return;

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'global-device-conflict-modal';
    modalOverlay.className = 'device-modal-overlay-global';
    
    modalOverlay.innerHTML = `
        <div class="device-modal-card-global">
            <i class="bi bi-shield-lock-fill" style="font-size: 3.5rem; color: #eab308;"></i>
            <h3>New Login Attempt</h3>
            <p>Another device is trying to log in. If you do not deny this request within 15 seconds, your session will be paused.</p>
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

        if (secondsLeft <= 0) {
            clearInterval(globalCountdownInterval);
            globalCountdownInterval = null;
            
            firebase.database().ref('shops/' + shopPhone).update({
                activeSessionId: requestingToken,
                sessionChallenge: null
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
        firebase.database().ref('shops/' + shopPhone).update({
            activeSessionId: requestingToken,
            sessionChallenge: null
        });
    } else {
        firebase.database().ref('shops/' + shopPhone + '/sessionChallenge').remove();
    }
}

function initGatekeeper() { setTimeout(setupGlobalDeviceListener, 500); }
if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", initGatekeeper); } 
else { initGatekeeper(); }
