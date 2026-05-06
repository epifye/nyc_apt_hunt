import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const SESSION_KEY = 'nyc_hunt_owner';
const TEMP_PASSWORD = 'nyc2024'; // overwrite in Firebase console: config/auth → ownerPassword

export function useAuth() {
  const [isOwner, setIsOwner] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'true');

  useEffect(() => {
    // Seed the config doc with a temp password if it doesn't exist yet
    const ref = doc(db, 'config', 'auth');
    getDoc(ref).then(snap => {
      if (!snap.exists()) setDoc(ref, { ownerPassword: TEMP_PASSWORD });
    }).catch(console.error);
  }, []);

  const checkPassword = async (password: string): Promise<boolean> => {
    try {
      const snap = await getDoc(doc(db, 'config', 'auth'));
      const stored = snap.exists() ? snap.data()?.ownerPassword : TEMP_PASSWORD;
      return password === stored;
    } catch {
      return password === TEMP_PASSWORD;
    }
  };

  const login = () => {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setIsOwner(true);
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsOwner(false);
  };

  return { isOwner, checkPassword, login, logout };
}
