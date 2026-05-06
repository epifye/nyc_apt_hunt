import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyD2r8MxNKK1XHCWXhk-cE9X8WSZ6UVv_PY',
  authDomain: 'nyc-apt-hunt-46217.firebaseapp.com',
  projectId: 'nyc-apt-hunt-46217',
  storageBucket: 'nyc-apt-hunt-46217.firebasestorage.app',
  messagingSenderId: '916085923886',
  appId: '1:916085923886:web:ef08c90e7b923ced43ffbf',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
