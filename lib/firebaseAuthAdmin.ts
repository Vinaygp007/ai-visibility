import type { Auth } from "firebase-admin/auth";

const AUTH_APP_NAME = "authAdmin";

let _auth: Auth | null = null;

export async function getAuthAdmin(): Promise<Auth | null> {
  if (
    !process.env.FIREBASE_AUTH_PROJECT_ID ||
    !process.env.FIREBASE_AUTH_CLIENT_EMAIL ||
    !process.env.FIREBASE_AUTH_PRIVATE_KEY
  ) {
    return null;
  }

  if (_auth) return _auth;

  try {
    const { initializeApp, getApps, getApp, cert } = await import("firebase-admin/app");
    const { getAuth } = await import("firebase-admin/auth");

    const app = getApps().some((a) => a.name === AUTH_APP_NAME)
      ? getApp(AUTH_APP_NAME)
      : initializeApp(
          {
            credential: cert({
              projectId: process.env.FIREBASE_AUTH_PROJECT_ID,
              clientEmail: process.env.FIREBASE_AUTH_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_AUTH_PRIVATE_KEY.replace(/\\n/g, "\n"),
            }),
          },
          AUTH_APP_NAME
        );

    _auth = getAuth(app);
    return _auth;
  } catch (e) {
    console.warn("[firebase-auth-admin] init failed:", e);
    return null;
  }
}
