import { type FirebaseApp } from "firebase/app";
import { type Auth } from "firebase/auth";
import { type Firestore } from "firebase/firestore";

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

function getApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (_app) return _app;

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;

  try {
    const { initializeApp, getApps } = require("firebase/app");
    _app = getApps().length
      ? getApps()[0]
      : initializeApp({
          apiKey,
          authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        });
    return _app;
  } catch {
    return null;
  }
}

export function getFirebaseAuth(): Auth | null {
  if (_auth) return _auth;
  const app = getApp();
  if (!app) return null;
  try {
    const { getAuth } = require("firebase/auth");
    _auth = getAuth(app);
    return _auth;
  } catch {
    return null;
  }
}

export function getFirebaseDb(): Firestore | null {
  if (_db) return _db;
  const app = getApp();
  if (!app) return null;
  try {
    const { getFirestore } = require("firebase/firestore");
    _db = getFirestore(app);
    return _db;
  } catch {
    return null;
  }
}
