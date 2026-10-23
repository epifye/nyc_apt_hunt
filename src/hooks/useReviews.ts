import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Review } from '../types';

export function useReviews(apartmentId: string, enabled = true) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    setLoading(true);
    const q = query(
      collection(db, 'reviews'),
      where('apartmentId', '==', apartmentId),
      orderBy('createdAt', 'asc'),
    );
    return onSnapshot(q, snap => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() } as Review)));
      setLoading(false);
    });
  }, [apartmentId, enabled]);

  const addReview = async (reviewerName: string, emojis: string) => {
    await addDoc(collection(db, 'reviews'), {
      apartmentId,
      reviewerName,
      emojis,
      createdAt: new Date().toISOString(),
    });
  };

  const deleteReview = async (id: string) => {
    await deleteDoc(doc(db, 'reviews', id));
  };

  return { reviews, loading, addReview, deleteReview };
}
