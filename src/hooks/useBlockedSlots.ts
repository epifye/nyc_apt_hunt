import { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BlockedSlot } from '../types';

function clean<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

const COL = 'blockedSlots';

export function useBlockedSlots() {
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      setBlockedSlots(snap.docs.map(d => d.data() as BlockedSlot));
    });
  }, []);

  const addBlockedSlot = async (data: Omit<BlockedSlot, 'id' | 'createdAt'>) => {
    const slot: BlockedSlot = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    await setDoc(doc(db, COL, slot.id), clean(slot));
  };

  const deleteBlockedSlot = async (id: string) => {
    await deleteDoc(doc(db, COL, id));
  };

  return { blockedSlots, addBlockedSlot, deleteBlockedSlot };
}
