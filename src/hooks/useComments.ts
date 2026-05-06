import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Comment } from '../types';

export function useComments() {
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'comments')), snap => {
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Comment))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      setComments(all);
    }, console.error);
    return unsub;
  }, []);

  const addComment = async (aptId: string, authorName: string, text: string, rating: number) => {
    await addDoc(collection(db, 'comments'), {
      aptId,
      authorName: authorName.trim(),
      text: text.trim(),
      rating,
      createdAt: new Date().toISOString(),
    });
  };

  const deleteComment = async (id: string) => {
    await deleteDoc(doc(db, 'comments', id));
  };

  return { comments, addComment, deleteComment };
}
