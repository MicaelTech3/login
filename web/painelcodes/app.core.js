// ========================== web/app.core.js ==========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, setPersistence, browserLocalPersistence,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getFunctions, httpsCallable
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { firebaseConfig } from "../firebase-config.js";

// --- Firebase core ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// suas Functions 1st Gen estão em us-central1
const functions = getFunctions(app, "us-central1");

// manter sessão no navegador
setPersistence(auth, browserLocalPersistence);

// --- Auth helpers públicos ---
export async function loginUser(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  if (!user.emailVerified) {
    await signOut(auth);
    throw new Error("email-nao-verificado");
  }
  return user;
}

export async function registerUser(email, password) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(user);
  return user;
}

export async function logout() {
  await signOut(auth);
}

export function getAuthInstance() { return auth; }
export function getDb() { return db; }

// Assina mudanças de sessão e já retorna o doc do usuário do Firestore
// cb({ user, data })  -> data = users/{uid}
export function onAuth(cb, { redirectIfNull = "index.html" } = {}) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      if (redirectIfNull) window.location.href = redirectIfNull;
      return;
    }
    let data = null;
    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) data = snap.data();
    } catch (e) { console.warn("Falha ao carregar users/{uid}", e); }
    cb({ user, data });
  });
}

// --- Pagamento / upgrade (Callable) ---
export async function callSetPro() {
  const callSetPro = httpsCallable(functions, "setProPlan");
  const res = await callSetPro();
  return res?.data ?? { ok: true };
}
