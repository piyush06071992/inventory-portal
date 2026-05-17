import { auth, db } from './firebase-init.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, setDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const mainBtn = document.getElementById('main-btn');
const toggleMode = document.getElementById('toggle-mode');
const msg = document.getElementById('msg');
const forgotPin = document.getElementById('forgot-pin');

let isLogin = true;

// Helper Math Function: Checks if a string is strictly numbers
const isStrictlyNumeric = (value) => /^\d+$/.test(value);

toggleMode.addEventListener('click', () => {
    isLogin = !isLogin;
    
    document.getElementById('register-fields').style.display = isLogin ? 'none' : 'block';
    document.getElementById('login-fields').style.display = isLogin ? 'block' : 'none';
    
    document.getElementById('form-title').innerText = isLogin ? 'SHOP LOGIN' : 'CREATE ACCOUNT';
    mainBtn.innerText = isLogin ? 'LOGIN TO PORTAL' : 'REGISTER SHOP NOW';
    toggleMode.innerText = isLogin ? 'NEW SHOP? CREATE ACCOUNT' : 'ALREADY HAVE A SHOP? LOGIN';
    msg.innerText = ""; 
});

mainBtn.addEventListener('click', async () => {
    const pin = document.getElementById('pin').value.trim();
    
    // Strict PIN Validation
    if (pin.length !== 6 || !isStrictlyNumeric(pin)) {
        msg.innerText = "ERROR: PIN MUST BE EXACTLY 6 NUMBERS!";
        msg.style.color = "red";
        return;
    }

    msg.innerText = "PLEASE WAIT...";
    msg.style.color = "blue";

    try {
        if (isLogin) {
            const id = document.getElementById('login-id').value.trim();
            if(!id) throw new Error("PLEASE ENTER EMAIL OR MOBILE");

            let email = id;
            if (!id.includes('@') && id.length === 10 && isStrictlyNumeric(id)) {
                msg.innerText = "VERIFYING MOBILE NUMBER...";
                const q = query(collection(db, "shop_profiles"), where("mobile", "==", id));
                const querySnapshot = await getDocs(q);
                if (querySnapshot.empty) throw new Error("MOBILE NUMBER NOT REGISTERED");
                email = querySnapshot.docs[0].data().ownerEmail;
            }

            // Using PIN as the Firebase Password
            await signInWithEmailAndPassword(auth, email, pin);
            window.location.href = 'dashboard.html';
            
        } else {
            const shopName = document.getElementById('shop-name').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const mobile = document.getElementById('reg-mobile').value.trim();

            if (!shopName || !email) throw new Error("PLEASE FILL ALL FIELDS");
            if (!email.includes('@')) throw new Error("PLEASE ENTER A VALID EMAIL");
            if (mobile.length !== 10 || !isStrictlyNumeric(mobile)) throw new Error("MOBILE MUST BE EXACTLY 10 NUMBERS");
            
            // Using PIN as the Firebase Password
            const userCredential = await createUserWithEmailAndPassword(auth, email, pin);
            
            await setDoc(doc(db, "shop_profiles", userCredential.user.uid), {
                shopName: shopName, 
                mobile: mobile, 
                ownerEmail: email,
                createdAt: new Date()
            });

            msg.innerText = "SHOP REGISTERED SUCCESSFULLY!";
            msg.style.color = "green";
            setTimeout(() => window.location.href = 'dashboard.html', 1500);
        }
    } catch (e) {
        console.error(e);
        msg.innerText = "ERROR: " + e.message.toUpperCase();
        msg.style.color = "red";
    }
});

if (forgotPin) {
    forgotPin.addEventListener('click', () => {
        msg.innerText = "TO RESET PIN, PLEASE CONTACT ADMIN.";
        msg.style.color = "orange";
    });
}
