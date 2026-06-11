import { getFirebaseDb } from "./firebase-client";

const FREE_SCAN_LIMIT = 5;

function monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export interface ScanUsage {
  scansUsed: number;
  limit: number;
  remaining: number;
  isAtLimit: boolean;
}

export async function getScansThisMonth(uid: string): Promise<ScanUsage> {
  try {
    const db = getFirebaseDb();
    if (!db) return { scansUsed: 0, limit: FREE_SCAN_LIMIT, remaining: FREE_SCAN_LIMIT, isAtLimit: false };
    const firestore = await import("firebase/firestore");
    const snap = await firestore.getDoc(firestore.doc(db, "users", uid));
    if (!snap.exists()) return { scansUsed: 0, limit: FREE_SCAN_LIMIT, remaining: FREE_SCAN_LIMIT, isAtLimit: false };
    const data = snap.data();
    const scansUsed = data.scansMonthKey === monthKey() ? (data.scansThisMonth ?? 0) : 0;
    return {
      scansUsed,
      limit: FREE_SCAN_LIMIT,
      remaining: Math.max(0, FREE_SCAN_LIMIT - scansUsed),
      isAtLimit: scansUsed >= FREE_SCAN_LIMIT,
    };
  } catch {
    return { scansUsed: 0, limit: FREE_SCAN_LIMIT, remaining: FREE_SCAN_LIMIT, isAtLimit: false };
  }
}

export async function incrementScanUsage(uid: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    if (!db) return;
    const key = monthKey();
    const firestore = await import("firebase/firestore");
    const ref = firestore.doc(db, "users", uid);
    const snap = await firestore.getDoc(ref);
    if (!snap.exists() || snap.data().scansMonthKey !== key) {
      await firestore.setDoc(ref, { scansMonthKey: key, scansThisMonth: 1 }, { merge: true });
    } else {
      await firestore.updateDoc(ref, { scansThisMonth: firestore.increment(1) });
    }
  } catch {
    // fail silently — never block a scan
  }
}
