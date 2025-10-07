// functions/index.js  (v1 - sem billing)
import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

initializeApp();

// domínios de e-mail descartáveis (exemplo)
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "yopmail.com", "guerrillamail.com",
  "tempmail.com", "10minutemail.com"
]);

/**
 * Cria perfil do usuário no Firestore ao criar conta no Firebase Auth
 * - Define trial de 10 dias
 * - Marca suspicious se não verificou e-mail ou domínio for descartável
 * - (Opcional) grava custom claims
 */
export const createProfileOnSignUp = functions.auth.user().onCreate(async (user) => {
  const db = getFirestore();

  const now = Timestamp.now();
  const trialEnd = Timestamp.fromMillis(now.toMillis() + 10 * 24 * 60 * 60 * 1000);

  const email = (user.email || "").toLowerCase();
  const domain = email.split("@")[1] || "";

  const suspicious = !user.emailVerified || DISPOSABLE_DOMAINS.has(domain);

  await db.doc(`users/${user.uid}`).set({
    email,
    emailVerified: user.emailVerified || false,
    plan: "trial",
    trialStart: now,
    trialEnd,
    suspicious,
    createdAt: now,
    updatedAt: now,
  });

  await getAuth().setCustomUserClaims(user.uid, {
    plan: "trial",
    trialEnd: trialEnd.toMillis(),
    suspicious,
  });
});

/**
 * Upgrade para PRO (Callable)
 * - Chamado pelo botão "ASSINAR" no painel
 */
export const setProPlan = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para assinar.");
  }

  const db = getFirestore();
  const now = Timestamp.now();

  await db.doc(`users/${uid}`).update({
    plan: "pro",
    suspicious: false,
    updatedAt: now,
  });

  await getAuth().setCustomUserClaims(uid, {
    plan: "pro",
    suspicious: false,
  });

  return { ok: true };
});
