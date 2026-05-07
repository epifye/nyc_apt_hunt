import { getDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

const SESSION_KEY = 'apt_owner_auth';

export function isOwnerSession(): boolean {
  return localStorage.getItem(SESSION_KEY) === 'true';
}

export function setOwnerSession(v: boolean) {
  if (v) localStorage.setItem(SESSION_KEY, 'true');
  else localStorage.removeItem(SESSION_KEY);
}

export async function checkOwnerPassword(input: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'config', 'auth'));
    if (!snap.exists()) return false;
    return snap.data().ownerPassword === input;
  } catch {
    return false;
  }
}
