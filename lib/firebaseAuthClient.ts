import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const AUTH_APP_NAME = "authApp";

const firebaseAuthConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_AUTH_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_AUTH_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_AUTH_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_AUTH_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_AUTH_APP_ID,
};

function getAuthApp(): FirebaseApp {
  const existing = getApps().find((app) => app.name === AUTH_APP_NAME);
  return existing ?? initializeApp(firebaseAuthConfig, AUTH_APP_NAME);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getAuthApp());
}
