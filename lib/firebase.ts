
import type { Firestore } from "firebase-admin/firestore";

let _db: Firestore | null = null;

export async function getDb(): Promise<Firestore | null> {
  // Return null if env vars not configured
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    return null;
  }

  if (_db) return _db;

  try {
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");

    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId:   process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
    }

    _db = getFirestore();
    return _db;
  } catch (e) {
    console.warn("[firebase] init failed:", e);
    return null;
  }
}