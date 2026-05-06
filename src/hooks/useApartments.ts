import { useState, useEffect } from 'react';
import {
  collection, doc, setDoc, deleteDoc, onSnapshot,
  writeBatch, query, orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Apartment } from '../types';

// Firestore rejects undefined values — strip them before every write
function clean<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

const COL = 'apartments';

export function useApartments() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time listener — updates on any device instantly
  useEffect(() => {
    const q = query(collection(db, COL), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snapshot => {
      setApartments(snapshot.docs.map(d => d.data() as Apartment));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const addApartment = async (data: Omit<Apartment, 'id' | 'createdAt'>): Promise<Apartment> => {
    const apt: Apartment = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, COL, apt.id), clean(apt));
    return apt;
  };

  const updateApartment = async (id: string, updates: Partial<Omit<Apartment, 'id' | 'createdAt'>>) => {
    const existing = apartments.find(a => a.id === id);
    if (!existing) return;
    await setDoc(doc(db, COL, id), clean({ ...existing, ...updates }));
  };

  const deleteApartment = async (id: string) => {
    await deleteDoc(doc(db, COL, id));
  };

  const replaceAll = async (apts: Apartment[]) => {
    const batch = writeBatch(db);
    // Delete existing
    apartments.forEach(a => batch.delete(doc(db, COL, a.id)));
    // Add new
    apts.forEach(a => batch.set(doc(db, COL, a.id), clean(a)));
    await batch.commit();
  };

  return { apartments, loading, addApartment, updateApartment, deleteApartment, replaceAll };
}
