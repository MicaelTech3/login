// ========================== web/app.js ==========================
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
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// suas Functions 1st Gen foram implantadas em us-central1
const functions = getFunctions(app, "us-central1");

setPersistence(auth, browserLocalPersistence);

// -------- Login --------
export async function loginUser(email, password) {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    if (!user.emailVerified) {
      alert("Verifique seu e-mail antes de entrar.");
      await signOut(auth);
      return;
    }
    window.location.href = "painelcodes/painel.html";
  } catch (err) {
    console.error(err);
    alert("Usuário ou senha inválidos.");
  }
}

// -------- Registro (com e-mail de verificação) --------
export async function registerUser(email, password) {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(user);
    alert("Conta criada! Verifique seu e-mail para ativar.");
    window.location.href = "index.html";
  } catch (err) {
    if (err.code === "auth/email-already-in-use") alert("Este e-mail já está cadastrado.");
    else if (err.code === "auth/weak-password") alert("A senha deve ter pelo menos 6 caracteres.");
    else alert("Erro ao cadastrar: " + err.message);
  }
}

// -------- util: iniciar contagem regressiva (dias, horas e minutos) --------
let cdTimer = null;
function startCountdown(msLeft) {
  const ctn = document.getElementById("countdown");
  const dEl = document.getElementById("cd-days");
  const hEl = document.getElementById("cd-hours");
  const mEl = document.getElementById("cd-mins");
  if (!ctn || !dEl) return;

  if (cdTimer) clearInterval(cdTimer);

  function render(leftMs) {
    if (leftMs <= 0) {
      dEl.textContent = hEl.textContent = mEl.textContent = "0";
      return false;
    }
    const totalMin = Math.floor(leftMs / (1000 * 60));
    const days = Math.floor(totalMin / (60 * 24));
    const hours = Math.floor((totalMin % (60 * 24)) / 60);
    const mins = totalMin % 60;

    dEl.textContent = String(days);
    hEl.textContent = String(hours);
    mEl.textContent = String(mins);
    return true;
  }

  ctn.hidden = false;
  render(msLeft);
  const start = Date.now();
  cdTimer = setInterval(() => {
    const elapsed = Date.now() - start;
    const left = msLeft - elapsed;
    if (!render(left)) {
      clearInterval(cdTimer);
      const banner = document.getElementById("trial-banner");
      if (banner) {
        banner.textContent = "Seu teste terminou. Faça upgrade para continuar.";
        banner.classList.add("danger");
      }
    }
  }, 60000); // atualiza a cada 1 minuto
}

// -------- Checagem de sessão + banner de trial --------
export function checkAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return (window.location.href = "index.html");

    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();

        const banner = document.getElementById("trial-banner");
        const suspect = document.getElementById("suspect-flag");
        const emailSpan = document.getElementById("user-email");
        if (emailSpan) emailSpan.textContent = user.email || "";

        // calcula tempo restante a partir do trialEnd salvo no Firestore
        let msLeft = 0;
        if (data.trialEnd && typeof data.trialEnd.toMillis === "function") {
          msLeft = data.trialEnd.toMillis() - Date.now();
        }

        if (banner) {
          if (data.plan === "expired" || msLeft <= 0) {
            banner.textContent = "Seu teste terminou. Faça upgrade para continuar.";
            banner.classList.add("danger");
          } else {
            const days = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
            banner.textContent = `🔔 Seu teste termina em ${days} dia(s).`;
            startCountdown(msLeft);
          }
        }

        if (suspect && data.suspicious) {
          suspect.textContent = "⚠ Conta sinalizada (e-mail não verificado ou domínio suspeito).";
        }
      }
    } catch (e) {
      console.warn("Não foi possível obter dados do trial:", e);
    }
  });
}

// -------- Upgrade para PRO --------
export function initUpgrade(selectorOrBtn) {
  const btn = typeof selectorOrBtn === "string" ? document.querySelector(selectorOrBtn) : selectorOrBtn;
  const hint = document.getElementById("upgrade-hint");
  if (!btn) return;

  if (hint) {
    hint.textContent = "Requer Functions implantada (setProPlan).";
  }

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Processando...";
    try {
      const callSetPro = httpsCallable(functions, "setProPlan");
      const res = await callSetPro();
      console.log("setProPlan result:", res?.data);
      alert("Parabéns! Seu plano foi atualizado para PRO.");
      location.reload();
    } catch (err) {
      console.error("setProPlan error:", err);
      const msg = (err && (err.message || err.code)) ? `${err.code || ""} ${err.message}` : "Erro desconhecido";
      alert("Falha ao assinar: " + msg);
    } finally {
      btn.disabled = false;
      btn.textContent = "ASSINAR";
    }
  });
}

// -------- Logout --------
export async function logoutUser() {
  await signOut(auth);
  window.location.href = "index.html";
}
